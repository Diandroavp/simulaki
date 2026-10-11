import Link from 'next/link';
import { validToken } from '@/lib/password-reset';
import { resetPasswordAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function Redefinir({ searchParams }: { searchParams: Promise<{ token?: string; erro?: string }> }) {
  const { token, erro } = await searchParams;
  const ok = token ? await validToken(token) : false;
  return (
    <div className="card" style={{ maxWidth: 420, margin: '24px auto' }}>
      <h1 style={{ marginTop: 0 }}>Nova senha</h1>
      {erro && <p className="err" role="alert">{erro}</p>}
      {ok ? (
        <form action={resetPasswordAction}>
          <input type="hidden" name="token" value={token} />
          <label>Nova senha (mínimo 8 caracteres)<input name="password" type="password" required minLength={8} autoComplete="new-password" /></label>
          <div className="row"><button className="btn">Salvar senha</button></div>
        </form>
      ) : (
        <p>Este link é inválido ou expirou. <Link href="/esqueci-senha">Pedir um novo</Link></p>
      )}
    </div>
  );
}
