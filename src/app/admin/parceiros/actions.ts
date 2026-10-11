'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { createPartner, grantOrgPlan } from '@/lib/partners';

const back = (msg: string, kind: 'erro' | 'ok' = 'erro'): never => redirect(`/admin/parceiros?${kind}=${encodeURIComponent(msg)}`);

export async function createPartnerAction(form: FormData) {
  if (!(await requireAdmin())) redirect('/');
  const type = form.get('type') === 'instructor' ? 'instructor' : 'cfc';
  const r = await createPartner({ name: String(form.get('name') ?? ''), type, ownerEmail: String(form.get('ownerEmail') ?? ''), stateCode: String(form.get('state') ?? '') });
  revalidatePath('/admin/parceiros');
  if (!r.ok) back(r.reason);
  back('Parceiro criado.', 'ok');
}

export async function grantPlanAction(form: FormData) {
  if (!(await requireAdmin())) redirect('/');
  const r = await grantOrgPlan(String(form.get('orgId')), String(form.get('plan')), Number(form.get('days')));
  revalidatePath('/admin/parceiros');
  if (!r.ok) back(r.reason);
  back('Plano liberado.', 'ok');
}
