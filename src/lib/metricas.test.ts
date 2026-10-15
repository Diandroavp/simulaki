import { describe, expect, it } from 'vitest';

process.env.PGLITE_DIR = 'memory://';
const { getDb, schema } = await import('@/db');
const { metricas } = await import('./metricas');

describe('métricas do negócio', () => {
  it('calcula funil, receita por plano e renovação', async () => {
    const db = await getDb();
    const [plan] = await db.select().from(schema.plans).limit(1);
    const mk = async (verificado: boolean) => (await db.insert(schema.users).values({ name: 'X', email: `m${Math.random()}@t.com`, emailVerifiedAt: verificado ? new Date() : null }).returning())[0]!;
    const a = await mk(true); const b = await mk(true); await mk(false);
    await db.insert(schema.attempts).values({ userId: a.id, simulationType: 'treino:legislacao', totalCount: 1 });
    const pay = (u: string) => db.insert(schema.payments).values({ userId: u, planId: plan!.id, amountCents: 1290, method: 'pix', status: 'paid', paidAt: new Date(), gatewayId: `g${Math.random()}` });
    await pay(a.id); await pay(a.id); await pay(b.id);
    const m = await metricas();
    expect(m.funilTotal.cadastros).toBeGreaterThanOrEqual(3);
    expect(m.funilTotal.pagantes).toBe(2);
    expect(m.funilTotal.ativos).toBe(1);
    expect(m.pagantes).toBe(2);
    expect(m.renovaram).toBe(1);
    expect(m.taxaRenovacao).toBe(50);
    expect(m.receita30).toBe(3 * 1290);
    expect(m.ticketMedio30).toBe(1290);
    expect(m.receitaPorPlano[0]).toMatchObject({ pagamentos: 3, centavos: 3870 });
    expect(m.semanas.reduce((n, s) => n + s.cadastros, 0)).toBe(3);
  });
});
