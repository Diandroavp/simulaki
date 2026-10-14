import { NextResponse } from 'next/server';
import { rodarLembretes } from '@/lib/lembretes';

export const dynamic = 'force-dynamic';

/** Chamado uma vez por dia pelo cron da Vercel, que envia `Authorization: Bearer <CRON_SECRET>`. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  return NextResponse.json(await rodarLembretes());
}
