'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getDb, schema } from '@/db';
import { requireAdmin } from '@/lib/auth';
import { normalizeCode } from '@/lib/billing';
import { resolveFeedback } from '@/lib/feedback';

const back = (msg: string, kind: 'erro' | 'ok' = 'erro'): never => redirect(`/admin/cupons?${kind}=${encodeURIComponent(msg)}`);

export async function createCouponAction(form: FormData) {
  const admin = await requireAdmin();
  if (!admin) redirect('/');
  const code = normalizeCode(String(form.get('code') ?? ''));
  const type = String(form.get('type') ?? '');
  const value = Number(form.get('value'));
  const maxUses = String(form.get('maxUses') ?? '').trim();
  const validUntil = String(form.get('validUntil') ?? '').trim();
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) back('Código: 3 a 32 letras, números, _ ou -.');
  if (!['free_days', 'percent', 'amount'].includes(type)) back('Tipo inválido.');
  if (!Number.isFinite(value) || value <= 0) back('Informe um valor maior que zero.');
  if (type === 'percent' && value > 100) back('Desconto máximo é 100%.');
  const max = maxUses ? Number(maxUses) : null;
  if (max !== null && (!Number.isInteger(max) || max < 1)) back('Limite de usos inválido.');
  const db = await getDb();
  const [dup] = await db.select({ id: schema.coupons.id }).from(schema.coupons).where(eq(schema.coupons.code, code)).limit(1);
  if (dup) back('Já existe um cupom com esse código.');
  await db.insert(schema.coupons).values({
    code,
    freeDays: type === 'free_days' ? Math.round(value) : null,
    percentOff: type === 'percent' ? Math.round(value) : null,
    amountOffCents: type === 'amount' ? Math.round(value * 100) : null,
    maxUses: max,
    validUntil: validUntil ? new Date(`${validUntil}T23:59:59-04:00`) : null,
    description: String(form.get('description') ?? '').trim() || null,
  });
  await db.insert(schema.auditLogs).values({ actorId: admin.id, action: 'coupon.create', entity: 'coupon', entityId: code, after: { type, value, maxUses: max } });
  revalidatePath('/admin/cupons');
  back(`Cupom ${code} criado.`, 'ok');
}

export async function toggleCouponAction(form: FormData) {
  const admin = await requireAdmin();
  if (!admin) redirect('/');
  const id = String(form.get('id'));
  const active = form.get('active') === '1';
  const db = await getDb();
  await db.update(schema.coupons).set({ active }).where(eq(schema.coupons.id, id));
  revalidatePath('/admin/cupons');
}

export async function resolveFeedbackAction(form: FormData) {
  if (!(await requireAdmin())) redirect('/');
  await resolveFeedback(String(form.get('id') ?? ''));
  revalidatePath('/admin/questoes');
}
