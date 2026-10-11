import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { saveDraft } from '@/lib/attempts';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'não autenticado' }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { attemptId?: string; answers?: Record<string, string> };
  if (!b.attemptId || !b.answers || typeof b.answers !== 'object') return NextResponse.json({ error: 'pedido inválido' }, { status: 400 });
  return NextResponse.json({ ok: await saveDraft(user.id, b.attemptId, b.answers) });
}
