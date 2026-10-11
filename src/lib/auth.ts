import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { and, eq, gt, isNotNull } from 'drizzle-orm';
import { getDb, schema } from '@/db';

const COOKIE = 'sk_session';
const SESSION_DAYS = 30;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored) return false;
  const [kind, saltB64, hashB64] = stored.split('$');
  if (kind !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = scryptSync(password, Buffer.from(saltB64, 'base64'), expected.length);
  return timingSafeEqual(actual, expected);
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export async function createSession(userId: string) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const db = await getDb();
  await db.insert(schema.sessions).values({ userId, tokenHash: sha256(token), expiresAt });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(schema.sessions).where(eq(schema.sessions.tokenHash, sha256(token)));
  }
  jar.delete(COOKIE);
}

export type CurrentUser = { id: string; name: string; email: string; role: string; emailVerified: boolean };

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const rows = await db
    .select({ id: schema.users.id, name: schema.users.name, email: schema.users.email, role: schema.users.role, verifiedAt: schema.users.emailVerifiedAt })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.tokenHash, sha256(token)), gt(schema.sessions.expiresAt, new Date())))
    .limit(1);
  const r = rows[0];
  return r ? { id: r.id, name: r.name, email: r.email, role: r.role, emailVerified: !!r.verifiedAt } : null;
}

/** E-mails em ADMIN_EMAILS (separados por vírgula) viram administradores ao entrar. */
export async function promoteIfAdmin(userId: string, email: string) {
  const admins = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!admins.includes(email.toLowerCase())) return;
  const db = await getDb();
  // só promove com e-mail verificado: senão qualquer um poderia se cadastrar com o e-mail do admin
  await db
    .update(schema.users)
    .set({ role: 'admin' })
    .where(and(eq(schema.users.id, userId), isNotNull(schema.users.emailVerifiedAt)));
}

export async function requireAdmin(): Promise<CurrentUser | null> {
  const u = await getCurrentUser();
  return u && (u.role === 'admin' || u.role === 'staff') ? u : null;
}
