import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { startAttempt } from '@/lib/attempts';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Faça login para continuar.' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { slug?: string };
  const r = await startAttempt(user.id, body.slug ?? '');
  if (!r.ok) return NextResponse.json({ error: r.reason, code: r.code }, { status: r.code === 'limit' ? 402 : 404 });
  return NextResponse.json(r);
}
