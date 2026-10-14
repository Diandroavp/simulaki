import { afterEach, describe, expect, it, vi } from 'vitest';

process.env.PGLITE_DIR = 'memory://';
const { getDb, schema } = await import('@/db');
const { rodarLembretes } = await import('./lembretes');
const { outbox } = await import('./email');

const DIA = 86_400_000;
const now = new Date('2026-10-14T15:00:00Z');

async function aluno(opts: { consent: boolean; ultimo?: number; fimPlano?: number; verificado?: boolean }) {
  const db = await getDb();
  const email = `l${Math.random()}@t.com`;
  const [u] = await db.insert(schema.users).values({ name: 'Ana Souza', email, marketingConsent: opts.consent, emailVerifiedAt: opts.verificado === false ? null : new Date() }).returning();
  if (opts.ultimo !== undefined) await db.insert(schema.attempts).values({ userId: u!.id, simulationType: 'treino:legislacao', totalCount: 10, startedAt: new Date(now.getTime() - opts.ultimo * DIA) });
  if (opts.fimPlano !== undefined) {
    const [plan] = await db.select().from(schema.plans).limit(1);
    await db.insert(schema.subscriptions).values({ ownerUserId: u!.id, planId: plan!.id, status: 'active', startsAt: new Date(now.getTime() - 20 * DIA), endsAt: new Date(now.getTime() + opts.fimPlano * DIA) });
  }
  return email;
}

describe('rodarLembretes (banco)', () => {
  afterEach(() => { vi.unstubAllEnvs(); outbox.length = 0; });

  it('avisa só quem aceitou, está na janela de 3 dias e tem e-mail confirmado; e o fim do plano', async () => {
    vi.stubEnv('REMINDERS_ENABLED', '1'); vi.stubEnv('CRON_SECRET', 'segredo-de-teste-com-16+');
    const sim = await aluno({ consent: true, ultimo: 3.5 });
    await aluno({ consent: false, ultimo: 3.5 });
    await aluno({ consent: true, ultimo: 1 });
    await aluno({ consent: true, ultimo: 10 });
    await aluno({ consent: true, ultimo: 3.5, verificado: false });
    const fim = await aluno({ consent: false, fimPlano: 3.5 });
    await aluno({ consent: false, fimPlano: 10 });
    const r = await rodarLembretes(now, 'https://x.com');
    expect(r).toEqual({ ativo: true, saudade: 1, fimDoPlano: 1 });
    expect(outbox.map((m) => m.to).sort()).toEqual([sim, fim].sort());
  });
});
