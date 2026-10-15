import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getOpenAttempt, getStats } from '@/lib/attempts';
import { desempenho } from '@/lib/desempenho';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { mundoDeTipo, mundoPorSlug, UFS_DETRAN } from '@/lib/mundos';
import { escolherUfAction } from './actions';
import { getSimulation, nomeTipo } from '@/lib/simulations';
import { resumoErros } from '@/lib/treino';
import { ensureOverrides } from '@/lib/question-overrides';
import { PageHero } from '../../page-hero';
import { Patrocinio } from '../../patrocinio';
import { perfilEnem } from '@/lib/enem-perfil';
import { marcasManuais } from '@/lib/enem-checklist';
import { montarPlano } from '@/lib/enem-plano';

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
  const db = await getDb();
  const [perfilUf] = await db.select({ uf: schema.users.detranUf }).from(schema.users).where(eq(schema.users.id, user.id)).limit(1);
  const uf = UFS_DETRAN.find((x) => x.uf === perfilUf?.uf);
  const hist = history.filter((h) => mundoDeTipo(h.simulationType) === m.slug);
  const emAndamento = open && mundoDeTipo(open.simulationType) === m.slug ? open : null;
  const enem = m.slug === 'enem';
  const reta = enem && d.diasProva !== null && d.diasProva >= 0 && d.diasProva <= 30;
  const focoReta = reta
    ? montarPlano(await perfilEnem(user.id), await marcasManuais(user.id), d.diasProva).dias.filter((x) => x.assunto).slice(0, 3)
    : [];
  return (
    <>
      <PageHero compact title={<>{m.emoji} <em>{m.nome}</em></>} />
      <Patrocinio userId={user.id} tela="hub" mundo={m.slug} />
      {emAndamento && <p className="note">Você tem um simulado em andamento. <Link href={emAndamento.simulationType.startsWith('custom:') ? `/personalizado?mundo=${m.slug}&retomar=1` : `/simulado/${emAndamento.simulationType}`}>Continuar</Link></p>}
      {reta && (
        <div className="card" style={{ marginTop: 16, background: 'var(--brand-soft)' }}>
          <h3 style={{ marginTop: 0 }}>🏁 Reta final: {d.diasProva === 0 ? 'a prova é hoje!' : `faltam ${d.diasProva} ${d.diasProva === 1 ? 'dia' : 'dias'}`}</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            {d.diasProva! <= 7 ? 'Agora é revisar o que já viu, descansar bem e manter o ritmo. Evite assunto novo.' : 'Foque onde cada acerto vale mais. Treinos curtos todo dia somam muito.'}
          </p>
          {focoReta.length > 0 && (
            <div className="row" style={{ marginBottom: 8 }}>
              {focoReta.map((x) => <Link key={x.assunto} className="btn" href={`/treino?mundo=enem&tema=${x.assunto}`}>{x.titulo}</Link>)}
            </div>
          )}
          <div className="row">
            {erros > 0 && <Link className="btn ghost" href="/treino?mundo=enem">Revisar {erros} {erros === 1 ? 'erro' : 'erros'}</Link>}
            <Link className="btn ghost" href="/plano">Ver plano</Link>
          </div>
        </div>
      )}
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
          <div className="card"><h3 style={{ marginTop: 0 }}>📈 Nota estimada</h3><p className="muted">Uma ideia de onde você está e quanto falta para o curso que você quer.</p><Link className="btn ghost" href="/nota">Ver minha nota</Link></div>
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

      {!enem && !uf ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Em qual estado você vai fazer a prova?</h3>
          <p className="muted" style={{ marginTop: 0 }}>Cada Detran tem suas regras. Escolha o seu e mostramos só o simulado certo. Você pode trocar quando quiser.</p>
          <form action={escolherUfAction} className="row">
            {UFS_DETRAN.map((x) => <button key={x.uf} name="uf" value={x.uf} className="btn">{x.nome}</button>)}
          </form>
        </div>
      ) : (
        <>
          <h2>{enem ? 'Prova completa' : `Simulado do Detran ${uf!.uf}`}</h2>
          <div className="grid">
            {(enem ? m.simulados : [uf!.slug]).map((slug) => {
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
          {!enem && (
            <form action={escolherUfAction} className="muted" style={{ marginTop: 8 }}>
              <input type="hidden" name="uf" value="" />
              Estudando para {uf!.nome}. <button className="btn ghost" style={{ padding: '2px 10px' }}>Trocar estado</button>
            </form>
          )}
        </>
      )}

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
