'use server';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { getDb, schema } from '@/db';
import { createSession, destroySession, getCurrentUser, hashPassword, promoteIfAdmin, verifyPassword } from '@/lib/auth';
import { simulatePaid, startCheckout } from '@/lib/billing';
import { isLockedOut, recordFailure, clearFailures } from '@/lib/ratelimit';
import { applyReset, requestReset } from '@/lib/password-reset';
import { confirmEmail, sendVerification } from '@/lib/email-verification';

const appUrl = () => process.env.APP_URL ?? 'http://localhost:3000';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const err = (path: string, msg: string): never => redirect(`${path}?erro=${encodeURIComponent(msg)}`);
const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

export async function signupAction(form: FormData) {
  const name = str(form, 'name');
  const email = str(form, 'email').toLowerCase();
  const password = String(form.get('password') ?? '');
  if (name.length < 2) err('/cadastro', 'Informe seu nome.');
  if (!EMAIL.test(email)) err('/cadastro', 'E-mail inválido.');
  if (password.length < 8) err('/cadastro', 'A senha precisa ter pelo menos 8 caracteres.');
  if (form.get('terms') !== 'on') err('/cadastro', 'Aceite os termos para continuar.');
  const db = await getDb();
  const [exists] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (exists) err('/cadastro', 'Este e-mail já tem cadastro. Entre com sua senha ou com o Google.');
  const [u] = await db
    .insert(schema.users)
    .values({ name, email, passwordHash: hashPassword(password), marketingConsent: form.get('marketing') === 'on' })
    .returning({ id: schema.users.id });
  await createSession(u!.id);
  await sendVerification(u!.id, appUrl());
  redirect('/app?verifique=1');
}

export async function loginAction(form: FormData) {
  const email = str(form, 'email').toLowerCase();
  const password = String(form.get('password') ?? '');
  const db = await getDb();
  if (await isLockedOut(email)) err('/entrar', 'Muitas tentativas. Aguarde 15 minutos e tente de novo.');
  const [u] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  // mesma mensagem para e-mail inexistente e senha errada
  if (!u || u.deletedAt || !verifyPassword(password, u.passwordHash)) {
    await recordFailure(email);
    err('/entrar', 'E-mail ou senha incorretos.');
  }
  await clearFailures(email);
  await promoteIfAdmin(u!.id, email);
  await createSession(u!.id);
  redirect('/app');
}

export async function logoutAction() {
  await destroySession();
  redirect('/');
}

export async function checkoutAction(form: FormData) {
  const user = await getCurrentUser();
  const plan = str(form, 'plan');
  if (!user) redirect(`/entrar?erro=${encodeURIComponent('Entre para assinar.')}`);
  const r = await startCheckout(user!.id, plan, str(form, 'coupon'));
  if (!r.ok) err(`/assinar/${plan}`, r.reason);
  if ('free' in r! && r.free) redirect('/app?cupom=ok');
  redirect(`/pagamento/${(r as { paymentId: string }).paymentId}`);
}

/** Só em desenvolvimento com o provedor de teste: finge que o Pix foi pago. */
export async function simulatePaymentAction(form: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect('/entrar');
  await simulatePaid(user!.id, str(form, 'paymentId'));
  redirect(`/pagamento/${str(form, 'paymentId')}`);
}

export async function forgotPasswordAction(form: FormData) {
  const email = str(form, 'email').toLowerCase();
  if (EMAIL.test(email)) await requestReset(email, process.env.APP_URL ?? 'http://localhost:3000');
  redirect('/esqueci-senha?enviado=1'); // mesma resposta exista ou não a conta
}

export async function resetPasswordAction(form: FormData) {
  const token = str(form, 'token');
  const password = String(form.get('password') ?? '');
  const r = await applyReset(token, password);
  if (r === 'weak') redirect(`/redefinir-senha?token=${encodeURIComponent(token)}&erro=${encodeURIComponent('A senha precisa ter pelo menos 8 caracteres.')}`);
  if (r === 'invalid') redirect(`/redefinir-senha?erro=${encodeURIComponent('Link inválido ou expirado. Peça um novo.')}`);
  redirect('/entrar?ok=' + encodeURIComponent('Senha alterada. Entre com a nova senha.'));
}

export async function confirmEmailAction(form: FormData) {
  const token = str(form, 'token');
  const r = await confirmEmail(token);
  if (r === 'invalid') redirect(`/verificar-email?erro=${encodeURIComponent('Link inválido ou expirado. Peça um novo dentro do app.')}`);
  redirect('/app?verificado=1');
}

export async function resendVerificationAction() {
  const u = await getCurrentUser();
  if (!u) redirect('/entrar');
  const r = await sendVerification(u!.id, appUrl());
  redirect(`/app?${r === 'limited' ? 'verifique=limite' : r === 'already' ? 'verificado=1' : 'verifique=1'}`);
}
