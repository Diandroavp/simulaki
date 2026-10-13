import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getDb, schema } from '@/db';
import { handleCanviNotification, secretMatches } from '@/lib/canvi-webhook';

export const dynamic = 'force-dynamic';

/** Verificação de URL (GET/HEAD): confirma que o endereço existe e o segredo confere. Não altera nada. */
export async function GET(_: Request, { params }: { params: Promise<{ secret: string }> }) {
  const { secret } = await params;
  if (!secretMatches(secret, process.env.CANVI_WEBHOOK_SECRET)) return NextResponse.json({ error: 'não autorizado' }, { status: 401 });
  return NextResponse.json({ ok: true });
}
export const HEAD = GET;

/**
 * Webhook da Canvi. Configure a URL (com o segredo no caminho) via POST /bt/configurar_webhook,
 * tipo_transacao "pixCashin", type "json". Veja scripts/canvi-setup-webhook.mjs.
 */
export async function POST(req: Request, { params }: { params: Promise<{ secret: string }> }) {
  const { secret } = await params;
  if (!secretMatches(secret, process.env.CANVI_WEBHOOK_SECRET)) return NextResponse.json({ error: 'não autorizado' }, { status: 401 });

  const raw = await req.text();
  let payload: unknown;
  const ct = req.headers.get('content-type') ?? '';
  try {
    payload = ct.includes('json') ? JSON.parse(raw) : Object.fromEntries(new URLSearchParams(raw));
  } catch {
    return NextResponse.json({ error: 'corpo inválido' }, { status: 400 });
  }

  const db = await getDb();
  // Registra cada aviso (dedup por hash do corpo). Reprocessar é inofensivo: confirmar é idempotente.
  const eventId = createHash('sha256').update(raw).digest('hex');
  await db.insert(schema.webhookEvents).values({ provider: 'canvi', eventId, payload: payload as object }).onConflictDoNothing();

  try {
    const r = await handleCanviNotification(payload);
    return NextResponse.json({ ok: true, ...r });
  } catch {
    // 500 faz a Canvi reenviar (3 tentativas, a cada 15 min)
    return NextResponse.json({ error: 'falha ao processar' }, { status: 500 });
  }
}
