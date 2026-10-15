import { recompensarIndicador } from './indicacao';
import { and, desc, eq, gt, inArray, sql } from 'drizzle-orm';
import { getDb, schema, type Db } from '@/db';
import { hasFullAccess } from './access';
import { isCanviSandbox, simulateSandboxPayment } from './payments/canvi';
import { getPixProvider, paymentsEnabled } from './payments/provider';

const DAY = 86_400_000;
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export type CouponCheck =
  | { ok: true; coupon: typeof schema.coupons.$inferSelect }
  | { ok: false; reason: string };

export const normalizeCode = (c: string) => c.trim().toUpperCase().replace(/\s+/g, '');

export async function checkCoupon(db: Db | Tx, code: string, userId: string): Promise<CouponCheck> {
  const [coupon] = await db.select().from(schema.coupons).where(eq(schema.coupons.code, normalizeCode(code))).limit(1);
  if (!coupon || !coupon.active) return { ok: false, reason: 'Cupom inválido.' };
  if (coupon.validUntil && coupon.validUntil < new Date()) return { ok: false, reason: 'Cupom expirado.' };
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) return { ok: false, reason: 'Cupom esgotado.' };
  const [used] = await db
    .select({ id: schema.couponRedemptions.id })
    .from(schema.couponRedemptions)
    .where(and(eq(schema.couponRedemptions.couponId, coupon.id), eq(schema.couponRedemptions.userId, userId)))
    .limit(1);
  if (used) return { ok: false, reason: 'Você já usou este cupom.' };
  return { ok: true, coupon };
}

/** Consome uma vaga do cupom (respeitando maxUses) e registra o uso do usuário. Falha se acabou ou já foi usado. */
async function redeem(tx: Tx, couponId: string, userId: string): Promise<boolean> {
  const bumped = await tx
    .update(schema.coupons)
    .set({ usedCount: sql`${schema.coupons.usedCount} + 1` })
    .where(
      and(
        eq(schema.coupons.id, couponId),
        sql`(${schema.coupons.maxUses} is null or ${schema.coupons.usedCount} < ${schema.coupons.maxUses})`,
      ),
    )
    .returning({ id: schema.coupons.id });
  if (bumped.length === 0) return false;
  const ins = await tx
    .insert(schema.couponRedemptions)
    .values({ couponId, userId })
    .onConflictDoNothing()
    .returning({ id: schema.couponRedemptions.id });
  return ins.length > 0;
}

export function priceWithCoupon(priceCents: number, c?: { percentOff: number | null; amountOffCents: number | null }) {
  if (!c) return priceCents;
  const off = c.percentOff ? Math.round((priceCents * c.percentOff) / 100) : (c.amountOffCents ?? 0);
  return Math.max(0, priceCents - off);
}

/**
 * Soma dias de acesso ao usuário. Se já há assinatura vigente, estende a partir do fim dela
 * (não perde dias já pagos).
 */
export async function grantAccess(tx: Tx, userId: string, planId: string, days: number, gatewayId?: string | null) {
  const now = new Date();
  const [current] = await tx
    .select({ endsAt: schema.subscriptions.endsAt })
    .from(schema.subscriptions)
    .where(
      and(
        eq(schema.subscriptions.ownerUserId, userId),
        inArray(schema.subscriptions.status, ['active', 'trialing']),
        gt(schema.subscriptions.endsAt, now),
      ),
    )
    .orderBy(desc(schema.subscriptions.endsAt))
    .limit(1);
  const startsAt = current?.endsAt && current.endsAt > now ? current.endsAt : now;
  const [sub] = await tx
    .insert(schema.subscriptions)
    .values({
      ownerUserId: userId,
      planId,
      status: 'active',
      startsAt,
      endsAt: new Date(startsAt.getTime() + days * DAY),
      gatewayId: gatewayId ?? null,
    })
    .returning();
  return sub!;
}

export async function userHasAccess(userId: string): Promise<{ full: boolean; endsAt: Date | null; viaPartner: string | null }> {
  const db = await getDb();
  const now = new Date();
  const subs = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.ownerUserId, userId));
  // Vínculos ativos com parceiros (aluno) e as assinaturas de cada parceiro.
  const links = await db
    .select({ orgId: schema.memberships.organizationId, orgName: schema.organizations.name })
    .from(schema.memberships)
    .innerJoin(schema.organizations, eq(schema.organizations.id, schema.memberships.organizationId))
    .where(and(eq(schema.memberships.userId, userId), eq(schema.memberships.status, 'active'), eq(schema.memberships.role, 'student')));
  const partnerSubs = links.length
    ? await db.select().from(schema.subscriptions).where(inArray(schema.subscriptions.ownerOrgId, links.map((l) => l.orgId)))
    : [];
  const partners = links.map((l) => ({
    membershipActive: true,
    subscriptions: partnerSubs.filter((s) => s.ownerOrgId === l.orgId).map((s) => ({ status: s.status, endsAt: s.endsAt, pastDueSince: s.pastDueSince })),
  }));
  const own = subs.map((s) => ({ status: s.status, endsAt: s.endsAt, pastDueSince: s.pastDueSince }));
  const full = hasFullAccess({ now, own, partners });
  const ends = subs.filter((s) => s.endsAt && s.endsAt > now).map((s) => s.endsAt!.getTime());
  const ownActive = hasFullAccess({ now, own });
  const via = !ownActive && full ? (links.find((l) => partnerSubs.some((s) => s.ownerOrgId === l.orgId && hasFullAccess({ now, own: [{ status: s.status, endsAt: s.endsAt, pastDueSince: s.pastDueSince }] })))?.orgName ?? null) : null;
  return { full, endsAt: ends.length ? new Date(Math.max(...ends)) : null, viaPartner: via };
}

