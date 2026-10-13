import { and, desc, eq, sql } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { finishAttempt, type StartAttempt } from './attempts';
import { userHasAccess } from './billing';
import { getExamConfig } from './exam';
import { loadQuestions, toPublic, type PublicQuestion, type Question } from './questions';
import { SIMULATIONS } from './simulations';
import { ensureOverrides } from './question-overrides';
import { questoesErradas, TREINO_TEMAS } from './treino';

/**
 * Simulado personalizado: o aluno escolhe o banco (Detran/ENEM), os temas e quantas questões de cada,
 * e se quer fazer como prova (com relógio, resultado no fim) ou como treino (correção na hora).
 * Recurso do plano pago.
 */

export const PERSONALIZADO_MAX = 90;
export const PERSONALIZADO_MIN_MINUTOS = 5;
export const PERSONALIZADO_MAX_MINUTOS = 360;

export type CustomSpec = {
  bank: string; // stateCode do banco: AM, SP, BA, ENEM...
  modo: 'treino' | 'prova';
  itens: Record<string, number>; // tema -> quantidade
  minutos?: number;
  novas?: boolean; // prioriza questões que o aluno ainda não respondeu
  erradas?: boolean; // só as que o aluno errou e ainda não acertou
  anos?: number[]; // filtra por ano da prova (ENEM)
  resume?: boolean; // retoma a prova personalizada em andamento
};

export type CatalogoBanco = {
  slug: string; nome: string; bank: string; total: number;
  temas: { id: string; nome: string; total: number }[];
  anos: number[];
  minutosPorQuestao: number;
  distribuicao: Record<string, number> | null;
  metaPct: number;
};

/** Bancos com questões no ar, com a contagem por tema, para montar o formulário. */
export function catalogo(): CatalogoBanco[] {
  const out: CatalogoBanco[] = [];
  const vistos = new Set<string>();
  for (const s of SIMULATIONS) {
    if (!s.stateCode || vistos.has(s.stateCode)) continue;
    const pool = loadQuestions(s.stateCode);
    if (pool.length === 0) continue;
    vistos.add(s.stateCode);
    const cfg = getExamConfig(s.stateCode);
    const cont = new Map<string, number>();
    for (const q of pool) cont.set(q.topic, (cont.get(q.topic) ?? 0) + 1);
    const anos = [...new Set(pool.map((q) => q.year).filter((y): y is number => !!y))].sort((a, b) => b - a);
    out.push({
      slug: s.slug, nome: s.name, bank: s.stateCode, total: pool.length,
      temas: [...cont].map(([id, total]) => ({ id, nome: TREINO_TEMAS[id] ?? id, total })).sort((a, b) => b.total - a.total),
      anos,
      minutosPorQuestao: Math.max(1, Math.round((cfg.durationMinutes / cfg.questionCount) * 10) / 10),
      distribuicao: cfg.topicDistribution ?? null,
      metaPct: Math.round((cfg.minCorrect / cfg.questionCount) * 100),
    });
  }
  return out;
}

function embaralha<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; }
  return a;
}

export type Validada = { ok: true; spec: CustomSpec; pool: Question[] } | { ok: false; code: 'invalido' | 'plano'; reason: string };

export async function validar(userId: string, raw: unknown): Promise<Validada> {
  await ensureOverrides();
  const r = (raw ?? {}) as Partial<CustomSpec>;
  const bank = String(r.bank ?? '').toUpperCase();
  const banco = catalogo().find((b) => b.bank === bank);
  if (!banco) return { ok: false, code: 'invalido', reason: 'Banco de questões indisponível.' };
  const { full } = await userHasAccess(userId);
  if (!full) return { ok: false, code: 'plano', reason: 'O simulado personalizado faz parte do plano pago.' };

  const itens: Record<string, number> = {};
  let total = 0;
  for (const [tema, v] of Object.entries(r.itens ?? {})) {
    const n = Math.floor(Number(v));
    const t = banco.temas.find((x) => x.id === tema);
    if (!t || !Number.isFinite(n) || n <= 0) continue;
    itens[tema] = Math.min(n, t.total);
    total += itens[tema]!;
  }
  if (total === 0) return { ok: false, code: 'invalido', reason: 'Escolha ao menos uma questão.' };
  if (total > PERSONALIZADO_MAX) return { ok: false, code: 'invalido', reason: `No máximo ${PERSONALIZADO_MAX} questões por simulado.` };
  const anos = Array.isArray(r.anos) ? r.anos.map(Number).filter((y) => banco.anos.includes(y)) : undefined;
  const minutos = r.minutos === undefined ? Math.ceil(total * banco.minutosPorQuestao)
    : Math.min(PERSONALIZADO_MAX_MINUTOS, Math.max(PERSONALIZADO_MIN_MINUTOS, Math.floor(Number(r.minutos)) || PERSONALIZADO_MIN_MINUTOS));
  return {
    ok: true,
    spec: { bank, modo: r.modo === 'treino' ? 'treino' : 'prova', itens, minutos, novas: !!r.novas, erradas: !!r.erradas, ...(anos?.length ? { anos } : {}) },
    pool: loadQuestions(bank),
  };
}

