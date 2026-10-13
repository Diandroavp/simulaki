import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { startOfDayManaus } from './attempts';
import { userHasAccess } from './billing';
import { loadQuestions, sourceLine, toPublic, type PublicQuestion } from './questions';

/** Treino por tema: respostas corrigidas na hora, sem relógio. Cada sessão é um "attempt" com tipo `treino:<tema>`. */
export const TREINO_TEMAS: Record<string, string> = {
  legislacao: 'Legislação', sinalizacao: 'Sinalização', direcao_defensiva: 'Direção defensiva',
  mecanica: 'Mecânica', primeiros_socorros: 'Primeiros socorros', meio_ambiente_cidadania: 'Meio ambiente e cidadania',
};
export const TREINO_TAMANHO = 10;
export const FREE_TREINOS_POR_DIA = 2;
const ESTADO = 'AM'; // o banco nacional vale para todos; o estado só soma questões próprias

export type StartTreino =
  | { ok: true; attemptId: string; tema: string; questions: PublicQuestion[] }
  | { ok: false; code: 'tema' | 'vazio' | 'limit'; reason: string };

/** Questões cuja resposta mais recente do aluno foi errada (e que ainda estão no ar). */
export async function questoesErradas(userId: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db
    .select({ id: schema.attemptAnswers.questionId, ok: schema.attemptAnswers.isCorrect, quando: schema.attempts.startedAt })
    .from(schema.attemptAnswers)
    .innerJoin(schema.attempts, eq(schema.attempts.id, schema.attemptAnswers.attemptId))
    .where(eq(schema.attempts.userId, userId))
    .orderBy(schema.attempts.startedAt);
  const ultima = new Map<string, boolean>(); // a resposta mais recente de cada questão vence
  for (const r of rows) ultima.set(r.id, r.ok);
  const live = new Set(loadQuestions(ESTADO).map((q) => q.id));
  return [...ultima].filter(([id, ok]) => !ok && live.has(id)).map(([id]) => id);
}

async function jaRespondidas(userId: string): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db
    .select({ id: schema.attemptAnswers.questionId })
    .from(schema.attemptAnswers)
    .innerJoin(schema.attempts, eq(schema.attempts.id, schema.attemptAnswers.attemptId))
    .where(eq(schema.attempts.userId, userId));
  return new Set(rows.map((r) => r.id));
}

function embaralha<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; }
  return a;
}

export async function startTreino(userId: string, tema: string): Promise<StartTreino> {
  const erros = tema === 'erros';
  if (!erros && !TREINO_TEMAS[tema]) return { ok: false, code: 'tema', reason: 'Tema desconhecido.' };
  const db = await getDb();

  const { full } = await userHasAccess(userId);
  if (!full) {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.attempts)
      .where(and(eq(schema.attempts.userId, userId), gte(schema.attempts.startedAt, startOfDayManaus()), sql`${schema.attempts.simulationType} like 'treino:%'`));
    if ((row?.n ?? 0) >= FREE_TREINOS_POR_DIA) {
      return { ok: false, code: 'limit', reason: `Você fez os ${FREE_TREINOS_POR_DIA} treinos grátis de hoje. Assine para treinar sem limite.` };
    }
  }

  const pool = loadQuestions(ESTADO);
  let picked;
  if (erros) {
    const ids = new Set(await questoesErradas(userId));
    picked = embaralha(pool.filter((q) => ids.has(q.id))).slice(0, TREINO_TAMANHO);
  } else {
    const vistas = await jaRespondidas(userId);
    const doTema = pool.filter((q) => q.topic === tema);
    // Prioriza o que o aluno ainda não viu, depois completa com o resto.
    picked = [...embaralha(doTema.filter((q) => !vistas.has(q.id))), ...embaralha(doTema.filter((q) => vistas.has(q.id)))].slice(0, TREINO_TAMANHO);
  }
  if (picked.length === 0) {
    return { ok: false, code: 'vazio', reason: erros ? 'Você não tem questões erradas para refazer. Continue treinando.' : 'Este tema ainda não tem questões liberadas.' };
  }
  const [a] = await db
    .insert(schema.attempts)
    .values({ userId, simulationType: `treino:${tema}`, totalCount: picked.length, questionIds: picked.map((q) => q.id), draftAnswers: {} })
    .returning({ id: schema.attempts.id });
  return { ok: true, attemptId: a!.id, tema, questions: picked.map(toPublic) };
}

