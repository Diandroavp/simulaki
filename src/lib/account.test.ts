import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

process.env.PGLITE_DIR = 'memory://';
const { getDb, schema } = await import('@/db');
const { deleteAccount, exportUserData } = await import('./account');
const { reportQuestion, openFeedback, resolveFeedback } = await import('./feedback');

async function mk(email: string) {
  const db = await getDb();
  const [u] = await db.insert(schema.users).values({ name: 'Ana Souza', email, passwordHash: 'x', emailVerifiedAt: new Date() }).returning();
  await db.insert(schema.sessions).values({ userId: u!.id, tokenHash: 't' + email, expiresAt: new Date(Date.now() + 1e6) });
  return u!;
}

describe('conta (LGPD)', () => {
  it('exporta os dados do usuário', async () => {
    const u = await mk('ana@t.com');
    const d = await exportUserData(u.id);
    expect(d?.conta.email).toBe('ana@t.com');
    expect(JSON.stringify(d)).not.toContain('passwordHash');
  });

  it('exclui: anonimiza, encerra sessões e libera o e-mail', async () => {
    const u = await mk('bia@t.com');
    expect(await deleteAccount(u.id)).toBe('ok');
    const db = await getDb();
    const [after] = await db.select().from(schema.users).where(eq(schema.users.id, u.id));
    expect(after!.email).not.toContain('bia@t.com');
    expect(after!.name).toBe('Conta excluída');
    expect(after!.passwordHash).toBeNull();
    expect(after!.deletedAt).not.toBeNull();
    expect(await db.select().from(schema.sessions).where(eq(schema.sessions.userId, u.id))).toHaveLength(0);
    expect(await deleteAccount(u.id)).toBe('not_found');
    await mk('bia@t.com'); // pode se cadastrar de novo com o mesmo e-mail
  });
});

describe('avisos de erro em questões', () => {
  it('grava, lista e resolve; valida texto e limita por dia', async () => {
    const u = await mk('c@t.com');
    expect(await reportQuestion(u.id, 'am-leg-0001', 'ab')).toBe('invalid');
    expect(await reportQuestion(u.id, 'am-leg-0001', 'O gabarito parece errado')).toBe('ok');
    const open = await openFeedback();
    expect(open.some((f) => f.questionId === 'am-leg-0001')).toBe(true);
    await resolveFeedback(open[0]!.id);
    expect((await openFeedback()).find((f) => f.id === open[0]!.id)).toBeUndefined();
    for (let i = 0; i < 19; i++) await reportQuestion(u.id, 'am-leg-0002', 'texto do aviso ' + i);
    expect(await reportQuestion(u.id, 'am-leg-0003', 'mais um aviso')).toBe('limit');
  });
});
