import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

process.env.PGLITE_DIR = 'memory://';
const { getDb, schema } = await import('@/db');
const { hashPassword, verifyPassword } = await import('./auth');
const { outbox } = await import('./email');
const { applyReset, requestReset, validToken } = await import('./password-reset');

async function mkUser(email: string) {
  const db = await getDb();
  const [u] = await db.insert(schema.users).values({ emailVerifiedAt: new Date(), name: 'Maria Silva', email, passwordHash: hashPassword('senhaantiga1') }).returning();
  return u!;
}
const tokenFromMail = (i = -1) => outbox.at(i)!.text.match(/token=([\w-]+)/)![1]!;

describe('recuperação de senha', () => {
  it('fluxo completo: pede, recebe o link, troca a senha, token não vale de novo e sessões caem', async () => {
    const u = await mkUser('maria@t.com');
    const db = await getDb();
    await db.insert(schema.sessions).values({ userId: u.id, tokenHash: 'x', expiresAt: new Date(Date.now() + 1e6) });
    await requestReset('maria@t.com', 'https://simulaki.com');
    expect(outbox.at(-1)!.to).toBe('maria@t.com');
    expect(outbox.at(-1)!.text).toContain('https://simulaki.com/redefinir-senha?token=');
    const token = tokenFromMail();
    expect(await validToken(token)).toBe(true);
    expect(await applyReset(token, 'senhanova123')).toBe('ok');
    const [after] = await db.select().from(schema.users).where(eq(schema.users.id, u.id));
    expect(verifyPassword('senhanova123', after!.passwordHash)).toBe(true);
    expect(verifyPassword('senhaantiga1', after!.passwordHash)).toBe(false);
    expect(await applyReset(token, 'outrasenha123')).toBe('invalid'); // uso único
    expect((await db.select().from(schema.sessions)).filter((s) => s.userId === u.id)).toHaveLength(0);
  });

  it('e-mail inexistente não envia nada e não revela a diferença', async () => {
    const before = outbox.length;
    await requestReset('ninguem@t.com', 'https://simulaki.com');
    expect(outbox.length).toBe(before);
  });

  it('senha fraca é recusada sem gastar o token; token expirado e inventado não valem', async () => {
    await mkUser('joao@t.com');
    await requestReset('joao@t.com', 'https://simulaki.com');
    const token = tokenFromMail();
    expect(await applyReset(token, 'curta')).toBe('weak');
    expect(await validToken(token)).toBe(true);
    const db = await getDb();
    await db.update(schema.passwordResets).set({ expiresAt: new Date(Date.now() - 1000) });
    expect(await validToken(token)).toBe(false);
    expect(await applyReset(token, 'senhanova123')).toBe('invalid');
    expect(await applyReset('inventado', 'senhanova123')).toBe('invalid');
  });

  it('limita a 3 pedidos por hora por e-mail', async () => {
    await mkUser('lim@t.com');
    const before = outbox.length;
    for (let i = 0; i < 6; i++) await requestReset('lim@t.com', 'https://simulaki.com');
    expect(outbox.length - before).toBe(3);
  });
});
