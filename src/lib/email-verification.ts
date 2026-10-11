import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { promoteIfAdmin } from './auth';
import { sendEmail } from './email';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
const TTL_MS = 24 * 60 * 60_000; // o link vale 24 horas
const MAX_PER_HOUR = 3;

/** Envia o link de confirmação. Limita a 3 envios por hora por conta. */
export async function sendVerification(userId: string, appUrl: string): Promise<'sent' | 'already' | 'limited' | 'missing'> {
  const db = await getDb();
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  if (!u || u.deletedAt) return 'missing';
  if (u.emailVerifiedAt) return 'already';
  const recent = await db
    .select({ id: schema.emailVerifications.id })
    .from(schema.emailVerifications)
    .where(and(eq(schema.emailVerifications.userId, userId), gt(schema.emailVerifications.createdAt, new Date(Date.now() - 60 * 60_000))));
  if (recent.length >= MAX_PER_HOUR) return 'limited';
  const token = randomBytes(32).toString('base64url');
  await db.insert(schema.emailVerifications).values({ userId, tokenHash: sha256(token), expiresAt: new Date(Date.now() + TTL_MS) });
  await sendEmail({
    to: u.email,
    subject: 'Confirme seu e-mail no Simulaki',
    text: `Olá, ${u.name.split(' ')[0]}.\n\nPara confirmar seu e-mail, abra o link (vale por 24 horas):\n${appUrl}/verificar-email?token=${token}\n\nSe não foi você que se cadastrou, ignore este e-mail.`,
  });
  return 'sent';
}

export async function validVerificationToken(token: string): Promise<boolean> {
  const db = await getDb();
  const [r] = await db
    .select({ id: schema.emailVerifications.id })
    .from(schema.emailVerifications)
    .where(and(eq(schema.emailVerifications.tokenHash, sha256(token)), isNull(schema.emailVerifications.usedAt), gt(schema.emailVerifications.expiresAt, new Date())))
    .limit(1);
  return !!r;
}

/** Confirma o e-mail (uso único do token). Só depois disso ADMIN_EMAILS pode promover a conta. */
export async function confirmEmail(token: string): Promise<'ok' | 'invalid'> {
  const db = await getDb();
  const used = await db
    .update(schema.emailVerifications)
    .set({ usedAt: new Date() })
    .where(and(eq(schema.emailVerifications.tokenHash, sha256(token)), isNull(schema.emailVerifications.usedAt), gt(schema.emailVerifications.expiresAt, new Date())))
    .returning({ userId: schema.emailVerifications.userId });
  const userId = used[0]?.userId;
  if (!userId) return 'invalid';
  const [u] = await db
    .update(schema.users)
    .set({ emailVerifiedAt: new Date() })
    .where(and(eq(schema.users.id, userId), isNull(schema.users.emailVerifiedAt)))
    .returning({ email: schema.users.email });
  if (u) await promoteIfAdmin(userId, u.email);
  return 'ok';
}

/** Para fluxos que já provam posse do e-mail (Google verificado, redefinição de senha). */
export async function markVerified(userId: string): Promise<void> {
  const db = await getDb();
  const [u] = await db
    .update(schema.users)
    .set({ emailVerifiedAt: new Date() })
    .where(and(eq(schema.users.id, userId), isNull(schema.users.emailVerifiedAt)))
    .returning({ email: schema.users.email });
  if (u) await promoteIfAdmin(userId, u.email);
}
