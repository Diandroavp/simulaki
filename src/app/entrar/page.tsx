import Link from 'next/link';
import { loginAction } from '../actions';
import { AuthShell } from '../page-hero';

export default async function Entrar({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const { erro, ok } = await searchParams;
  const google = !!process.env.GOOGLE_CLIENT_ID;
  return (
    <AuthShell title={<>Que bom ter você <em>de volta</em></>} lead="Continue de onde parou: seus simulados, seu histórico e o caderno de erros.">
      <h1>Entrar</h1>
      {erro && <p className="err" role="alert">{erro}</p>}
      {ok && <p className="okmsg">{ok}</p>}
      {google && <><a className="btn ghost" style={{ display: 'block', textAlign: 'center' }} href="/api/auth/google">Entrar com Google</a><p className="muted" style={{ textAlign: 'center' }}>ou</p></>}
      <form action={loginAction}>
        <label>E-mail<input name="email" type="email" required autoComplete="email" /></label>
        <label>Senha<input name="password" type="password" required autoComplete="current-password" /></label>
        <div className="row"><button className="btn">Entrar</button></div>
      </form>
      <p className="muted"><Link href="/esqueci-senha">Esqueci minha senha</Link></p>
      <p className="muted">Ainda não tem conta? <Link href="/cadastro">Criar conta grátis</Link></p>
    </AuthShell>
  );
}
