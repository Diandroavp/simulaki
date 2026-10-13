import { beforeAll, describe, expect, it } from 'vitest';

process.env.PGLITE_DIR = 'memory://';
process.env.PAYMENT_GATEWAY = 'mock';

const { getDb, schema } = await import('@/db');
const { checkCoupon, confirmPayment, priceWithCoupon, startCheckout, userHasAccess } = await import('./billing');
const { signBody, verifySignature } = await import('./payments/provider');

let n = 0;
async function newUser() {
  const db = await getDb();
  const [u] = await db
    .insert(schema.users)
    .values({ emailVerifiedAt: new Date(), name: 'Teste', email: `u${++n}@teste.com` })
    .returning();
  return u!.id;
}
async function newCoupon(v: Partial<typeof schema.coupons.$inferInsert> & { code: string }) {
  const db = await getDb();
  await db.insert(schema.coupons).values(v);
}

beforeAll(async () => {
  await getDb();
});

describe('cupom de dias grátis', () => {
  it('1 mês grátis libera acesso sem cobrança', async () => {
    const uid = await newUser();
    await newCoupon({ code: 'UMMES', freeDays: 30 });
    expect((await userHasAccess(uid)).full).toBe(false);
    const r = await startCheckout(uid, 'passe-60', 'ummes'); // minúsculo: o código é normalizado
    expect(r).toEqual({ ok: true, free: true });
    const access = await userHasAccess(uid);
    expect(access.full).toBe(true);
    const days = (access.endsAt!.getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThan(30.1);
  });

  it('o mesmo usuário não resgata duas vezes', async () => {
    const uid = await newUser();
    await newCoupon({ code: 'UMAVEZ', freeDays: 30 });
    expect(await startCheckout(uid, 'mensal', 'UMAVEZ')).toEqual({ ok: true, free: true });
    const again = await startCheckout(uid, 'mensal', 'UMAVEZ');
    expect(again.ok).toBe(false);
  });

  it('respeita o limite de usos', async () => {
    await newCoupon({ code: 'SO1', freeDays: 7, maxUses: 1 });
    const a = await newUser();
    const b = await newUser();
    expect((await startCheckout(a, 'mensal', 'SO1')).ok).toBe(true);
    const second = await startCheckout(b, 'mensal', 'SO1');
    expect(second).toEqual({ ok: false, reason: 'Cupom esgotado.' });
    expect((await userHasAccess(b)).full).toBe(false);
  });

  it('cupom inativo ou expirado é recusado', async () => {
    const uid = await newUser();
    const db = await getDb();
    await newCoupon({ code: 'OFF', freeDays: 30, active: false });
    await newCoupon({ code: 'VELHO', freeDays: 30, validUntil: new Date(Date.now() - 1000) });
    expect((await checkCoupon(db, 'OFF', uid)).ok).toBe(false);
    expect((await checkCoupon(db, 'VELHO', uid)).ok).toBe(false);
    expect((await checkCoupon(db, 'NAOEXISTE', uid)).ok).toBe(false);
  });
});

describe('pagamento Pix', () => {
  it('cobra o preço cheio e libera o acesso só depois da confirmação', async () => {
    const uid = await newUser();
    const r = await startCheckout(uid, 'passe-60');
    expect(r.ok && 'paymentId' in r).toBe(true);
    expect((await userHasAccess(uid)).full).toBe(false); // pendente não dá acesso
    const db = await getDb();
    const [pay] = await db.select().from(schema.payments);
    expect(pay).toBeDefined();
  });

  it('confirmar duas vezes concede acesso uma vez só (idempotente)', async () => {
    const uid = await newUser();
    await startCheckout(uid, 'passe-60');
    const db = await getDb();
    const rows = await db.select().from(schema.payments);
    const pay = rows.find((p) => p.userId === uid)!;
    expect(await confirmPayment(pay.gatewayId!, pay.amountCents)).toBe('confirmed');
    expect(await confirmPayment(pay.gatewayId!, pay.amountCents)).toBe('already');
    const subs = (await db.select().from(schema.subscriptions)).filter((s) => s.ownerUserId === uid);
    expect(subs).toHaveLength(1);
    const days = (subs[0]!.endsAt!.getTime() - Date.now()) / 86_400_000;
    expect(Math.round(days)).toBe(60);
  });

  it('valor pago diferente do cobrado é recusado', async () => {
    const uid = await newUser();
    await startCheckout(uid, 'passe-60');
    const db = await getDb();
    const pay = (await db.select().from(schema.payments)).find((p) => p.userId === uid)!;
    expect(await confirmPayment(pay.gatewayId!, 100)).toBe('amount_mismatch');
    expect((await userHasAccess(uid)).full).toBe(false);
  });

  it('desconto em porcentagem reduz o valor e é consumido só ao pagar', async () => {
    const uid = await newUser();
    await newCoupon({ code: 'METADE', percentOff: 50, maxUses: 5 });
    expect(priceWithCoupon(2990, { percentOff: 50, amountOffCents: null })).toBe(1495);
    await startCheckout(uid, 'passe-60', 'METADE');
    const db = await getDb();
    const pay = (await db.select().from(schema.payments)).find((p) => p.userId === uid)!;
    expect(pay.amountCents).toBe(1495);
    let [c] = await db.select().from(schema.coupons);
    c = (await db.select().from(schema.coupons)).find((x) => x.code === 'METADE')!;
    expect(c.usedCount).toBe(0);
    await confirmPayment(pay.gatewayId!, pay.amountCents);
    c = (await db.select().from(schema.coupons)).find((x) => x.code === 'METADE')!;
    expect(c.usedCount).toBe(1);
  });

  it('comprar de novo com acesso vigente soma os dias, sem perder os já pagos', async () => {
    const uid = await newUser();
    await newCoupon({ code: 'SOMA30', freeDays: 30 });
    await startCheckout(uid, 'mensal', 'SOMA30');
    await startCheckout(uid, 'passe-60');
    const db = await getDb();
    const pay = (await db.select().from(schema.payments)).find((p) => p.userId === uid)!;
    await confirmPayment(pay.gatewayId!, pay.amountCents);
    const { endsAt } = await userHasAccess(uid);
    expect(Math.round((endsAt!.getTime() - Date.now()) / 86_400_000)).toBe(90);
  });
});

describe('assinatura do webhook', () => {
  it('aceita a assinatura correta e rejeita adulterada ou ausente', () => {
    const body = JSON.stringify({ eventId: 'e1' });
    const sig = signBody(body, 'segredo');
    expect(verifySignature(body, sig, 'segredo')).toBe(true);
    expect(verifySignature(body + ' ', sig, 'segredo')).toBe(false);
    expect(verifySignature(body, null, 'segredo')).toBe(false);
    expect(verifySignature(body, sig, '')).toBe(false);
  });
});
