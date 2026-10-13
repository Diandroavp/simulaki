'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getDb, schema } from '@/db';
import { requireAdmin } from '@/lib/auth';
import { normalizeCode } from '@/lib/billing';
import { resolveFeedback } from '@/lib/feedback';
import { decidir, pendentesDoCaderno, type Decisao } from '@/lib/enem-review';

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

async function revisarEnem(form: FormData, forcada?: Decisao) {
  const admin = await requireAdmin();
  if (!admin) redirect('/');
  const caderno = String(form.get('caderno') ?? '');
  const volta = String(form.get('volta') ?? `/admin/enem?c=${caderno}`);
  const decisao = forcada ?? String(form.get('decisao') ?? '');
  if (!['published', 'archived', 'pending'].includes(decisao)) redirect(volta);
  const escopo = String(form.get('escopo') ?? 'ids');
  let ids = form.getAll('id').map(String);
  if (escopo === 'caderno-pendentes') {
    // "Aprovar todas" exige digitar o caderno para confirmar.
    if (String(form.get('confirma') ?? '').trim() !== caderno) redirect(`${volta}${volta.includes('?') ? '&' : '?'}erro=${encodeURIComponent('Digite o código do caderno para confirmar.')}`);
    ids = await pendentesDoCaderno(caderno);
  }
  const n = await decidir(ids, decisao as Decisao, admin.id);
  if (n > 0) await getDb().then((db) => db.insert(schema.auditLogs).values({ actorId: admin.id, action: 'enem.review', entity: 'question_bank', entityId: caderno || 'enem', after: { decisao, escopo, n } }));
  revalidatePath('/admin/enem');
  revalidatePath('/');
  redirect(`${volta}${volta.includes('?') ? '&' : '?'}ok=${encodeURIComponent(`${n} questão(ões) atualizada(s).`)}`);
}

export async function revisarEnemAction(form: FormData) { return revisarEnem(form); }
export async function publicarEnemAction(form: FormData) { return revisarEnem(form, 'published'); }
export async function rejeitarEnemAction(form: FormData) { return revisarEnem(form, 'archived'); }
export async function pendenteEnemAction(form: FormData) { return revisarEnem(form, 'pending'); }