export type StartResult = { ok: true; paymentId: string } | { ok: true; free: true } | { ok: false; reason: string };

/** Cria a cobrança Pix de um plano (com cupom opcional) ou, se o cupom libera dias grátis, concede o acesso direto. */
export async function startCheckout(userId: string, planSlug: string, couponCode?: string): Promise<StartResult> {
  const db = await getDb();
  const [who] = await db.select({ v: schema.users.emailVerifiedAt }).from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  if (!who?.v) return { ok: false, reason: 'Confirme seu e-mail antes de assinar. Enviamos um link para a sua caixa de entrada.' };
  const [plan] = await db.select().from(schema.plans).where(and(eq(schema.plans.slug, planSlug), eq(schema.plans.active, true))).limit(1);
  if (!plan || plan.audience !== 'student') return { ok: false, reason: 'Plano não encontrado.' };

  let coupon: typeof schema.coupons.$inferSelect | undefined;
  if (couponCode?.trim()) {
    const check = await checkCoupon(db, couponCode, userId);
    if (!check.ok) return check;
    coupon = check.coupon;
    if (coupon.freeDays) {
      const done = await db.transaction(async (tx) => {
        if (!(await redeem(tx, coupon!.id, userId))) return false;
        await grantAccess(tx, userId, plan.id, coupon!.freeDays!, `coupon:${coupon!.code}`);
        return true;
      });
      return done ? { ok: true, free: true } : { ok: false, reason: 'Cupom esgotado ou já usado.' };
    }
  }

  const amountCents = priceWithCoupon(plan.priceCents, coupon);
  if (amountCents <= 0) return { ok: false, reason: 'Valor inválido para cobrança.' };
  if (!paymentsEnabled()) return { ok: false, reason: 'O pagamento por Pix abre em breve. Por enquanto, use um cupom ou o simulado grátis do dia.' };
  const provider = getPixProvider();
  const reference = crypto.randomUUID();
  let charge;
  try {
    charge = await provider.createPixCharge({ amountCents, description: `Simulaki - ${plan.name}`, reference });
  } catch (e) {
    console.error('Falha ao criar cobrança Pix:', e instanceof Error ? e.message : e);
    return { ok: false, reason: 'Não foi possível gerar o Pix agora. Tente novamente em instantes.' };
  }
  const [payment] = await db
    .insert(schema.payments)
    .values({
      userId,
      planId: plan.id,
      couponId: coupon?.id ?? null,
      amountCents,
      method: 'pix',
      status: 'pending',
      gatewayId: charge.gatewayId,
      pixCopyPaste: charge.copyPaste,
      pixExpiresAt: charge.expiresAt,
    })
    .returning({ id: schema.payments.id });
  return { ok: true, paymentId: payment!.id };
}

/**
 * Confirma um pagamento pelo id da cobrança no gateway. Idempotente: confirmar duas vezes não
 * concede acesso duas vezes. Valor pago diferente do cobrado é recusado.
 */
export async function confirmPayment(gatewayId: string, paidAmountCents?: number): Promise<'confirmed' | 'already' | 'not_found' | 'amount_mismatch'> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [pay] = await tx.select().from(schema.payments).where(eq(schema.payments.gatewayId, gatewayId)).limit(1);
    if (!pay) return 'not_found';
    if (pay.status === 'paid') return 'already';
    if (paidAmountCents !== undefined && paidAmountCents !== pay.amountCents) return 'amount_mismatch';
    // Só um processo vence a corrida pelo status pending -> paid.
    const flipped = await tx
      .update(schema.payments)
      .set({ status: 'paid', paidAt: new Date() })
      .where(and(eq(schema.payments.id, pay.id), eq(schema.payments.status, 'pending')))
      .returning({ id: schema.payments.id });
    if (flipped.length === 0) return 'already';
    const [plan] = await tx.select().from(schema.plans).where(eq(schema.plans.id, pay.planId)).limit(1);
    const sub = await grantAccess(tx, pay.userId, pay.planId, plan?.periodDays ?? 30, gatewayId);
    await tx.update(schema.payments).set({ subscriptionId: sub.id }).where(eq(schema.payments.id, pay.id));
    if (pay.couponId) await redeem(tx, pay.couponId, pay.userId); // cupom de desconto é consumido quando paga
    await recompensarIndicador(tx, pay.userId, pay.planId, pay.amountCents); // 1º pagamento de quem foi indicado
    return 'confirmed';
  });
}

/** O botão "Simular pagamento" só existe em desenvolvimento (provedor de teste) ou no sandbox da Canvi. */
export function canSimulatePayments(): boolean {
  const gw = process.env.PAYMENT_GATEWAY ?? 'mock';
  if (gw === 'mock') return process.env.NODE_ENV !== 'production';
  return gw === 'canvi' && isCanviSandbox();
}

export async function simulatePaid(userId: string, paymentId: string) {
  if (!canSimulatePayments()) return 'blocked';
  const db = await getDb();
  const [pay] = await db
    .select()
    .from(schema.payments)
    .where(and(eq(schema.payments.id, paymentId), eq(schema.payments.userId, userId)))
    .limit(1);
  if (!pay?.gatewayId) return 'not_found';
  if ((process.env.PAYMENT_GATEWAY ?? 'mock') === 'canvi') {
    await simulateSandboxPayment(pay.gatewayId, pay.amountCents); // a Canvi marca como paga; a confirmação segue o caminho real
    const charge = await getPixProvider().getCharge(pay.gatewayId);
    return charge.status === 'paid' ? confirmPayment(pay.gatewayId, charge.amountCents) : 'pending';
  }
  return confirmPayment(pay.gatewayId, pay.amountCents);
}
