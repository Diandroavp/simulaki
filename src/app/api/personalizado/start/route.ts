import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { startCustomTreino } from '@/lib/personalizado';

export const dynamic = 'force-dynamic';

/** Simulado personalizado no modo treino (correção na hora). O modo prova usa /api/simulado/start. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Faça login para continuar.' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { custom?: unknown };
  const r = await startCustomTreino(user.id, body.custom);
  if (!r.ok) return NextResponse.json({ error: r.reason, code: r.code }, { status: r.code === 'plano' ? 402 : r.code === 'invalido' ? 400 : 404 });
  return NextResponse.json(r);
}
