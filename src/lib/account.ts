import { and, eq, inArray } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { managedOrg } from './partners';

/** LGPD, art. 18: cópia dos dados do próprio usuário. */
export async function exportUserData(userId: string) {
  const db = await getDb();
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  if (!u) return null;
  const attempts = await db.select().from(schema.attempts).where(eq(schema.attempts.userId, userId));
  const answers = attempts.length
    ? await db.select().from(schema.attemptAnswers).where(inArray(schema.attemptAnswers.attemptId, attempts.map((a) => a.id)))
    : [];
  const payments = await db.select().from(schema.payments).where(eq(schema.payments.userId, userId));
  const subs = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.ownerUserId, userId));
  const members = await db.select().from(schema.memberships).where(eq(schema.memberships.userId, userId));
  return {
    geradoEm: new Date().toISOString(),
    conta: { nome: u.name, email: u.email, estado: u.stateCode, dataDaProva: u.examDate, aceitaNovidades: u.marketingConsent, emailConfirmadoEm: u.emailVerifiedAt, criadaEm: u.createdAt },
    simulados: attempts.map((a) => ({ ...a, questionIds: undefined, draftAnswers: undefined, respostas: answers.filter((r) => r.attemptId === a.id) })),
    pagamentos: payments.map((p) => ({ id: p.id, valorCentavos: p.amountCents, status: p.status, metodo: p.method, criadoEm: p.createdAt })),
    assinaturas: subs,
    vinculosComParceiros: members,
  };
}

/**
 * Exclui a conta: apaga dados de identificação e anonimiza o registro.
 * Pagamentos ficam (obrigação fiscal) ligados ao registro já anonimizado; simulados ficam sem identificação.
 */
export async function deleteAccount(userId: string): Promise<'ok' | 'is_manager' | 'not_found'> {
  const db = await getDb();
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  if (!u || u.deletedAt) return 'not_found';
  if (await managedOrg(userId)) return 'is_manager';
  await db.transaction(async (tx) => {
    await tx.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
    await tx.delete(schema.passwordResets).where(eq(schema.passwordResets.userId, userId));
    await tx.delete(schema.emailVerifications).where(eq(schema.emailVerifications.userId, userId));
    await tx.delete(schema.memberships).where(eq(schema.memberships.userId, userId));
    await tx.delete(schema.orgInvites).where(eq(schema.orgInvites.email, u.email));
    await tx.delete(schema.waitlist).where(eq(schema.waitlist.email, u.email));
    await tx.delete(schema.loginFailures).where(eq(schema.loginFailures.key, u.email));
    await tx.update(schema.questionFeedback).set({ userId: null }).where(eq(schema.questionFeedback.userId, userId));
    await tx
      .update(schema.users)
      .set({ name: 'Conta excluída', email: `excluida-${userId}@invalid.simulaki`, passwordHash: null, googleSub: null, stateCode: null, examDate: null, marketingConsent: false, referralCode: null, deletedAt: new Date() })
      .where(and(eq(schema.users.id, userId)));
  });
  return 'ok';
}
