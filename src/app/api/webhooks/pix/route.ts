import { NextResponse } from 'next/server';
import { getDb, schema } from '@/db';
import { confirmPayment } from '@/lib/billing';
import { verifySignature } from '@/lib/payments/provider';

export const dynamic = 'force-dynamic';

/**
 * Webhook de confirmação de Pix. Formato provisório (do provedor de teste); ao ligar o gateway real
 * só o parse do corpo e o nome do cabeçalho da assinatura mudam.
 * Corpo: { eventId, type: 'pix.paid', chargeId, amountCents }
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const secret = process.env.PAYMENT_WEBHOOK_SECRET ?? '';
  if (!verifySignature(raw, req.headers.get('x-signature'), secret)) {
    return NextResponse.json({ error: 'assinatura inválida' }, { status: 401 });
  }
  let evt: { eventId?: string; type?: string; chargeId?: string; amountCents?: number };
  try {
    evt = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'corpo inválido' }, { status: 400 });
  }
  if (!evt.eventId || !evt.chargeId) return NextResponse.json({ error: 'campos ausentes' }, { status: 400 });

  const db = await getDb();
  const inserted = await db
    .insert(schema.webhookEvents)
    .values({ provider: process.env.PAYMENT_GATEWAY ?? 'mock', eventId: evt.eventId, payload: evt })
    .onConflictDoNothing()
    .returning({ id: schema.webhookEvents.id });
  if (inserted.length === 0) return NextResponse.json({ ok: true, duplicate: true }); // já processado

  if (evt.type === 'pix.paid') {
    const result = await confirmPayment(evt.chargeId, evt.amountCents);
    return NextResponse.json({ ok: result === 'confirmed' || result === 'already', result });
  }
  return NextResponse.json({ ok: true, ignored: true });
}
