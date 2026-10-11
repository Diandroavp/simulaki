import { and, eq, gt } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb, schema } from '@/db';

export const dynamic = 'force-dynamic';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PERFIS = new Set(['aluno', 'autoescola', 'instrutor', 'vestibulando', 'outro']);

/** Lista de espera da landing. Exige consentimento (LGPD) e limita pedidos por IP. */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { email?: string; perfil?: string; consent?: boolean; origem?: string };
  const email = String(b.email ?? '').trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 200) return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 });
  if (b.consent !== true) return NextResponse.json({ error: 'É preciso aceitar o contato para entrar na lista.' }, { status: 400 });

  const db = await getDb();
  const ip = (req.headers.get('x-forwarded-for') ?? 'local').split(',')[0]!.trim();
  const key = `wl:${ip}`;
  const recent = await db.select({ id: schema.loginFailures.id }).from(schema.loginFailures).where(and(eq(schema.loginFailures.key, key), gt(schema.loginFailures.createdAt, new Date(Date.now() - 3_600_000))));
  if (recent.length >= 20) return NextResponse.json({ error: 'Muitas tentativas. Tente mais tarde.' }, { status: 429 });
  await db.insert(schema.loginFailures).values({ key });

  await db
    .insert(schema.waitlist)
    .values({ email, profile: PERFIS.has(String(b.perfil)) ? String(b.perfil) : null, consent: true, source: String(b.origem ?? '').slice(0, 60) || null })
    .onConflictDoNothing(); // repetido: responde igual, sem revelar
  return NextResponse.json({ ok: true });
}
