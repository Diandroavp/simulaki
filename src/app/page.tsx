import Link from 'next/link';
import { isAvailable, SIMULATIONS } from '@/lib/simulations';
import { DemoQuestion } from './demo-question';
import { GUIAS } from '@/lib/guias';
import { ApagadorLousa, Borracha, Fita, Lapis, Marcador, Regua } from './ilustracoes';

export default function Home() {
  const detran = SIMULATIONS.filter((s) => s.group === 'detran');
  const outros = SIMULATIONS.filter((s) => s.group !== 'detran');
  return (
    <>
      <div className="herowrap bleed">
        <Fita className="fita" />
        <section className="hero">
          <span className="deco x" aria-hidden>xxxx</span>
          <span className="deco o" aria-hidden><i /><i /><i /><i /><i /><i /></span>
          <div>
            <h1>Chegue seguro à <em>prova teórica</em> do Detran.</h1>
            <p className="lead">Simulados com 30 questões, cronômetro e correção na hora. Cada resposta vem com a explicação e a base legal.</p>
            <div className="row">
              <Link className="btn" href="/cadastro">Criar conta grátis <span aria-hidden>→</span></Link>
              <Link className="btn ghost" href="/planos">Ver planos</Link>
            </div>
          </div>
          <div className="board">
            <div className="board-frame"><div className="board-face"><DemoQuestion /></div></div>
            <div className="board-tray" aria-hidden>
              <Marcador cor="#2447D8" />
              <Marcador cor="#D8453A" />
              <ApagadorLousa />
            </div>
            <Lapis className="stick pencil" />
            <Borracha className="stick eraser" />
            <Regua className="stick ruler" />
          </div>
        </section>
        <svg className="wave" viewBox="0 0 1440 84" preserveAspectRatio="none" aria-hidden><path d="M0 46C220 96 440 6 720 38S1200 90 1440 26V84H0Z" /></svg>
      </div>

      <section aria-label="Como é a prova">
        <div className="facts">
          <div><b>30</b><span>questões</span></div>
          <div><b>60</b><span>minutos</span></div>
          <div><b>20</b><span>acertos para passar</span></div>
        </div>
        <p className="facts-note">Regras da Resolução Contran 1.020/2025. 1 simulado grátis por dia, sem cartão.</p>
      </section>

      <h2>Escolha o seu <em>simulado</em></h2>
      <div className="sims">
        {detran.map((s, i) => {
          const on = isAvailable(s);
          const cls = `sim ${i === 0 ? 'big' : ''} ${on ? '' : 'off'}`;
          const body = (
            <>
              <span className="nm">{s.name}</span>
              <span className="muted">{s.description}</span>
              {on ? <span className="go">Fazer simulado</span> : <span className="badge" style={{ alignSelf: 'flex-start' }}>Em breve</span>}
            </>
          );
          return on ? <Link key={s.slug} href={`/simulado/${s.slug}`} className={cls}>{body}</Link> : <div key={s.slug} className={cls}>{body}</div>;
        })}
      </div>
      <div className="sims two">
        {outros.map((s) => (
          <div key={s.slug} className="sim off">
            <span className="nm">{s.name}</span>
            <span className="muted">{s.description}</span>
            <span className="badge" style={{ alignSelf: 'flex-start' }}>Em breve</span>
          </div>
        ))}
      </div>

      <section className="paper" style={{ marginTop: 72 }}>
        <h2>Do primeiro simulado à <em>aprovação</em></h2>
        <ol className="steps">
          <li><strong>Escolha o simulado</strong><span className="muted">Mesmo número de questões e tempo da prova do seu estado.</span></li>
          <li><strong>Responda no tempo</strong><span className="muted">Cronômetro e navegação entre as questões, como na prova.</span></li>
          <li><strong>Aprenda com os erros</strong><span className="muted">Cada questão tem explicação e referência legal.</span></li>
          <li><strong>Acompanhe a evolução</strong><span className="muted">Histórico, acertos por simulado e por tema.</span></li>
        </ol>
      </section>

      <h2>Treine o que você mais <em>erra</em></h2>
      <div className="treino">
        <div className="tile a">
          <h3>Treino por tema</h3>
          <p style={{ margin: 0 }}>Sessões de 10 questões com correção na hora, no tema que você escolher.</p>
          <div className="pills"><span>Legislação</span><span>Sinalização</span><span>Direção defensiva</span><span>Mecânica</span><span>Primeiros socorros</span><span>Meio ambiente</span></div>
        </div>
        <div className="tile b">
          <h3>Caderno de erros</h3>
          <p style={{ margin: 0 }}>As questões que você errou ficam guardadas para refazer até acertar.</p>
        </div>
      </div>

      <h2>Guias para a <em>prova teórica</em></h2>
      <div className="guias">
        {GUIAS.map((g) => (
          <Link key={g.slug} className="guia" href={`/guia/${g.slug}`}>
            <b>{g.titulo}</b>
            <span>{g.resumo}</span>
          </Link>
        ))}
      </div>

      <section className="final">
        <Fita className="fita" />
        <h2>Faça o primeiro simulado <em>hoje</em>.</h2>
        <Link className="btn" href="/cadastro">Criar conta grátis <span aria-hidden>→</span></Link>
      </section>
    </>
  );
}
