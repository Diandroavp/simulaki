import { describe, expect, it } from 'vitest';

process.env.PGLITE_DIR = 'memory://';
const { getDb, schema } = await import('@/db');
const { codigoDe, registrarIndicacao, resumoIndicacoes, REWARD_DAYS, REWARD_MAX } = await import('./indicacao');
const { confirmPayment, userHasAccess } = await import('./billing');
const { eq } = await import('drizzle-orm');

async function usuario() {
  const db = await getDb();
  const [u] = await db.insert(schema.users).values({ name: 'X', email: `i${Math.random()}@t.com`, emailVerifiedAt: new Date() }).returning();
  return u!.id;
}
async function pagar(userId: string, cents = 1290) {
  const db = await getDb();
  const [plan] = await db.select().from(schema.plans).where(eq(schema.plans.slug, 'mensal')).limit(1);
  const gw = `gw${Math.random()}`;
  await db.insert(schema.payments).values({ userId, planId: plan!.id, amountCents: cents, method: 'pix', gatewayId: gw });
  return confirmPayment(gw);
}
const diasDe = async (id: string) => { const a = await userHasAccess(id); return a.endsAt ? Math.round((a.endsAt.getTime() - Date.now()) / 86_400_000) : 0; };

describe('programa de indicação', () => {
  it('gera um código estável por usuário', async () => {
    const a = await usuario();
    const c = await codigoDe(a);
    expect(c).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    expect(await codigoDe(a)).toBe(c);
  });

  it('o indicador ganha dias no 1º pagamento do amigo, uma única vez', async () => {
    const a = await usuario(); const b = await usuario();
    expect(await registrarIndicacao(b, await codigoDe(a))).toBe(true);
    expect(await registrarIndicacao(b, await codigoDe(a))).toBe(false); // repetida
    expect(await diasDe(a)).toBe(0);
    expect(await pagar(b)).toBe('confirmed');
    expect(await diasDe(a)).toBe(REWARD_DAYS);
    await pagar(b); // 2º pagamento do amigo não rende de novo
    expect(await diasDe(a)).toBe(REWARD_DAYS);
    expect(await resumoIndicacoes(a)).toMatchObject({ amigos: 1, premiados: 1, dias: REWARD_DAYS });
  });

  it('não vale indicar a si mesmo, código inválido nem pagamento de valor zero', async () => {
    const a = await usuario(); const b = await usuario();
    expect(await registrarIndicacao(a, await codigoDe(a))).toBe(false);
    expect(await registrarIndicacao(b, 'ZZZZZZZZ')).toBe(false);
    expect(await registrarIndicacao(b, 'abc')).toBe(false);
    await registrarIndicacao(b, await codigoDe(a));
    await pagar(b, 0);
    expect(await diasDe(a)).toBe(0);
  });

  it('limita o número de recompensas por pessoa', async () => {
    const a = await usuario();
    const cod = await codigoDe(a);
    for (let i = 0; i < REWARD_MAX + 1; i++) { const f = await usuario(); await registrarIndicacao(f, cod); await pagar(f); }
    const r = await resumoIndicacoes(a);
    expect(r.amigos).toBe(REWARD_MAX + 1);
    expect(r.premiados).toBe(REWARD_MAX);
    expect(r.restantes).toBe(0);
  });
});
