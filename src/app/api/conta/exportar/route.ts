import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { exportUserData } from '@/lib/account';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Entre para baixar seus dados.' }, { status: 401 });
  const data = await exportUserData(user.id);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'content-disposition': 'attachment; filename="meus-dados-simulaki.json"', 'cache-control': 'no-store' },
  });
}
