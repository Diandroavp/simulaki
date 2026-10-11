'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { acceptInvite, cancelInvite, declineInvite, inviteStudent, leavePartner, managedOrg, removeStudent } from '@/lib/partners';

const back = (msg: string, kind: 'erro' | 'ok' = 'erro'): never => redirect(`/parceiro?${kind}=${encodeURIComponent(msg)}`);

async function manager() {
  const u = await getCurrentUser();
  if (!u) redirect('/entrar');
  const org = await managedOrg(u!.id);
  if (!org) redirect('/');
  return { u: u!, org: org! };
}

export async function inviteAction(form: FormData) {
  const { u, org } = await manager();
  const emails = String(form.get('emails') ?? '').split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean).slice(0, 50);
  if (emails.length === 0) back('Informe ao menos um e-mail.');
  let ok = 0;
  const problems: string[] = [];
  for (const e of emails) {
    const r = await inviteStudent(u.id, org.id, e);
    if (r.ok) ok++;
    else problems.push(`${e}: ${r.reason}`);
  }
  revalidatePath('/parceiro');
  if (problems.length) back(`${ok} convite(s) enviado(s). Não enviados: ${problems.join(' | ')}`);
  back(`${ok} convite(s) enviado(s).`, 'ok');
}

export async function removeStudentAction(form: FormData) {
  const { u, org } = await manager();
  await removeStudent(u.id, org.id, String(form.get('userId')));
  revalidatePath('/parceiro');
}

export async function cancelInviteAction(form: FormData) {
  const { u, org } = await manager();
  await cancelInvite(u.id, org.id, String(form.get('inviteId')));
  revalidatePath('/parceiro');
}

// ---- lado do aluno ----
export async function acceptInviteAction(form: FormData) {
  const u = await getCurrentUser();
  if (!u) redirect('/entrar');
  await acceptInvite(u!.id, u!.email, String(form.get('inviteId')));
  redirect('/app');
}

export async function declineInviteAction(form: FormData) {
  const u = await getCurrentUser();
  if (!u) redirect('/entrar');
  await declineInvite(u!.email, String(form.get('inviteId')));
  redirect('/app');
}

export async function leavePartnerAction(form: FormData) {
  const u = await getCurrentUser();
  if (!u) redirect('/entrar');
  await leavePartner(u!.id, String(form.get('orgId')));
  redirect('/app');
}
