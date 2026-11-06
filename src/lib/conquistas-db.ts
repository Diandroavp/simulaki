import { eq, sql } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { mundoDeTipo } from './mundos';
import { calcularConquistas, sequencias, type Conquistas, type Estatisticas } from './conquistas';

const diaManaus = (d: Date) => new Date(d.getTime() - 4 * 3_600_000).toISOString().slice(0, 10);

export async function estatisticas(userId: string, now = new Date()): Promise<Estatisticas> {
  const db = await getDb();
  const tentativas = await db
    .select({ tipo: schema.attempts.simulationType, inicio: schema.attempts.startedAt, fim: schema.attempts.finishedAt, total: schema.attempts.totalCount, certas: schema.attempts.correctCount, passou: schema.attempts.passed })
    .from(schema.attempts)
    .where(eq(schema.attempts.userId, userId));
  const [resp] = await db
    .select({ n: sql<number>`count(*)::int`, certas: sql<number>`count(*) filter (where ${schema.attemptAnswers.isCorrect})::int` })
    .from(schema.attemptAnswers)
    .innerJoin(schema.attempts, eq(schema.attempts.id, schema.attemptAnswers.attemptId))
    .where(eq(schema.attempts.userId, userId));
  const porArea = await db
    .select({ area: schema.attemptAnswers.topic, n: sql<number>`count(*)::int` })
    .from(schema.attemptAnswers)
    .innerJoin(schema.attempts, eq(schema.attempts.id, schema.attemptAnswers.attemptId))
    .where(sql`${schema.attempts.userId} = ${userId} and ${schema.attemptAnswers.questionId} like 'enem-%'`)
    .groupBy(schema.attemptAnswers.topic);
  const [ind] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.referrals).where(eq(schema.referrals.referrerId, userId));

  const concluidas = tentativas.filter((t) => t.fim);
  const simul = concluidas.filter((t) => !t.tipo.startsWith('treino:'));
  const melhorPct = Math.max(0, ...simul.filter((t) => t.total >= 10 && t.certas !== null).map((t) => Math.round(((t.certas ?? 0) / t.total) * 100)));
  const seq = sequencias(tentativas.map((t) => diaManaus(t.inicio)), diaManaus(now));
  return {
    respondidas: resp?.n ?? 0,
    certas: resp?.certas ?? 0,
    simulados: simul.length,
    treinos: concluidas.length - simul.length,
    melhorPct,
    aprovouDetran: simul.some((t) => t.passou === true && mundoDeTipo(t.tipo) === 'detran'),
    mundos: new Set(tentativas.map((t) => mundoDeTipo(t.tipo))).size,
    melhorSequencia: seq.melhor,
    sequenciaAtual: seq.atual,
    areasEnem: porArea.filter((a) => a.n >= 10).length,
    indicados: ind?.n ?? 0,
  };
}

export async function conquistasDe(userId: string): Promise<Conquistas & { sequenciaAtual: number; stats: Estatisticas }> {
  const stats = await estatisticas(userId);
  return { ...calcularConquistas(stats), sequenciaAtual: stats.sequenciaAtual, stats };
}
