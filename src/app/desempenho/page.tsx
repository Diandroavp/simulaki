import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { desempenho } from '@/lib/desempenho';
import { perfilEnem } from '@/lib/enem-perfil';
import { AREAS } from '@/lib/assuntos';
import { Radar } from '../radar';
import { TREINO_TEMAS } from '@/lib/treino';
import { PageHero } from '../page-hero';
import { salvarDataProvaAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Meu desempenho' };

const NOME: Record<string, string> = { ...TREINO_TEMAS, linguagens: 'Linguagens', humanas: 'Ciências Humanas', natureza: 'Ciências da Natureza', matematica: 'Matemática' };
const dm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

export default async function Page({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?erro=${encodeURIComponent('Entre para ver seu desempenho.')}`);
  const d = await desempenho(user.id);
  const perfil = await perfilEnem(user.id);
  const temEnem = perfil.areas.some((a) => a.respondidas > 0);
  const max = Math.max(d.meta, ...d.dias.map((x) => x.respondidas));
  const fracos = d.temas.filter((t) => t.respondidas >= 3).slice(0, 3);
  return (
    <>
      <PageHero compact title={<>Meu <em>desempenho</em></>} />
      {erro && <p className="err" role="alert">{erro}</p>}
      <div className="card" style={{ marginTop: 16 }}>
        {d.diasProva !== null ? (
          <p style={{ marginTop: 0, fontSize: '1.15rem' }}>
            <strong>{d.diasProva === 0 ? 'A prova é hoje. Boa sorte!' : `Faltam ${d.diasProva} ${d.diasProva === 1 ? 'dia' : 'dias'} para a sua prova`}</strong>
            {d.projecao !== null && <span className="muted"> · no seu ritmo ({d.media14.toLocaleString("pt-BR")} questões por dia) você faz cerca de {d.projecao} questões até lá.</span>}
          </p>
        ) : (
          <p style={{ marginTop: 0 }}><strong>Quando é a sua prova?</strong> <span className="muted">Informe a data e acompanhe a contagem regressiva.</span></p>
        )}
        <form action={salvarDataProvaAction} className="row" style={{ gap: 8 }}>
          <input type="date" name="data" aria-label="Data da prova" defaultValue={d.dataProva ? d.dataProva.toISOString().slice(0, 10) : ''} style={{ maxWidth: 190 }} />
          <button className="btn ghost" style={{ padding: '6px 16px' }}>{d.dataProva ? 'Atualizar data' : 'Salvar data'}</button>
        </form>
      </div>
      {d.total === 0 ? (
        <div className="card">
          <p style={{ marginTop: 0 }}>Você ainda não respondeu questões. Faça um simulado ou um treino e seu painel aparece aqui.</p>
          <Link className="btn" href="/app">Ir para minha área</Link>
        </div>
      ) : (
        <>
          <div className="grid" style={{ marginBlock: 16 }}>
            <div className="card"><div className="muted">Meta de hoje</div><div className="price">{d.hoje}/{d.meta}</div>
              <div className="meter" aria-hidden><i style={{ width: `${Math.min(100, Math.round((d.hoje / d.meta) * 100))}%` }} /></div></div>
            <div className="card"><div className="muted">Dias seguidos</div><div className="price">{d.sequencia}</div></div>
            <div className="card"><div className="muted">Acertos no geral</div><div className="price">{d.pct}%</div><div className="muted">{d.total} questões</div></div>
          </div>

          {temEnem && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ marginTop: 0 }}>Seu radar do ENEM 🎯</h3>
              <p className="muted" style={{ marginTop: 0 }}>Percentual de acertos em cada área. Quanto mais o desenho se aproxima da borda, melhor você está.</p>
              <Radar titulo="Acertos por área do ENEM" pontos={perfil.areas} />
              {(perfil.fortes.length > 0 || perfil.fracos.length > 0) && (
                <div className="apt" style={{ marginTop: 16 }}>
                  {perfil.fortes.length > 0 && (
                    <div><h4>Você está mandando bem em 💪</h4><ul className="pers-list">
                      {perfil.fortes.map((p) => <li key={p.key}><span>{p.label}</span><span><strong>{p.pct}%</strong> <span className="muted">({p.acertos}/{p.respondidas})</span></span></li>)}
                    </ul></div>
                  )}
                  {perfil.fracos.length > 0 && (
                    <div><h4>Vale dar uma forcinha em 🌱</h4><ul className="pers-list">
                      {perfil.fracos.map((p) => <li key={p.key}><span>{p.label}</span><span><strong>{p.pct}%</strong> <span className="muted">({p.acertos}/{p.respondidas})</span></span></li>)}
                    </ul><Link className="btn ghost" style={{ padding: '4px 12px' }} href="/personalizado">Bora treinar</Link></div>
                  )}
                </div>
              )}
              <p className="muted" style={{ marginBottom: 0 }}>Quanto mais o desenho chega perto da borda, melhor! Os eixos em cinza ainda precisam de umas questões (mínimo 3) pra aparecer. Os destaques surgem a partir de 5 respostas no assunto. <Link href="/checklist">Ver checklist de estudos</Link></p>
            </div>
          )}
          {temEnem && AREAS.map((a) => {
            const pts = perfil.assuntos[a.key];
            if (!pts.some((p) => p.pct !== null)) return null;
            return (
              <div className="card" style={{ marginBottom: 16 }} key={a.key}>
                <h3 style={{ marginTop: 0 }}>{a.label}: por assunto</h3>
                {pts.length >= 3 ? <Radar titulo={`Acertos por assunto em ${a.label}`} pontos={pts} tamanho={400} /> : null}
              </div>
            );
          })}

          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>Últimos 14 dias</h3>
            <div className="dbars" role="img" aria-label="Questões respondidas por dia, nos últimos 14 dias">
              {d.dias.map((x) => (
                <div key={x.dia} className="dbar" title={`${dm(x.dia)}: ${x.respondidas} questões, ${x.acertos} acertos`}>
                  <i style={{ height: `${Math.round((x.respondidas / max) * 100)}%` }} className={x.respondidas >= d.meta ? 'meta' : ''} />
                  <span>{dm(x.dia).slice(0, 2)}</span>
                </div>
              ))}
            </div>
            <p className="muted" style={{ marginBottom: 0 }}>Barras verdes bateram a meta de {d.meta} questões no dia.</p>
          </div>

          {fracos.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ marginTop: 0 }}>Onde focar</h3>
              <p className="muted" style={{ marginTop: 0 }}>Seus temas com menos acertos (com pelo menos 3 respostas).</p>
              <ul className="pers-list">
                {fracos.map((t) => (
                  <li key={`${t.banco}-${t.topic}`}>
                    <div><strong>{NOME[t.topic] ?? t.topic}</strong> <span className="muted">· {t.banco === 'enem' ? 'ENEM' : 'Detran'}</span></div>
                    <div className="row" style={{ gap: 12 }}>
                      <span>{t.pct}% <span className="muted">({t.acertos}/{t.respondidas})</span></span>
                      <Link className="btn ghost" style={{ padding: '4px 12px' }} href={t.banco === 'enem' ? '/personalizado' : '/treino'}>Treinar</Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Todos os temas</h3>
            <ul className="pers-list">
              {[...d.temas].sort((a, b) => b.respondidas - a.respondidas).map((t) => (
                <li key={`${t.banco}-${t.topic}`}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <strong>{NOME[t.topic] ?? t.topic}</strong> <span className="muted">· {t.banco === 'enem' ? 'ENEM' : 'Detran'}</span>
                    <div className="meter" aria-hidden style={{ marginTop: 6 }}><i style={{ width: `${t.pct}%` }} /></div>
                  </div>
                  <span>{t.pct}% <span className="muted">({t.acertos}/{t.respondidas})</span></span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
      <p className="muted"><Link href="/app">Voltar para minha área</Link></p>
    </>
  );
}
