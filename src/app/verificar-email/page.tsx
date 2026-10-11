import Link from 'next/link';
import { validVerificationToken } from '@/lib/email-verification';
import { confirmEmailAction } from '../actions';

export const dynamic = 'force-dynamic';

// O botão evita que leitores de e-mail que abrem links automaticamente confirmem sem querer.
export default async function VerificarEmail({ searchParams }: { searchParams: Promise<{ token?: string; erro?: string }> }) {
  const { token, erro } = await searchParams;
  const ok = token ? await validVerificationToken(token) : false;
  return (
    <div className="card" style={{ maxWidth: 420, margin: '24px auto' }}>
      <h1 style={{ marginTop: 0 }}>Confirmar e-mail</h1>
      {erro && <p className="err" role="alert">{erro}</p>}
      {ok ? (
        <form action={confirmEmailAction}>
          <input type="hidden" name="token" value={token} />
          <p>Clique para confirmar que este e-mail é seu.</p>
          <div className="row"><button className="btn">Confirmar e-mail</button></div>
        </form>
      ) : (
        <p>Este link é inválido ou expirou. <Link href="/app">Entre no app</Link> para pedir um novo.</p>
      )}
    </div>
  );
}
