import Link from 'next/link';
import { signupAction } from '../actions';

export default async function Cadastro({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const google = !!process.env.GOOGLE_CLIENT_ID;
  return (
    <div className="card" style={{ maxWidth: 420, margin: '24px auto' }}>
      <h1 style={{ marginTop: 0 }}>Criar conta grátis</h1>
      {erro && <p className="err" role="alert">{erro}</p>}
      {google && <><a className="btn ghost" style={{ display: 'block', textAlign: 'center' }} href="/api/auth/google">Continuar com Google</a><p className="muted" style={{ textAlign: 'center' }}>ou</p></>}
      <form action={signupAction}>
        <label>Nome<input name="name" required autoComplete="name" /></label>
        <label>E-mail<input name="email" type="email" required autoComplete="email" /></label>
        <label>Senha (mínimo 8 caracteres)<input name="password" type="password" required minLength={8} autoComplete="new-password" /></label>
        <label className="check"><input type="checkbox" name="terms" required /> Li e aceito os <Link href="/termos" target="_blank">termos de uso</Link> e a <Link href="/privacidade" target="_blank">política de privacidade</Link>.</label>
        <label className="check"><input type="checkbox" name="marketing" /> Quero receber dicas e novidades por e-mail (opcional).</label>
        <div className="row"><button className="btn">Criar conta</button></div>
      </form>
      <p className="muted">Já tem conta? <Link href="/entrar">Entrar</Link></p>
    </div>
  );
}