export type AnswerTreino =
  | { ok: true; correct: boolean; correctOptionId: string; explanation: string | null; legalRef: string | null; sourceLine: string; done: boolean; score?: { correct: number; total: number } }
  | { ok: false; reason: string };

/** Registra a resposta e devolve a correção. A resposta de uma questão não muda depois de enviada. */
export async function answerTreino(userId: string, attemptId: string, questionId: string, optionId: string): Promise<AnswerTreino> {
  const db = await getDb();
  const [at] = await db
    .select()
    .from(schema.attempts)
    .where(and(eq(schema.attempts.id, attemptId), eq(schema.attempts.userId, userId)))
    .limit(1);
  if (!at || !at.simulationType.startsWith('treino:')) return { ok: false, reason: 'Treino não encontrado.' };
  if (!at.questionIds?.includes(questionId)) return { ok: false, reason: 'Questão fora deste treino.' };
  const q = loadQuestions(ESTADO).find((x) => x.id === questionId);
  if (!q || !q.options.some((o) => o.id === optionId)) return { ok: false, reason: 'Resposta inválida.' };

  const correct = optionId === q.correctOptionId;
  let guardada: { selected: string | null; correct: boolean } | null = null;
  const done = await db.transaction(async (tx) => {
    const ins = await tx
      .insert(schema.attemptAnswers)
      .values({ attemptId, questionId, topic: q.topic, selectedOptionId: optionId, isCorrect: correct })
      .onConflictDoNothing()
      .returning({ id: schema.attemptAnswers.id });
    if (ins.length === 0) {
      const [prev] = await tx.select().from(schema.attemptAnswers).where(and(eq(schema.attemptAnswers.attemptId, attemptId), eq(schema.attemptAnswers.questionId, questionId))).limit(1);
      guardada = prev ? { selected: prev.selectedOptionId, correct: prev.isCorrect } : null;
    }
    const [c] = await tx
      .select({ n: sql<number>`count(*)::int`, ok: sql<number>`count(*) filter (where ${schema.attemptAnswers.isCorrect})::int` })
      .from(schema.attemptAnswers)
      .where(eq(schema.attemptAnswers.attemptId, attemptId));
    const fim = (c?.n ?? 0) >= at.totalCount;
    if (fim && !at.finishedAt) await tx.update(schema.attempts).set({ finishedAt: new Date(), correctCount: c!.ok }).where(eq(schema.attempts.id, attemptId));
    return { fim, ok: c?.ok ?? 0 };
  });
  const g = guardada as { selected: string | null; correct: boolean } | null;
  return {
    ok: true,
    correct: g ? g.correct : correct,
    correctOptionId: q.correctOptionId,
    explanation: q.explanation ?? null,
    legalRef: q.legalRef && !q.legalRef.includes('conferir') && !q.legalRef.startsWith('Banco Nacional') ? q.legalRef : null,
    sourceLine: sourceLine(q),
    done: done.fim,
    ...(done.fim ? { score: { correct: done.ok, total: at.totalCount } } : {}),
  };
}

export async function resumoErros(userId: string): Promise<number> {
  return (await questoesErradas(userId)).length;
}

export async function ultimosTreinos(userId: string, n = 5) {
  const db = await getDb();
  return db
    .select()
    .from(schema.attempts)
    .where(and(eq(schema.attempts.userId, userId), sql`${schema.attempts.simulationType} like 'treino:%'`, sql`${schema.attempts.finishedAt} is not null`))
    .orderBy(desc(schema.attempts.finishedAt))
    .limit(n);
}
