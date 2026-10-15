import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { startOfDayManaus } from './attempts';
import { userHasAccess } from './billing';
import { ensureOverrides } from './question-overrides';
import { loadQuestions, sourceLine, toPublic, type PublicQuestion, type Question } from './questions';
import { assuntoDe, ASSUNTO_AREA, AREA_POR_CHAVE } from './assuntos';
import { mundoDeQuestao, type Mundo } from './mundos';

/** Treino por tema: respostas corrigidas na hora, sem relógio. Cada sessão é um "attempt" com tipo `treino:<tema>`. */
export const TREINO_TEMAS: Record<string, string> = {
  legislacao: 'Legislação', sinalizacao: 'Sinalização', direcao_defensiva: 'Direção defensiva',
  linguagens: 'Linguagens', humanas: 'Ciências Humanas', natureza: 'Ciências da Natureza', matematica: 'Matemática', mecanica: 'Mecânica', primeiros_socorros: 'Primeiros socorros', meio_ambiente_cidadania: 'Meio ambiente e cidadania',
};
export const TREINO_TAMANHO = 10;
export const TREINO_TAMANHOS = [5, 10, 20];
const clampTamanho = (n: number | undefined) => (n && Number.isFinite(n) ? Math.max(3, Math.min(30, Math.floor(n))) : TREINO_TAMANHO);

/** Questões no ar de um mundo. O banco nacional do Detran vale para todos os estados. */
export function poolDoMundo(mundo: Mundo): Question[] {
  return mundo === 'enem' ? loadQuestions('ENEM') : loadQuestions(ESTADO);
}

/** Filtra as questões de um mundo por matéria: Detran por tema; ENEM por área ou por assunto. 'aleatorio' = tudo. */
export function filtrarPorTema(pool: Question[], mundo: Mundo, tema: string): Question[] {
  if (tema === 'aleatorio') return pool;
  if (mundo === 'enem') {
    if (tema in AREA_POR_CHAVE) return pool.filter((q) => q.topic === tema);
    if (tema in ASSUNTO_AREA) return pool.filter((q) => assuntoDe(q.id) === tema);
    return [];
  }
  return pool.filter((q) => q.topic === tema);
}
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
  await ensureOverrides();
  const live = new Set([...loadQuestions(ESTADO), ...loadQuestions('ENEM')].map((q) => q.id));
  return [...ultima].filter(([id, ok]) => !ok && live.has(id)).map(([id]) => id);
}

/**
 * Revisão espaçada do caderno de erros. Uma questão entra quando é errada e volta em intervalos
 * crescentes: logo depois do erro, 3 dias após o 1º acerto, 7 dias após o 2º. Com 3 acertos seguidos
 * ela sai do caderno (dominada). Errar de novo reinicia o ciclo.
 */
export const REVISAO_INTERVALOS_DIAS = [0, 3, 7];
const DIA_MS = 86_400_000;

export function calcularRevisao(rows: { id: string; ok: boolean; quando: Date }[], now: Date) {
  const por = new Map<string, { ok: boolean; quando: Date }[]>();
  for (const r of rows) por.set(r.id, [...(por.get(r.id) ?? []), r]);
  const devidas: string[] = [];
  const agendadas: { id: string; em: Date }[] = [];
  const dominadas: string[] = [];
  for (const [id, hist] of por) {
    hist.sort((a, b) => a.quando.getTime() - b.quando.getTime());
    let ultimoErro = -1;
    hist.forEach((h, i) => { if (!h.ok) ultimoErro = i; });
    if (ultimoErro < 0) continue; // nunca errou
    const acertosDepois = hist.length - 1 - ultimoErro;
    if (acertosDepois >= REVISAO_INTERVALOS_DIAS.length) { dominadas.push(id); continue; }
    const em = new Date(hist[hist.length - 1]!.quando.getTime() + REVISAO_INTERVALOS_DIAS[acertosDepois]! * DIA_MS);
    if (em.getTime() <= now.getTime()) devidas.push(id); else agendadas.push({ id, em });
  }
  return { devidas, agendadas, dominadas };
}

export async function revisaoDoDia(userId: string, mundo?: Mundo, now = new Date()) {
  const db = await getDb();
  const rows = await db
    .select({ id: schema.attemptAnswers.questionId, ok: schema.attemptAnswers.isCorrect, quando: schema.attempts.startedAt })
    .from(schema.attemptAnswers)
    .innerJoin(schema.attempts, eq(schema.attempts.id, schema.attemptAnswers.attemptId))
    .where(eq(schema.attempts.userId, userId));
  await ensureOverrides();
  const live = new Set([...loadQuestions(ESTADO), ...loadQuestions('ENEM')].map((q) => q.id));
  const r = calcularRevisao(mundo ? rows.filter((x) => mundoDeQuestao(x.id) === mundo) : rows, now);
  const agendadas = r.agendadas.filter((a) => live.has(a.id));
  const proxima = agendadas.reduce<Date | null>((m, a) => (!m || a.em < m ? a.em : m), null);
  return { devidas: r.devidas.filter((id) => live.has(id)), agendadas: agendadas.length, proxima };
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

export async function startTreino(userId: string, tema: string, opts: { mundo?: Mundo; tamanho?: number } = {}): Promise<StartTreino> {
  const mundo: Mundo = opts.mundo ?? 'detran';
  const tamanho = clampTamanho(opts.tamanho);
  const erros = tema === 'erros';
  const aleatorio = tema === 'aleatorio';
  const temaOk = erros || aleatorio || (mundo === 'enem' ? tema in AREA_POR_CHAVE || tema in ASSUNTO_AREA : !!TREINO_TEMAS[tema]);
  if (!temaOk) return { ok: false, code: 'tema', reason: 'Tema desconhecido.' };
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

  await ensureOverrides();
  const pool = poolDoMundo(mundo);
  let picked;
  if (erros) {
    const ids = new Set((await revisaoDoDia(userId, mundo)).devidas);
    picked = embaralha(pool.filter((q) => ids.has(q.id))).slice(0, tamanho);
  } else {
    const vistas = await jaRespondidas(userId);
    const doTema = filtrarPorTema(pool, mundo, tema);
    // Prioriza o que o aluno ainda não viu, depois completa com o resto.
    picked = [...embaralha(doTema.filter((q) => !vistas.has(q.id))), ...embaralha(doTema.filter((q) => vistas.has(q.id)))].slice(0, tamanho);
  }
  if (picked.length === 0) {
    return { ok: false, code: 'vazio', reason: erros ? 'Sua revisão está em dia: nenhuma questão para revisar agora. As erradas voltam aqui nos próximos dias.' : 'Este tema ainda não tem questões liberadas.' };
  }
  const [a] = await db
    .insert(schema.attempts)
    .values({ userId, simulationType: mundo === 'enem' ? `treino:enem:${tema}` : `treino:${tema}`, totalCount: picked.length, questionIds: picked.map((q) => q.id), draftAnswers: {} })
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
  // treino:custom:<banco> (simulado personalizado) sorteia do banco escolhido; os demais usam o banco do Detran.
  const banco = at.simulationType.startsWith('treino:custom:') ? at.simulationType.slice('treino:custom:'.length) : at.simulationType.startsWith('treino:enem:') ? 'ENEM' : ESTADO;
  await ensureOverrides();
  const q = loadQuestions(banco).find((x) => x.id === questionId);
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

/** Quantas questões do caderno de erros estão para revisar hoje. */
export async function resumoErros(userId: string, mundo?: Mundo): Promise<number> {
  return (await revisaoDoDia(userId, mundo)).devidas.length;
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
