import Link from 'next/link';
import { signupAction } from '../actions';
import { AuthShell } from '../page-hero';

export default async function Cadastro({ searchParams }: { searchParams: Promise<{ erro?: string; ref?: string }> }) {
  const { erro, ref } = await searchParams;
  const google = !!process.env.GOOGLE_CLIENT_ID;
  return (
    <AuthShell title={<>Seu primeiro simulado é <em>grátis</em></>} lead="1 simulado por dia, sem cartão. Cada questão vem com explicação e base legal.">
      <h1>Criar conta grátis</h1>
      {erro && <p className="err" role="alert">{erro}</p>}
      {google && <><a className="btn ghost" style={{ display: 'block', textAlign: 'center' }} href="/api/auth/google">Continuar com Google</a><p className="muted" style={{ textAlign: 'center' }}>ou</p></>}
      <form action={signupAction}>
        {ref && /^[A-Za-z0-9]{6,12}$/.test(ref) && <input type="hidden" name="ref" value={ref} />}
        <label>Nome<input name="name" required autoComplete="name" /></label>
        <label>E-mail<input name="email" type="email" required autoComplete="email" /></label>
        <label>Senha (mínimo 8 caracteres)<input name="password" type="password" required minLength={8} autoComplete="new-password" /></label>
        <label className="check"><input type="checkbox" name="terms" required /><span>Li e aceito os <Link href="/termos" target="_blank">termos de uso</Link> e a <Link href="/privacidade" target="_blank">política de privacidade</Link>.</span></label>
        <label className="check"><input type="checkbox" name="marketing" /><span>Quero receber dicas e novidades por e-mail (opcional).</span></label>
        <div className="row"><button className="btn">Criar conta</button></div>
      </form>
      <p className="muted">Já tem conta? <Link href="/entrar">Entrar</Link></p>
    </AuthShell>
  );
}
