import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { reconcilePayment } from '@/lib/canvi-webhook';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'não autenticado' }, { status: 401 });
  const { id } = await params;
  const db = await getDb();
  const [p] = await db
    .select({ status: schema.payments.status })
    .from(schema.payments)
    .where(and(eq(schema.payments.id, id), eq(schema.payments.userId, user.id)))
    .limit(1);
  if (!p) return NextResponse.json({ error: 'não encontrado' }, { status: 404 });
  // Sem depender só do webhook: com a Canvi, consulta a cobrança enquanto o aluno espera.
  if (p.status === 'pending' && process.env.PAYMENT_GATEWAY === 'canvi') {
    try {
      return NextResponse.json({ status: (await reconcilePayment(id)) === 'paid' ? 'paid' : p.status });
    } catch {
      /* gateway indisponível: segue pendente */
    }
  }
  return NextResponse.json({ status: p.status });
}
