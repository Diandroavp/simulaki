import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getOpenAttempt, getStats } from '@/lib/attempts';
import { desempenho } from '@/lib/desempenho';
import { mundoDeTipo, mundoPorSlug } from '@/lib/mundos';
import { getSimulation, nomeTipo } from '@/lib/simulations';
import { resumoErros } from '@/lib/treino';
import { ensureOverrides } from '@/lib/question-overrides';
import { PageHero } from '../../page-hero';

export const dynamic = 'force-dynamic';

const fmtDate = (d: Date | null) => (d ? d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Manaus' }) : '');

export async function generateMetadata({ params }: { params: Promise<{ mundo: string }> }) {
  const m = mundoPorSlug((await params).mundo);
  return { title: m ? m.nome : 'Minha área' };
}

export default async function Hub({ params }: { params: Promise<{ mundo: string }> }) {
  const m = mundoPorSlug((await params).mundo);
  if (!m) notFound();
  const user = await getCurrentUser();
  if (!user) redirect('/entrar');
  await ensureOverrides();
  const [d, { stats, history }, open, erros] = await Promise.all([desempenho(user.id, m.slug), getStats(user.id), getOpenAttempt(user.id), resumoErros(user.id, m.slug)]);
  const hist = history.filter((h) => mundoDeTipo(h.simulationType) === m.slug);
  const emAndamento = open && mundoDeTipo(open.simulationType) === m.slug ? open : null;
  const enem = m.slug === 'enem';
  return (
    <>
      <PageHero compact title={<>{m.emoji} <em>{m.nome}</em></>} />
      {emAndamento && <p className="note">Você tem um simulado em andamento. <Link href={emAndamento.simulationType.startsWith('custom:') ? `/personalizado?mundo=${m.slug}&retomar=1` : `/simulado/${emAndamento.simulationType}`}>Continuar</Link></p>}
      <div className="grid" style={{ marginBlock: 16 }}>
        <div className="card"><div className="muted">Questões resolvidas</div><div className="price">{d.total}</div></div>
        <div className="card"><div className="muted">Acertos</div><div className="price">{d.pct === null ? '-' : `${d.pct}%`}</div></div>
        <div className="card"><div className="muted">Meta de hoje</div><div className="price">{d.hoje}/{d.meta}</div>
          <div className="meter" aria-hidden><i style={{ width: `${Math.min(100, Math.round((d.hoje / d.meta) * 100))}%` }} /></div></div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>⚡ Treino rápido</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          5, 10 ou 20 questões, aleatórias ou {enem ? 'por assunto (Genética, Geometria plana…)' : 'por matéria'}, com correção na hora. Um pouquinho por dia já faz diferença.
          {erros > 0 ? ` Você tem ${erros} ${erros === 1 ? 'questão' : 'questões'} no caderno de erros para revisar hoje.` : ''}
        </p>
        <Link className="btn" href={`/treino?mundo=${m.slug}`}>Treinar agora</Link>
      </div>

      {enem && (
        <div className="grid" style={{ marginBottom: 16 }}>
          <div className="card"><h3 style={{ marginTop: 0 }}>🎯 Meu radar</h3><p className="muted">Veja no que você é bom e onde melhorar, por área e assunto.</p><Link className="btn ghost" href="/desempenho?mundo=enem">Ver radar</Link></div>
          <div className="card"><h3 style={{ marginTop: 0 }}>✅ Checklist</h3><p className="muted">Marque o que já viu, está estudando ou domina.</p><Link className="btn ghost" href="/checklist">Abrir checklist</Link></div>
          <div className="card"><h3 style={{ marginTop: 0 }}>📅 Plano da semana</h3><p className="muted">Um roteiro leve, do seu tamanho, com o que mais rende nota.</p><Link className="btn ghost" href="/plano">Ver plano</Link></div>
        </div>
      )}

      <div className="grid" style={{ marginBottom: 16 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Montar um simulado</h3>
          <p className="muted" style={{ marginTop: 0 }}>Escolha as matérias e a quantidade. Como prova, com relógio, ou como treino.</p>
          <Link className="btn ghost" href={`/personalizado?mundo=${m.slug}`}>Personalizar</Link>
        </div>
        {!enem && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Meu desempenho</h3>
            <p className="muted" style={{ marginTop: 0 }}>Meta diária, dias seguidos e os temas em que você mais erra.</p>
            <Link className="btn ghost" href="/desempenho?mundo=detran">Ver desempenho</Link>
          </div>
        )}
      </div>

      <h2>{enem ? 'Prova completa' : 'Simulados'}</h2>
      <div className="grid">
        {m.simulados.map((slug) => {
          const sim = getSimulation(slug)!;
          const s = stats.get(slug);
          return (
            <div className="card" key={slug}>
              <h3 style={{ margin: 0 }}>{sim.name}</h3>
              {s ? (
                <>
                  <p style={{ margin: '12px 0 4px' }}><strong>{s.accuracy}%</strong> de acertos <span className="muted">({s.correct}/{s.answered} em {s.attempts} {s.attempts === 1 ? 'simulado' : 'simulados'})</span></p>
                  <div className="meter" aria-hidden><i style={{ width: `${s.accuracy}%` }} /></div>
                </>
              ) : <p className="muted">Você ainda não fez este simulado.</p>}
              <div className="row" style={{ marginTop: 10 }}><Link className="btn" href={`/simulado/${slug}`}>Fazer simulado</Link></div>
            </div>
          );
        })}
      </div>

      <h2>Histórico</h2>
      {hist.length === 0 ? (
        <p className="muted">Quando você finalizar um simulado, ele aparece aqui.</p>
      ) : (
        <div className="card scroll">
          <table>
            <thead><tr><th>Data</th><th>Simulado</th><th>Acertos</th><th>%</th><th>Resultado</th></tr></thead>
            <tbody>
              {hist.map((h) => (
                <tr key={h.id}>
                  <td>{fmtDate(h.finishedAt)}</td>
                  <td>{nomeTipo(h.simulationType)}</td>
                  <td>{h.correctCount}/{h.totalCount}</td>
                  <td>{h.totalCount ? Math.round(((h.correctCount ?? 0) / h.totalCount) * 100) : 0}%</td>
                  <td>{h.passed ? 'Aprovado' : 'Reprovado'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted"><Link href="/app">Voltar para minha área</Link></p>
    </>
  );
}
