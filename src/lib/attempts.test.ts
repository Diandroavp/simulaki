import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

process.env.PGLITE_DIR = 'memory://';
const { getDb, schema } = await import('@/db');
const { finishAttempt, getStats, saveDraft, startAttempt } = await import('./attempts');

async function user() {
  const db = await getDb();
  const [u] = await db.insert(schema.users).values({ emailVerifiedAt: new Date(), name: 'A', email: `a${Math.random()}@t.com` }).returning();
  return u!.id;
}

describe('retomar simulado', () => {
  it('recarregar devolve as mesmas questões, as respostas salvas e o tempo restante', async () => {
    const uid = await user();
    const a = await startAttempt(uid, 'detran-am');
    if (!a.ok) throw new Error('start');
    expect(a.resumed).toBe(false);
    const q0 = a.questions[0]!;
    await saveDraft(uid, a.attemptId, { [q0.id]: q0.options[1]!.id });
    const b = await startAttempt(uid, 'detran-am');
    if (!b.ok) throw new Error('resume');
    expect(b.resumed).toBe(true);
    expect(b.attemptId).toBe(a.attemptId);
    expect(b.questions.map((q) => q.id)).toEqual(a.questions.map((q) => q.id));
    expect(b.draftAnswers[q0.id]).toBe(q0.options[1]!.id);
    expect(b.remainingSeconds).toBeLessThanOrEqual(a.remainingSeconds);
    const db = await getDb();
    expect((await db.select().from(schema.attempts)).filter((x) => x.userId === uid)).toHaveLength(1); // não abriu outra
  });

  it('retomar não gasta o simulado grátis do dia', async () => {
    const uid = await user();
    await startAttempt(uid, 'detran-am');
    expect((await startAttempt(uid, 'detran-am')).ok).toBe(true); // retomada
  });

  it('prova com tempo esgotado é corrigida com o que estava salvo e abre-se uma nova', async () => {
    const uid = await user();
    const db = await getDb();
    const a = await startAttempt(uid, 'detran-am');
    if (!a.ok) throw new Error('start');
    await saveDraft(uid, a.attemptId, { [a.questions[0]!.id]: 'a' });
    await db.update(schema.attempts).set({ startedAt: new Date(Date.now() - 3 * 3_600_000) }).where(eq(schema.attempts.id, a.attemptId));
    const b = await startAttempt(uid, 'detran-am');
    // plano grátis: o 1º já gastou o limite do dia, então a nova prova é recusada, mas a antiga foi finalizada
    const [old] = await db.select().from(schema.attempts).where(eq(schema.attempts.id, a.attemptId));
    expect(old!.finishedAt).not.toBeNull();
    expect(b.ok).toBe(false);
    const stats = await getStats(uid);
    expect(stats.stats.get('detran-am')?.attempts).toBe(1);
  });

  it('autosave só vale para prova aberta do próprio usuário', async () => {
    const uid = await user();
    const other = await user();
    const a = await startAttempt(uid, 'detran-am');
    if (!a.ok) throw new Error('start');
    expect(await saveDraft(other, a.attemptId, { x: 'a' })).toBe(false);
    await finishAttempt(uid, a.attemptId, []);
    expect(await saveDraft(uid, a.attemptId, { x: 'a' })).toBe(false);
  });

  it('não respondidas contam como erro', async () => {
    const uid = await user();
    const a = await startAttempt(uid, 'detran-am');
    if (!a.ok) throw new Error('start');
    const r = await finishAttempt(uid, a.attemptId, []);
    expect(r.ok && r.correct).toBe(0);
    expect(r.ok && r.passed).toBe(false);
    expect(r.ok && r.total).toBe(30);
  });
});
