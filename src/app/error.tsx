'use client';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card" style={{ maxWidth: 480, margin: '48px auto', textAlign: 'center' }}>
      <h1 style={{ marginTop: 0 }}>Algo deu errado</h1>
      <p className="muted">Não foi possível carregar esta página. Seu progresso no simulado em andamento fica salvo.</p>
      <button className="btn" onClick={reset}>Tentar de novo</button>
    </div>
  );
}
