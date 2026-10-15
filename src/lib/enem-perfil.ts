import { eq, sql } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { AREAS, assuntoDe, type AreaKey } from './assuntos';

/** Mínimo de respostas para o gráfico mostrar uma nota (com menos, é "poucos dados"). */
export const MIN_RESPOSTAS = 3;
/** Mínimo para apontar como ponto forte ou fraco. */
export const MIN_DESTAQUE = 5;

export type Ponto = { key: string; label: string; respondidas: number; acertos: number; pct: number | null };
export type Perfil = {
  areas: Ponto[];
  assuntos: Record<AreaKey, Ponto[]>;
  fortes: Ponto[];
  fracos: Ponto[];
};

export type Resposta = { questionId: string; topic: string; respondidas: number; acertos: number };

const pct = (a: number, r: number) => (r >= MIN_RESPOSTAS ? Math.round((a / r) * 100) : null);

/** Monta o perfil a partir das respostas já agregadas por questão (função pura, testável). */
export function montarPerfil(rows: Resposta[], assunto: (id: string) => string | null = assuntoDe): Perfil {
  const porArea = new Map<string, { r: number; a: number }>();
  const porAssunto = new Map<string, { r: number; a: number }>();
  for (const x of rows) {
    if (!x.questionId.startsWith('enem-')) continue;
    const ar = porArea.get(x.topic) ?? { r: 0, a: 0 };
    ar.r += x.respondidas; ar.a += x.acertos; porArea.set(x.topic, ar);
    const s = assunto(x.questionId);
    if (s) { const as = porAssunto.get(s) ?? { r: 0, a: 0 }; as.r += x.respondidas; as.a += x.acertos; porAssunto.set(s, as); }
  }
  const areas: Ponto[] = AREAS.map((a) => {
    const v = porArea.get(a.key) ?? { r: 0, a: 0 };
    return { key: a.key, label: a.curto, respondidas: v.r, acertos: v.a, pct: pct(v.a, v.r) };
  });
  const assuntos = Object.fromEntries(AREAS.map((a) => [a.key, a.assuntos.map((s) => {
    const v = porAssunto.get(s.key) ?? { r: 0, a: 0 };
    return { key: s.key, label: s.label, respondidas: v.r, acertos: v.a, pct: pct(v.a, v.r) };
  })])) as Record<AreaKey, Ponto[]>;
  const todos = Object.values(assuntos).flat().filter((p) => p.respondidas >= MIN_DESTAQUE && p.pct !== null);
  const fortes = [...todos].sort((a, b) => b.pct! - a.pct! || b.respondidas - a.respondidas).filter((p) => p.pct! >= 60).slice(0, 3);
  const fracos = [...todos].sort((a, b) => a.pct! - b.pct! || b.respondidas - a.respondidas).filter((p) => p.pct! < 60 && !fortes.includes(p)).slice(0, 3);
  return { areas, assuntos, fortes, fracos };
}

export async function perfilEnem(userId: string): Promise<Perfil> {
  const db = await getDb();
  const rows = await db
    .select({
      questionId: schema.attemptAnswers.questionId,
      topic: schema.attemptAnswers.topic,
      respondidas: sql<number>`count(*)::int`,
      acertos: sql<number>`count(*) filter (where ${schema.attemptAnswers.isCorrect})::int`,
    })
    .from(schema.attemptAnswers)
    .innerJoin(schema.attempts, eq(schema.attempts.id, schema.attemptAnswers.attemptId))
    .where(sql`${schema.attempts.userId} = ${userId} and ${schema.attemptAnswers.questionId} like 'enem-%'`)
    .groupBy(schema.attemptAnswers.questionId, schema.attemptAnswers.topic);
  return montarPerfil(rows);
}
