import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { getDb, schema } from '@/db';

const MAX_PER_DAY = 20;

/** Aluno avisa que uma questão tem erro. Limita 20 avisos por dia por usuário. */
export async function reportQuestion(userId: string, questionId: string, reason: string): Promise<'ok' | 'limit' | 'invalid'> {
  const text = reason.trim().slice(0, 1000);
  if (!questionId || questionId.length > 80 || text.length < 5) return 'invalid';
  const db = await getDb();
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.questionFeedback)
    .where(and(eq(schema.questionFeedback.userId, userId), sql`${schema.questionFeedback.createdAt} > now() - interval '1 day'`));
  if ((row?.n ?? 0) >= MAX_PER_DAY) return 'limit';
  await db.insert(schema.questionFeedback).values({ questionId, userId, reason: text });
  return 'ok';
}

export async function openFeedback() {
  const db = await getDb();
  return db.select().from(schema.questionFeedback).where(isNull(schema.questionFeedback.resolvedAt)).orderBy(desc(schema.questionFeedback.createdAt)).limit(200);
}

export async function resolveFeedback(id: string) {
  const db = await getDb();
  await db.update(schema.questionFeedback).set({ resolvedAt: new Date() }).where(eq(schema.questionFeedback.id, id));
}

/** Questões com mais erros entre os alunos (mínimo de 5 respostas), para o revisor olhar primeiro. */
export async function hardestQuestions(limit = 15) {
  const db = await getDb();
  return db
    .select({
      questionId: schema.attemptAnswers.questionId,
      total: sql<number>`count(*)::int`,
      wrong: sql<number>`sum(case when ${schema.attemptAnswers.isCorrect} then 0 else 1 end)::int`,
    })
    .from(schema.attemptAnswers)
    .groupBy(schema.attemptAnswers.questionId)
    .having(sql`count(*) >= 5`)
    .orderBy(sql`sum(case when ${schema.attemptAnswers.isCorrect} then 0 else 1 end)::float / count(*) desc`)
    .limit(limit);
}
