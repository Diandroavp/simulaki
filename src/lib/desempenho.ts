import { and, eq, sql } from 'drizzle-orm';
import { getDb, schema } from '@/db';

/** Painel de desempenho: tudo que o aluno respondeu (provas, treinos e personalizados). */

export const META_DIARIA = 10;
const TZ = 'America/Manaus'; // (a consulta SQL usa o literal, para o GROUP BY casar com o SELECT)

export type DiaAtividade = { dia: string; respondidas: number; acertos: number };

/** Dia (AAAA-MM-DD) no fuso de Manaus. */
export function diaManaus(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

/** Últimos `n` dias, do mais antigo ao de hoje, preenchendo com zero os dias sem atividade. */
export function ultimosDias(rows: DiaAtividade[], hoje: Date, n = 14): DiaAtividade[] {
  const por = new Map(rows.map((r) => [r.dia, r]));
  const out: DiaAtividade[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const dia = diaManaus(new Date(hoje.getTime() - i * 86_400_000));
    out.push(por.get(dia) ?? { dia, respondidas: 0, acertos: 0 });
  }
  return out;
}

/** Dias seguidos com atividade. Hoje ainda sem atividade não zera a sequência (conta a partir de ontem). */
export function sequencia(dias: DiaAtividade[]): number {
  let i = dias.length - 1;
  if (i >= 0 && dias[i]!.respondidas === 0) i--;
  let n = 0;
  for (; i >= 0 && dias[i]!.respondidas > 0; i--) n++;
  return n;
}

export type Tema = { banco: 'enem' | 'detran'; topic: string; respondidas: number; acertos: number; pct: number };

export async function desempenho(userId: string, hoje = new Date()) {
  const db = await getDb();
  const diaExpr = sql<string>`to_char(${schema.attempts.startedAt} at time zone 'America/Manaus', 'YYYY-MM-DD')`;
  const porDia = await db
    .select({
      dia: diaExpr,
      respondidas: sql<number>`count(*)::int`,
      acertos: sql<number>`count(*) filter (where ${schema.attemptAnswers.isCorrect})::int`,
    })
    .from(schema.attemptAnswers)
    .innerJoin(schema.attempts, eq(schema.attempts.id, schema.attemptAnswers.attemptId))
    .where(and(eq(schema.attempts.userId, userId), sql`${schema.attempts.startedAt} > now() - interval '60 days'`))
    .groupBy(diaExpr);

  const porTema = await db
    .select({
      enem: sql<boolean>`${schema.attemptAnswers.questionId} like 'enem-%'`,
      topic: schema.attemptAnswers.topic,
      respondidas: sql<number>`count(*)::int`,
      acertos: sql<number>`count(*) filter (where ${schema.attemptAnswers.isCorrect})::int`,
    })
    .from(schema.attemptAnswers)
    .innerJoin(schema.attempts, eq(schema.attempts.id, schema.attemptAnswers.attemptId))
    .where(eq(schema.attempts.userId, userId))
    .groupBy(sql`${schema.attemptAnswers.questionId} like 'enem-%'`, schema.attemptAnswers.topic);

  const dias = ultimosDias(porDia, hoje, 14);
  const temas: Tema[] = porTema
    .map((t) => ({ banco: (t.enem ? 'enem' : 'detran') as Tema['banco'], topic: t.topic, respondidas: t.respondidas, acertos: t.acertos, pct: t.respondidas ? Math.round((t.acertos / t.respondidas) * 100) : 0 }))
    .sort((a, b) => a.pct - b.pct);
  const total = temas.reduce((a, t) => a + t.respondidas, 0);
  const acertos = temas.reduce((a, t) => a + t.acertos, 0);
  return {
    dias, sequencia: sequencia(dias), hoje: dias[dias.length - 1]!.respondidas, meta: META_DIARIA,
    total, pct: total ? Math.round((acertos / total) * 100) : null, temas,
  };
}
