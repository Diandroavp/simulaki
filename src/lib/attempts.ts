import { and, desc, eq, gte, isNotNull, sql } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { userHasAccess } from './billing';
import { buildExam, getExamConfig, scoreAttempt } from './exam';
import { examTopic, loadQuestions, toPublic, type PublicQuestion } from './questions';
import { getSimulation } from './simulations';

export const FREE_PER_DAY = 1;

/** Início do dia em Manaus (UTC-4), em UTC. */
export function startOfDayManaus(now = new Date()): Date {
  const local = new Date(now.getTime() - 4 * 3_600_000);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() + 4 * 3_600_000);
}

export type StartAttempt =
  | {
      ok: true; attemptId: string; durationMinutes: number; configVerified: boolean; shortExam: boolean;
      questions: PublicQuestion[]; remainingSeconds: number; draftAnswers: Record<string, string>; resumed: boolean;
    }
  | { ok: false; code: 'unknown' | 'unavailable' | 'limit'; reason: string };

export async function startAttempt(userId: string, slug: string): Promise<StartAttempt> {
  const sim = getSimulation(slug);
  if (!sim?.stateCode) return { ok: false, code: 'unavailable', reason: 'Este simulado ainda não está disponível.' };
  const pool = loadQuestions(sim.stateCode);
  if (pool.length === 0) return { ok: false, code: 'unavailable', reason: 'Este simulado ainda não tem questões liberadas.' };

  const db = await getDb();
  const config0 = getExamConfig(sim.stateCode);

  // Prova em andamento? Retoma (mesmas questões, tempo restante, respostas salvas) em vez de abrir outra.
  const [open] = await db
    .select()
    .from(schema.attempts)
    .where(and(eq(schema.attempts.userId, userId), eq(schema.attempts.simulationType, slug), sql`${schema.attempts.finishedAt} is null`))
    .orderBy(desc(schema.attempts.startedAt))
    .limit(1);
  if (open?.questionIds?.length) {
    const durationMs = (open.durationMinutes ?? config0.durationMinutes) * 60_000;
    const remainingMs = open.startedAt.getTime() + durationMs - Date.now();
    const byId = new Map(pool.map((q) => [q.id, q]));
    const qs = open.questionIds.map((id) => byId.get(id));
    if (remainingMs > 0 && qs.every(Boolean)) {
      return {
        ok: true, attemptId: open.id, durationMinutes: open.durationMinutes ?? config0.durationMinutes,
        configVerified: config0.verified, shortExam: open.totalCount < config0.questionCount,
        questions: qs.map((q) => toPublic(q!)), remainingSeconds: Math.floor(remainingMs / 1000),
        draftAnswers: open.draftAnswers ?? {}, resumed: true,
      };
    }
    // Tempo esgotado (ou conteúdo mudou): corrige com o que estava salvo e segue para uma nova prova.
    const draft = open.draftAnswers ?? {};
    await finishAttempt(userId, open.id, Object.entries(draft).map(([questionId, selectedOptionId]) => ({ questionId, selectedOptionId }))).catch(() => {});
  }

  const { full } = await userHasAccess(userId);
  if (!full) {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.attempts)
      .where(and(eq(schema.attempts.userId, userId), gte(schema.attempts.startedAt, startOfDayManaus())));
    if ((row?.n ?? 0) >= FREE_PER_DAY) {
      return { ok: false, code: 'limit', reason: 'Você usou o simulado grátis de hoje. Assine para fazer quantos quiser.' };
    }
  }

  const config = getExamConfig(sim.stateCode);
  const picked = buildExam(pool.map((q) => ({ q, topic: examTopic(q.topic) })), config).map((x) => x.q);
  const minCorrect = Math.ceil((config.minCorrect / config.questionCount) * picked.length);
  const [attempt] = await db
    .insert(schema.attempts)
    .values({
      userId, simulationType: slug, totalCount: picked.length, minCorrect,
      durationMinutes: config.durationMinutes, questionIds: picked.map((q) => q.id), draftAnswers: {},
    })
    .returning({ id: schema.attempts.id });
  return {
    ok: true,
    attemptId: attempt!.id,
    durationMinutes: config.durationMinutes,
    configVerified: config.verified,
    shortExam: picked.length < config.questionCount,
    questions: picked.map(toPublic),
    remainingSeconds: config.durationMinutes * 60,
    draftAnswers: {},
    resumed: false,
  };
}

/** Autosave: guarda as respostas marcadas até agora (só enquanto a prova está aberta). */
export async function saveDraft(userId: string, attemptId: string, answers: Record<string, string>) {
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(answers).slice(0, 100)) if (typeof v === 'string' && v.length <= 4) clean[k] = v;
  const db = await getDb();
  const r = await db
    .update(schema.attempts)
    .set({ draftAnswers: clean })
    .where(and(eq(schema.attempts.id, attemptId), eq(schema.attempts.userId, userId), sql`${schema.attempts.finishedAt} is null`))
    .returning({ id: schema.attempts.id });
  return r.length > 0;
}

export async function getOpenAttempt(userId: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.attempts)
    .where(and(eq(schema.attempts.userId, userId), sql`${schema.attempts.finishedAt} is null`))
    .orderBy(desc(schema.attempts.startedAt))
    .limit(1);
  const a = rows[0];
  if (!a?.durationMinutes) return null;
  return a.startedAt.getTime() + a.durationMinutes * 60_000 > Date.now() ? a : null;
}

