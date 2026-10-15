import { randomBytes } from 'node:crypto';
import { and, eq, isNotNull, sql } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { grantAccess } from './billing';

/**
 * Programa de indicação: quem indica ganha REWARD_DAYS dias de acesso quando o amigo indicado faz o
 * primeiro pagamento (valor maior que zero). Cada indicado rende uma única recompensa, e cada pessoa
 * recebe no máximo REWARD_MAX recompensas.
 */
export const REWARD_DAYS = 15;
export const REWARD_MAX = 12;

type Db = Awaited<ReturnType<typeof getDb>>;
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem O/0/I/1, para ler e digitar sem erro
const novoCodigo = () => Array.from(randomBytes(8), (b) => ALFABETO[b % ALFABETO.length]).join('');

/** Código de indicação do usuário; cria na primeira vez. */
export async function codigoDe(userId: string): Promise<string> {
  const db = await getDb();
  const [u] = await db.select({ c: schema.users.referralCode }).from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  if (u?.c) return u.c;
  for (let i = 0; i < 5; i++) {
    const c = novoCodigo();
    try {
      const r = await db.update(schema.users).set({ referralCode: c }).where(and(eq(schema.users.id, userId), sql`${schema.users.referralCode} is null`)).returning({ c: schema.users.referralCode });
      if (r[0]?.c) return r[0].c;
      const [again] = await db.select({ c: schema.users.referralCode }).from(schema.users).where(eq(schema.users.id, userId)).limit(1);
      if (again?.c) return again.c;
    } catch { /* código repetido: tenta outro */ }
  }
  throw new Error('Não foi possível gerar o código de indicação.');
}

/** Liga o novo usuário a quem o indicou. Código inválido, o próprio usuário ou indicação repetida são ignorados. */
export async function registrarIndicacao(referredId: string, codigo: string): Promise<boolean> {
  const code = codigo.trim().toUpperCase();
  if (!/^[A-Z0-9]{6,12}$/.test(code)) return false;
  const db = await getDb();
  const [ref] = await db.select({ id: schema.users.id, deletedAt: schema.users.deletedAt }).from(schema.users).where(eq(schema.users.referralCode, code)).limit(1);
  if (!ref || ref.deletedAt || ref.id === referredId) return false;
  const r = await db.insert(schema.referrals).values({ referrerId: ref.id, referredId }).onConflictDoNothing().returning({ id: schema.referrals.id });
  return r.length > 0;
}

/** Chamado dentro da confirmação de pagamento: dá os dias ao indicador se este é o 1º pagamento do indicado. */
export async function recompensarIndicador(tx: Tx, referredId: string, planId: string, amountCents: number): Promise<number> {
  if (amountCents <= 0) return 0;
  const [ind] = await tx.select().from(schema.referrals).where(eq(schema.referrals.referredId, referredId)).limit(1);
  if (!ind || ind.rewardedAt) return 0;
  const [{ n } = { n: 0 }] = await tx.select({ n: sql<number>`count(*)::int` }).from(schema.referrals).where(and(eq(schema.referrals.referrerId, ind.referrerId), isNotNull(schema.referrals.rewardedAt)));
  if (n >= REWARD_MAX) return 0;
  const [quem] = await tx.select({ deletedAt: schema.users.deletedAt }).from(schema.users).where(eq(schema.users.id, ind.referrerId)).limit(1);
  if (!quem || quem.deletedAt) return 0;
  // Só um processo ganha a corrida pelo rewardedAt.
  const marcou = await tx.update(schema.referrals).set({ rewardedAt: new Date(), rewardDays: REWARD_DAYS }).where(and(eq(schema.referrals.id, ind.id), sql`${schema.referrals.rewardedAt} is null`)).returning({ id: schema.referrals.id });
  if (marcou.length === 0) return 0;
  await grantAccess(tx, ind.referrerId, planId, REWARD_DAYS, `indicacao:${ind.id}`);
  return REWARD_DAYS;
}

/** Resumo para a área do aluno. */
export async function resumoIndicacoes(userId: string) {
  const db = await getDb();
  const [r] = await db
    .select({ amigos: sql<number>`count(*)::int`, premiados: sql<number>`count(${schema.referrals.rewardedAt})::int`, dias: sql<number>`coalesce(sum(${schema.referrals.rewardDays}),0)::int` })
    .from(schema.referrals)
    .where(eq(schema.referrals.referrerId, userId));
  return { amigos: r?.amigos ?? 0, premiados: r?.premiados ?? 0, dias: r?.dias ?? 0, restantes: Math.max(0, REWARD_MAX - (r?.premiados ?? 0)) };
}
