import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { hashPassword } from './auth';
import { sendEmail } from './email';
import { MAX_FAILURES, WINDOW_MS } from './ratelimit';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
const TTL_MS = 60 * 60_000; // o link vale 1 hora
const MAX_REQUESTS_PER_HOUR = 3;

/**
 * Pede a redefinição. Sempre "dá certo" para quem pede (não revela se o e-mail existe).
 * Limita pedidos por e-mail para não virar canal de spam.
 */
export async function requestReset(email: string, appUrl: string): Promise<void> {
  const db = await getDb();
  const key = `reset:${email}`;
  const recent = await db
    .select({ id: schema.loginFailures.id })
    .from(schema.loginFailures)
    .where(and(eq(schema.loginFailures.key, key), gt(schema.loginFailures.createdAt, new Date(Date.now() - 60 * 60_000))));
  if (recent.length >= MAX_REQUESTS_PER_HOUR) return;
  await db.insert(schema.loginFailures).values({ key });

  const [u] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (!u || u.deletedAt) return;
  const token = randomBytes(32).toString('base64url');
  await db.insert(schema.passwordResets).values({ userId: u.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + TTL_MS) });
  await sendEmail({
    to: email,
    subject: 'Redefinir sua senha no Simulaki',
    text: `Olá, ${u.name.split(' ')[0]}.\n\nPara criar uma nova senha, abra o link (vale por 1 hora):\n${appUrl}/redefinir-senha?token=${token}\n\nSe não foi você, ignore este e-mail: sua senha continua a mesma.`,
  });
}

export async function validToken(token: string): Promise<boolean> {
  const db = await getDb();
  const [r] = await db
    .select({ id: schema.passwordResets.id })
    .from(schema.passwordResets)
    .where(and(eq(schema.passwordResets.tokenHash, sha256(token)), isNull(schema.passwordResets.usedAt), gt(schema.passwordResets.expiresAt, new Date())))
    .limit(1);
  return !!r;
}

/** Troca a senha com o token (uso único), encerra todas as sessões e zera o bloqueio de login. */
export async function applyReset(token: string, newPassword: string): Promise<'ok' | 'invalid' | 'weak'> {
  if (newPassword.length < 8) return 'weak';
  const db = await getDb();
  return db.transaction(async (tx) => {
    const used = await tx
      .update(schema.passwordResets)
      .set({ usedAt: new Date() })
      .where(and(eq(schema.passwordResets.tokenHash, sha256(token)), isNull(schema.passwordResets.usedAt), gt(schema.passwordResets.expiresAt, new Date())))
      .returning({ userId: schema.passwordResets.userId });
    const userId = used[0]?.userId;
    if (!userId) return 'invalid';
    // quem recebeu o link no e-mail provou que é dono dele
    const [u] = await tx.update(schema.users).set({ passwordHash: hashPassword(newPassword), emailVerifiedAt: sql`coalesce(${schema.users.emailVerifiedAt}, now())` }).where(eq(schema.users.id, userId)).returning({ email: schema.users.email });
    await tx.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
    if (u) await tx.delete(schema.loginFailures).where(eq(schema.loginFailures.key, u.email));
    return 'ok';
  });
}

export const _limits = { MAX_FAILURES, WINDOW_MS };
