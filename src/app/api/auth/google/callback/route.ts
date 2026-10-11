import { eq } from 'drizzle-orm';
import { NextResponse, type NextRequest } from 'next/server';
import { getDb, schema } from '@/db';
import { createSession } from '@/lib/auth';
import { markVerified } from '@/lib/email-verification';

export const dynamic = 'force-dynamic';
const appUrl = () => process.env.APP_URL ?? 'http://localhost:3000';
const fail = (msg: string) => NextResponse.redirect(`${appUrl()}/entrar?erro=${encodeURIComponent(msg)}`);

/**
 * Fluxo de código de autorização do Google. NÃO TESTADO contra o Google real (precisa de
 * GOOGLE_CLIENT_ID/SECRET e do redirect URI cadastrado no console do Google).
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const saved = req.cookies.get('sk_oauth_state')?.value;
  if (!code || !state || !saved || state !== saved) return fail('Não foi possível entrar com o Google. Tente de novo.');

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      redirect_uri: `${appUrl()}/api/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) return fail('O Google recusou o login.');
  const { access_token } = (await tokenRes.json()) as { access_token?: string };
  if (!access_token) return fail('O Google recusou o login.');

  const info = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { authorization: `Bearer ${access_token}` } });
  if (!info.ok) return fail('Não foi possível ler seu perfil do Google.');
  const p = (await info.json()) as { sub?: string; email?: string; email_verified?: boolean; name?: string };
  if (!p.sub || !p.email || !p.email_verified) return fail('Seu e-mail do Google precisa estar verificado.');

  const email = p.email.toLowerCase();
  const db = await getDb();
  let [u] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (!u) {
    [u] = await db.insert(schema.users).values({ name: p.name || email.split('@')[0]!, email, googleSub: p.sub }).returning();
  } else if (!u.googleSub) {
    // e-mail verificado pelo Google: vincula à conta existente
    await db.update(schema.users).set({ googleSub: p.sub }).where(eq(schema.users.id, u.id));
  } else if (u.googleSub !== p.sub) {
    return fail('Este e-mail está vinculado a outra conta do Google.');
  }
  await markVerified(u!.id); // o Google já verificou o e-mail (conferido acima)
  await createSession(u!.id);
  const res = NextResponse.redirect(`${appUrl()}/app`);
  res.cookies.delete('sk_oauth_state');
  return res;
}
