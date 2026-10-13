import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { answerTreino } from '@/lib/treino';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Faça login para continuar.' }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { attemptId?: string; questionId?: string; optionId?: string };
  if (!b.attemptId || !b.questionId || !b.optionId) return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 });
  const r = await answerTreino(user.id, b.attemptId, b.questionId, b.optionId);
  if (!r.ok) return NextResponse.json({ error: r.reason }, { status: 400 });
  return NextResponse.json(r);
}
