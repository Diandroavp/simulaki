import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { reportQuestion } from '@/lib/feedback';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Entre para enviar o aviso.' }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { questionId?: string; reason?: string };
  const r = await reportQuestion(user.id, String(b.questionId ?? ''), String(b.reason ?? ''));
  if (r === 'limit') return NextResponse.json({ error: 'Muitos avisos hoje. Tente amanhã.' }, { status: 429 });
  if (r === 'invalid') return NextResponse.json({ error: 'Descreva o problema em pelo menos 5 letras.' }, { status: 400 });
  return NextResponse.json({ ok: true });
}
