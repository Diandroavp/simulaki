import Link from 'next/link';
import { isAvailable, SIMULATIONS } from '@/lib/simulations';
import { DemoQuestion } from './demo-question';

export default function Home() {
  return (
    <>
      <section className="hero">
        <div>
          <h1>Treine no formato da prova e chegue seguro no dia.</h1>
          <p className="lead">
            Simulados com cronômetro e correção na hora. Cada questão tem a explicação e a base legal, e você vê em quais temas ainda erra.
          </p>
          <div className="row">
            <Link className="btn" href="/cadastro">Fazer o simulado grátis</Link>
            <Link className="btn ghost" href="/planos">Ver planos</Link>
          </div>
          <p className="muted" style={{ marginTop: 14 }}>1 simulado grátis por dia, sem cartão.</p>
        </div>
        <DemoQuestion />
      </section>

      <hr className="roadline" aria-hidden />
      <h2>Simulados</h2>
      <ul className="simlist">
        {SIMULATIONS.map((s) => {
          const on = isAvailable(s);
          return (
            <li key={s.slug} className={on ? '' : 'off'}>
              <span className="name">{s.name}</span>
              <span className={`badge ${on ? 'on' : ''}`}>{on ? 'Disponível' : 'Em breve'}</span>
              <span className="desc">{s.description}</span>
            </li>
          );
        })}
      </ul>

      <h2 style={{ marginTop: 56 }}>Como funciona</h2>
      <ol className="steps">
        <li><strong>Escolha o simulado</strong><span className="muted">Mesmo número de questões e tempo da prova do seu estado.</span></li>
        <li><strong>Responda no tempo</strong><span className="muted">Cronômetro e navegação entre as questões, como na prova.</span></li>
        <li><strong>Aprenda com os erros</strong><span className="muted">Cada questão tem explicação e referência legal.</span></li>
        <li><strong>Acompanhe a evolução</strong><span className="muted">Histórico, acertos por simulado e por tema.</span></li>
      </ol>
    </>
  );
}
