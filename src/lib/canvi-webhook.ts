import { createHash, timingSafeEqual } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { confirmPayment } from './billing';
import { getPixProvider } from './payments/provider';

/** Comparação em tempo constante do segredo que vai na URL do webhook. */
export function secretMatches(given: string, expected: string | undefined): boolean {
  if (!expected || expected.length < 16) return false;
  const a = createHash('sha256').update(given).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

/**
 * O formato exato do aviso da Canvi não está na documentação pública, então procuramos
 * ids de cobrança em campos conhecidos e, para cada um que pertença a um pagamento nosso,
 * CONFIRMAMOS NA API da Canvi antes de liberar acesso. O aviso é só um gatilho.
 */
export function candidateIds(payload: unknown): string[] {
  const ids = new Set<string>();
  const keys = ['id_invoice_pix', 'idInvoicePix', 'id_transacao', 'id'];
  const visit = (o: unknown, depth = 0) => {
    if (!o || typeof o !== 'object' || depth > 3) return;
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
      if (keys.includes(k) && (typeof v === 'string' || typeof v === 'number')) ids.add(String(v));
      else if (typeof v === 'object') visit(v, depth + 1);
    }
  };
  visit(payload);
  return [...ids].slice(0, 10);
}

export async function handleCanviNotification(payload: unknown): Promise<{ confirmed: string[]; checked: number }> {
  const ids = candidateIds(payload);
  if (ids.length === 0) return { confirmed: [], checked: 0 };
  const db = await getDb();
  const mine = await db.select().from(schema.payments).where(inArray(schema.payments.gatewayId, ids));
  const provider = getPixProvider();
  const confirmed: string[] = [];
  for (const pay of mine) {
    if (pay.status !== 'pending' || !pay.gatewayId) continue;
    const charge = await provider.getCharge(pay.gatewayId);
    if (charge.status === 'paid' && (await confirmPayment(pay.gatewayId, charge.amountCents)) === 'confirmed') confirmed.push(pay.gatewayId);
  }
  return { confirmed, checked: mine.length };
}

/** Fallback sem webhook: consulta uma cobrança pendente e confirma se paga. */
export async function reconcilePayment(paymentId: string): Promise<'paid' | 'pending' | 'expired'> {
  const db = await getDb();
  const [pay] = await db.select().from(schema.payments).where(eq(schema.payments.id, paymentId)).limit(1);
  if (!pay) return 'pending';
  if (pay.status === 'paid') return 'paid';
  if (!pay.gatewayId) return 'pending';
  const charge = await getPixProvider().getCharge(pay.gatewayId);
  if (charge.status === 'paid') {
    const r = await confirmPayment(pay.gatewayId, charge.amountCents);
    return r === 'confirmed' || r === 'already' ? 'paid' : 'pending';
  }
  return charge.status === 'expired' || charge.status === 'canceled' ? 'expired' : 'pending';
}
