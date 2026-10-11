import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { finishAttempt } from '@/lib/attempts';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Faça login para continuar.' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    attemptId?: string;
    answers?: { questionId: string; selectedOptionId: string | null }[];
  };
  if (!body.attemptId || !Array.isArray(body.answers)) return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 });
  try {
    const r = await finishAttempt(user.id, body.attemptId, body.answers);
    if (!r.ok) return NextResponse.json({ error: r.reason }, { status: 400 });
    return NextResponse.json(r);
  } catch {
    return NextResponse.json({ error: 'Não foi possível finalizar.' }, { status: 409 });
  }
}
