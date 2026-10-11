import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const appUrl = () => process.env.APP_URL ?? 'http://localhost:3000';

export async function GET() {
  const id = process.env.GOOGLE_CLIENT_ID;
  if (!id) return NextResponse.redirect(`${appUrl()}/entrar?erro=${encodeURIComponent('Login com Google não configurado.')}`);
  const state = randomBytes(16).toString('base64url');
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: id,
    redirect_uri: `${appUrl()}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  }).toString();
  const res = NextResponse.redirect(url);
  res.cookies.set('sk_oauth_state', state, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 600 });
  return res;
}
