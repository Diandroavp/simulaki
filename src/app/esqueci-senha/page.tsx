import { forgotPasswordAction } from '../actions';

export default async function Esqueci({ searchParams }: { searchParams: Promise<{ enviado?: string }> }) {
  const { enviado } = await searchParams;
  return (
    <div className="card" style={{ maxWidth: 420, margin: '24px auto' }}>
      <h1 style={{ marginTop: 0 }}>Esqueci minha senha</h1>
      {enviado ? (
        <p className="okmsg">Se esse e-mail tiver cadastro, enviamos um link para criar uma nova senha. Ele vale por 1 hora.</p>
      ) : (
        <form action={forgotPasswordAction}>
          <label>E-mail<input name="email" type="email" required autoComplete="email" /></label>
          <div className="row"><button className="btn">Enviar link</button></div>
        </form>
      )}
    </div>
  );
}
