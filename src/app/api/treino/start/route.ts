import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { mundoValido } from '@/lib/mundos';
import { startTreino } from '@/lib/treino';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Faça login para continuar.' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { tema?: string; mundo?: string; tamanho?: number };
  const r = await startTreino(user.id, String(body.tema ?? ''), { mundo: mundoValido(body.mundo) ? body.mundo : 'detran', tamanho: Number(body.tamanho) || undefined });
  if (!r.ok) return NextResponse.json({ error: r.reason, code: r.code }, { status: r.code === 'limit' ? 402 : 404 });
  return NextResponse.json(r);
}
