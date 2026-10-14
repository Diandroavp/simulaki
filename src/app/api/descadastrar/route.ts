import { descadastrar, lerTokenDescadastro } from '@/lib/lembretes';

export const dynamic = 'force-dynamic';

const html = (msg: string, status = 200) =>
  new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Simulaki</title><body style="font-family:system-ui;max-width:32rem;margin:4rem auto;padding:0 1rem"><h1>Simulaki</h1><p>${msg}</p><p><a href="/">Voltar ao site</a></p>`, { status, headers: { 'content-type': 'text/html; charset=utf-8' } });

/** Link de "não quero mais receber" dos e-mails. */
export async function GET(req: Request) {
  const id = lerTokenDescadastro(new URL(req.url).searchParams.get('t') ?? '');
  if (!id) return html('Link inválido ou expirado.', 400);
  await descadastrar(id);
  return html('Pronto: você não receberá mais e-mails de novidades e lembretes.');
}
