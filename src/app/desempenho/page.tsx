import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { desempenho } from '@/lib/desempenho';
import { TREINO_TEMAS } from '@/lib/treino';
import { PageHero } from '../page-hero';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Meu desempenho' };

const NOME: Record<string, string> = { ...TREINO_TEMAS, linguagens: 'Linguagens', humanas: 'Ciências Humanas', natureza: 'Ciências da Natureza', matematica: 'Matemática' };
const dm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?erro=${encodeURIComponent('Entre para ver seu desempenho.')}`);
  const d = await desempenho(user.id);
  const max = Math.max(d.meta, ...d.dias.map((x) => x.respondidas));
  const fracos = d.temas.filter((t) => t.respondidas >= 3).slice(0, 3);
  return (
    <>
      <PageHero compact title={<>Meu <em>desempenho</em></>} />
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

          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>Últimos 14 dias</h3>
            <div className="bars" role="img" aria-label="Questões respondidas por dia, nos últimos 14 dias">
              {d.dias.map((x) => (
                <div key={x.dia} className="bar" title={`${dm(x.dia)}: ${x.respondidas} questões, ${x.acertos} acertos`}>
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
