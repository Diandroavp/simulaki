import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

process.env.PGLITE_DIR = 'memory://';
process.env.ADMIN_EMAILS = 'chefe@t.com';
const { getDb, schema } = await import('@/db');
const { outbox } = await import('./email');
const { promoteIfAdmin } = await import('./auth');
const { confirmEmail, markVerified, sendVerification, validVerificationToken } = await import('./email-verification');
const { startCheckout } = await import('./billing');
const { acceptInvite } = await import('./partners');
const { applyReset, requestReset } = await import('./password-reset');

async function mk(email: string) {
  const db = await getDb();
  const [u] = await db.insert(schema.users).values({ name: 'Zé Silva', email }).returning();
  return u!;
}
const tok = () => outbox.at(-1)!.text.match(/token=([\w-]+)/)![1]!;
const role = async (id: string) => (await (await getDb()).select().from(schema.users).where(eq(schema.users.id, id)))[0]!.role;

describe('verificação de e-mail', () => {
  it('fluxo: envia, confirma uma vez só', async () => {
    const u = await mk('ze@t.com');
    expect(await sendVerification(u.id, 'https://simulaki.com')).toBe('sent');
    expect(outbox.at(-1)!.to).toBe('ze@t.com');
    const t = tok();
    expect(await validVerificationToken(t)).toBe(true);
    expect(await confirmEmail(t)).toBe('ok');
    expect(await confirmEmail(t)).toBe('invalid');
    expect(await sendVerification(u.id, 'x')).toBe('already');
  });

  it('limita a 3 envios por hora', async () => {
    const u = await mk('limite@t.com');
    for (let i = 0; i < 3; i++) expect(await sendVerification(u.id, 'x')).toBe('sent');
    expect(await sendVerification(u.id, 'x')).toBe('limited');
  });

  it('ADMIN_EMAILS só promove depois de verificar o e-mail', async () => {
    const u = await mk('chefe@t.com');
    await promoteIfAdmin(u.id, 'chefe@t.com');
    expect(await role(u.id)).toBe('student'); // cadastro com e-mail alheio não vira admin
    await sendVerification(u.id, 'x');
    await confirmEmail(tok());
    expect(await role(u.id)).toBe('admin');
  });

  it('sem e-mail verificado não assina, não usa cupom e não aceita convite', async () => {
    const u = await mk('semverif@t.com');
    const r = await startCheckout(u.id, 'passe-60');
    expect(r.ok).toBe(false);
    expect(await acceptInvite(u.id, u.email, '00000000-0000-0000-0000-000000000000')).toBe('unverified');
  });

  it('Google (markVerified) e redefinição de senha também verificam', async () => {
    const g = await mk('g@t.com');
    await markVerified(g.id);
    const db = await getDb();
    expect((await db.select().from(schema.users).where(eq(schema.users.id, g.id)))[0]!.emailVerifiedAt).not.toBeNull();

    const r = await mk('reset@t.com');
    await requestReset('reset@t.com', 'x');
    expect(await applyReset(tok(), 'senhanova123')).toBe('ok');
    expect((await db.select().from(schema.users).where(eq(schema.users.id, r.id)))[0]!.emailVerifiedAt).not.toBeNull();
  });
});