/** Sorteia as questões da especificação. `faltou` é quantas o filtro não conseguiu entregar. */
export async function selecionar(userId: string, spec: CustomSpec, pool: Question[]): Promise<{ picked: Question[]; faltou: number }> {
  let base = pool;
  if (spec.anos?.length) base = base.filter((q) => q.year !== undefined && spec.anos!.includes(q.year));
  if (spec.erradas) { const e = new Set(await questoesErradas(userId)); base = base.filter((q) => e.has(q.id)); }
  let vistas = new Set<string>();
  if (spec.novas && !spec.erradas) {
    const db = await getDb();
    const rows = await db
      .select({ id: schema.attemptAnswers.questionId })
      .from(schema.attemptAnswers)
      .innerJoin(schema.attempts, eq(schema.attempts.id, schema.attemptAnswers.attemptId))
      .where(eq(schema.attempts.userId, userId));
    vistas = new Set(rows.map((r) => r.id));
  }
  const picked: Question[] = [];
  let pedidas = 0;
  for (const [tema, qtd] of Object.entries(spec.itens)) {
    pedidas += qtd;
    const doTema = base.filter((q) => q.topic === tema);
    const ordem = spec.novas && !spec.erradas
      ? [...embaralha(doTema.filter((q) => !vistas.has(q.id))), ...embaralha(doTema.filter((q) => vistas.has(q.id)))]
      : embaralha(doTema);
    picked.push(...ordem.slice(0, qtd));
  }
  return { picked: embaralha(picked), faltou: pedidas - picked.length };
}

export type StartCustomTreino =
  | { ok: true; attemptId: string; tema: string; questions: PublicQuestion[]; faltou: number }
  | { ok: false; code: 'invalido' | 'plano' | 'vazio'; reason: string };

export async function startCustomTreino(userId: string, raw: unknown): Promise<StartCustomTreino> {
  const v = await validar(userId, raw);
  if (!v.ok) return v;
  const { picked, faltou } = await selecionar(userId, v.spec, v.pool);
  if (picked.length === 0) {
    return { ok: false, code: 'vazio', reason: v.spec.erradas ? 'Nenhuma questão errada nesses temas. Tire o filtro "só as que errei".' : 'Nenhuma questão encontrada com esses filtros.' };
  }
  const db = await getDb();
  const [a] = await db
    .insert(schema.attempts)
    .values({ userId, simulationType: `treino:custom:${v.spec.bank}`, totalCount: picked.length, questionIds: picked.map((q) => q.id), draftAnswers: {} })
    .returning({ id: schema.attempts.id });
  return { ok: true, attemptId: a!.id, tema: 'personalizado', questions: picked.map(toPublic), faltou };
}

export async function startCustomProva(userId: string, raw: unknown): Promise<StartAttempt> {
  await ensureOverrides();
  const db = await getDb();
  const resume = !!(raw as { resume?: boolean } | null)?.resume;

  // Prova personalizada em andamento: retoma (mesmas questões, tempo restante, respostas salvas).
  const [open] = await db
    .select()
    .from(schema.attempts)
    .where(and(eq(schema.attempts.userId, userId), sql`${schema.attempts.simulationType} like 'custom:%'`, sql`${schema.attempts.finishedAt} is null`))
    .orderBy(desc(schema.attempts.startedAt))
    .limit(1);
  if (open?.questionIds?.length) {
    const bank = open.simulationType.slice('custom:'.length);
    const byId = new Map(loadQuestions(bank).map((q) => [q.id, q]));
    const durationMs = (open.durationMinutes ?? 60) * 60_000;
    const remainingMs = open.startedAt.getTime() + durationMs - Date.now();
    const qs = open.questionIds.map((id) => byId.get(id));
    if (remainingMs > 0 && qs.every(Boolean)) {
      return {
        ok: true, attemptId: open.id, durationMinutes: open.durationMinutes ?? 60, configVerified: true, shortExam: false,
        questions: qs.map((q) => toPublic(q!)), remainingSeconds: Math.floor(remainingMs / 1000), draftAnswers: open.draftAnswers ?? {}, resumed: true,
      };
    }
    const draft = open.draftAnswers ?? {};
    await finishAttempt(userId, open.id, Object.entries(draft).map(([questionId, selectedOptionId]) => ({ questionId, selectedOptionId }))).catch(() => {});
  }
  if (resume) return { ok: false, code: 'unavailable', reason: 'Não há simulado personalizado em andamento.' };

  const v = await validar(userId, raw);
  if (!v.ok) return { ok: false, code: v.code === 'plano' ? 'limit' : 'unavailable', reason: v.reason };
  const { picked } = await selecionar(userId, v.spec, v.pool);
  if (picked.length === 0) return { ok: false, code: 'unavailable', reason: v.spec.erradas ? 'Nenhuma questão errada nesses temas.' : 'Nenhuma questão encontrada com esses filtros.' };

  const cfg = getExamConfig(v.spec.bank);
  const minutos = v.spec.minutos!;
  const minCorrect = Math.ceil((cfg.minCorrect / cfg.questionCount) * picked.length);
  const [a] = await db
    .insert(schema.attempts)
    .values({ userId, simulationType: `custom:${v.spec.bank}`, totalCount: picked.length, minCorrect, durationMinutes: minutos, questionIds: picked.map((q) => q.id), draftAnswers: {} })
    .returning({ id: schema.attempts.id });
  return {
    ok: true, attemptId: a!.id, durationMinutes: minutos, configVerified: true, shortExam: false,
    questions: picked.map(toPublic), remainingSeconds: minutos * 60, draftAnswers: {}, resumed: false,
  };
}
