import Link from 'next/link';
import { isAvailable, SIMULATIONS } from '@/lib/simulations';

export default function Home() {
  return (
    <>
      <section className="hero">
        <h1>Treine no formato da prova e chegue seguro no dia.</h1>
        <p style={{ fontSize: '1.1rem', maxWidth: 640 }}>
          Simulados com cronômetro, correção na hora e explicação de cada questão com a base legal. Veja seu histórico,
          seu percentual de acertos e os temas em que você mais erra.
        </p>
        <div className="row">
          <Link className="btn" href="/cadastro">Fazer o simulado grátis</Link>
          <Link className="btn ghost" href="/planos">Ver planos</Link>
        </div>
        <p className="muted">1 simulado grátis por dia, sem cartão.</p>
      </section>

      <h2>Simulados</h2>
      <div className="grid">
        {SIMULATIONS.map((s) => {
          const on = isAvailable(s);
          return (
            <div className="card" key={s.slug}>
              <span className={`badge ${on ? 'on' : ''}`}>{on ? 'Disponível' : 'Em breve'}</span>
              <h3 style={{ marginBottom: 4 }}>{s.name}</h3>
              <p className="muted" style={{ margin: 0 }}>{s.description}</p>
            </div>
          );
        })}
      </div>

      <h2>Como funciona</h2>
      <div className="grid">
        <div className="card"><strong>1. Escolha o simulado</strong><p className="muted">Mesmo número de questões e tempo da prova do seu estado.</p></div>
        <div className="card"><strong>2. Responda no tempo</strong><p className="muted">Cronômetro e navegação entre as questões, como na prova.</p></div>
        <div className="card"><strong>3. Aprenda com os erros</strong><p className="muted">Cada questão tem explicação e a referência legal.</p></div>
        <div className="card"><strong>4. Acompanhe a evolução</strong><p className="muted">Histórico, acertos por simulado e por tema.</p></div>
      </div>
    </>
  );
}
