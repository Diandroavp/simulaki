import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="card" style={{ maxWidth: 480, margin: '48px auto', textAlign: 'center' }}>
      <h1 style={{ marginTop: 0 }}>Página não encontrada</h1>
      <p className="muted">O endereço pode estar errado ou a página mudou de lugar.</p>
      <Link className="btn" href="/">Voltar ao início</Link>
    </div>
  );
}
