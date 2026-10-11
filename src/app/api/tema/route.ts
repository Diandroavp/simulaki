import { NextResponse } from 'next/server';

const TEMAS = ['cartao', 'placa', 'painel'];

/** Guarda a aparência escolhida e volta para a página de onde o visitante veio. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const t = url.searchParams.get('t') ?? '';
  let back = '/';
  try {
    const ref = req.headers.get('referer');
    if (ref) {
      const r = new URL(ref);
      if (r.origin === url.origin) back = r.pathname + r.search;
    }
  } catch {}
  const res = NextResponse.redirect(new URL(back, url.origin), 303);
  if (TEMAS.includes(t)) res.cookies.set('tema', t, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  return res;
}
