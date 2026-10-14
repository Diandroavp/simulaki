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

/** "AAAA-MM-DD" -> data da prova (meio-dia de Manaus). Só aceita datas de amanhã até 2 anos à frente. */
export function parseDataProva(raw: string, hoje = new Date()): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const d = new Date(`${raw}T12:00:00-04:00`);
  if (Number.isNaN(d.getTime())) return null;
  const dias = diasAte(d, hoje);
  return dias >= 1 && dias <= 730 ? d : null;
}

/** Dias corridos (no fuso de Manaus) de hoje até `data`. */
export function diasAte(data: Date, hoje = new Date()): number {
  const a = Date.parse(`${diaManaus(hoje)}T00:00:00Z`);
  const b = Date.parse(`${diaManaus(data)}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
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
  const [u] = await db.select({ examDate: schema.users.examDate }).from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  const diasProva = u?.examDate ? diasAte(u.examDate, hoje) : null;
  const media14 = dias.reduce((a, x) => a + x.respondidas, 0) / dias.length;
  return {
    dataProva: u?.examDate ?? null,
    diasProva: diasProva !== null && diasProva >= 0 ? diasProva : null,
    // Projeção simples: se mantiver a média dos últimos 14 dias até a prova.
    projecao: diasProva !== null && diasProva > 0 ? Math.round(media14 * diasProva) : null,
    media14: Math.round(media14 * 10) / 10,
    dias, sequencia: sequencia(dias), hoje: dias[dias.length - 1]!.respondidas, meta: META_DIARIA,
    total, pct: total ? Math.round((acertos / total) * 100) : null, temas,
  };
}