export type Review = {
  questionId: string; statement: string; options: { id: string; text: string }[];
  selectedOptionId: string | null; correctOptionId: string; explanation: string | null; legalRef: string | null;
};

export async function finishAttempt(
  userId: string,
  attemptId: string,
  answers: { questionId: string; selectedOptionId: string | null }[],
) {
  const db = await getDb();
  const [attempt] = await db
    .select()
    .from(schema.attempts)
    .where(and(eq(schema.attempts.id, attemptId), eq(schema.attempts.userId, userId)))
    .limit(1);
  if (!attempt) return { ok: false as const, reason: 'Simulado não encontrado.' };
  if (attempt.finishedAt) return { ok: false as const, reason: 'Este simulado já foi finalizado.' };
  const sim = getSimulation(attempt.simulationType);
  const byId = new Map(loadQuestions(sim?.stateCode ?? '').map((q) => [q.id, q]));

  // Só vale resposta para questão real, uma vez cada, e no máximo o tamanho da prova.
  const seen = new Set<string>();
  const valid = answers.filter((a) => byId.has(a.questionId) && !seen.has(a.questionId) && seen.add(a.questionId)).slice(0, attempt.totalCount);
  const review: Review[] = valid.map((a) => {
    const q = byId.get(a.questionId)!;
    const opt = q.options.some((o) => o.id === a.selectedOptionId) ? a.selectedOptionId : null;
    return {
      questionId: q.id, statement: q.statement, options: q.options, selectedOptionId: opt,
      correctOptionId: q.correctOptionId, explanation: q.explanation ?? null, legalRef: q.legalRef ?? null,
    };
  });
  // Questões não respondidas contam como erro: o total é o da prova, não o das respostas enviadas.
  const score = scoreAttempt(review, { ...getExamConfig(sim?.stateCode), minCorrect: attempt.minCorrect ?? 0 });
  const passed = score.correct >= (attempt.minCorrect ?? 0);

  await db.transaction(async (tx) => {
    const done = await tx
      .update(schema.attempts)
      .set({ finishedAt: new Date(), correctCount: score.correct, passed })
      .where(and(eq(schema.attempts.id, attemptId), sql`${schema.attempts.finishedAt} is null`))
      .returning({ id: schema.attempts.id });
    if (done.length === 0) throw new Error('already finished');
    if (review.length) {
      await tx.insert(schema.attemptAnswers).values(
        review.map((r) => ({
          attemptId,
          questionId: r.questionId,
          topic: byId.get(r.questionId)!.topic,
          selectedOptionId: r.selectedOptionId,
          isCorrect: r.selectedOptionId === r.correctOptionId,
        })),
      );
    }
  });
  return { ok: true as const, correct: score.correct, total: attempt.totalCount, passed, minCorrect: attempt.minCorrect ?? 0, review };
}

export type SimStats = {
  slug: string; attempts: number; answered: number; correct: number; accuracy: number | null; passes: number;
  byTopic: { topic: string; answered: number; correct: number }[];
};

export async function getStats(userId: string) {
  const db = await getDb();
  const perAttempt = await db
    .select({
      slug: schema.attempts.simulationType,
      attempts: sql<number>`count(*)::int`,
      correct: sql<number>`coalesce(sum(${schema.attempts.correctCount}),0)::int`,
      total: sql<number>`coalesce(sum(${schema.attempts.totalCount}),0)::int`,
      passes: sql<number>`count(*) filter (where ${schema.attempts.passed})::int`,
    })
    .from(schema.attempts)
    .where(and(eq(schema.attempts.userId, userId), isNotNull(schema.attempts.finishedAt)))
    .groupBy(schema.attempts.simulationType);

  const topics = await db
    .select({
      slug: schema.attempts.simulationType,
      topic: schema.attemptAnswers.topic,
      answered: sql<number>`count(*)::int`,
      correct: sql<number>`count(*) filter (where ${schema.attemptAnswers.isCorrect})::int`,
    })
    .from(schema.attemptAnswers)
    .innerJoin(schema.attempts, eq(schema.attempts.id, schema.attemptAnswers.attemptId))
    .where(eq(schema.attempts.userId, userId))
    .groupBy(schema.attempts.simulationType, schema.attemptAnswers.topic);

  const history = await db
    .select()
    .from(schema.attempts)
    .where(and(eq(schema.attempts.userId, userId), isNotNull(schema.attempts.finishedAt)))
    .orderBy(desc(schema.attempts.finishedAt))
    .limit(20);

  // "Questões resolvidas" = total da prova (não respondidas contam como erro), para o % bater com a nota.
  const bySlug = new Map<string, SimStats>();
  for (const r of perAttempt) {
    bySlug.set(r.slug, {
      slug: r.slug, attempts: r.attempts, answered: r.total, correct: r.correct,
      accuracy: r.total ? Math.round((r.correct / r.total) * 100) : null, passes: r.passes, byTopic: [],
    });
  }
  for (const t of topics) bySlug.get(t.slug)?.byTopic.push({ topic: t.topic, answered: t.answered, correct: t.correct });
  return { stats: bySlug, history };
}
