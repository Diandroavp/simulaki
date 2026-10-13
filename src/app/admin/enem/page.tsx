import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { pagina, resumo, statusEfetivo, type Decisao } from '@/lib/enem-review';
import { TREINO_TEMAS } from '@/lib/treino';
import { Statement, optionText } from '../../question-body';
import { pendenteEnemAction, publicarEnemAction, rejeitarEnemAction, revisarEnemAction } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Revisão do ENEM' };

const FILTROS: { id: Decisao | 'todas'; nome: string }[] = [
  { id: 'pending', nome: 'Pendentes' }, { id: 'published', nome: 'Publicadas' }, { id: 'archived', nome: 'Rejeitadas' }, { id: 'todas', nome: 'Todas' },
];
const ROTULO = { published: 'Publicada', archived: 'Rejeitada', pending: 'Pendente' } as const;

export default async function AdminEnem({ searchParams }: { searchParams: Promise<{ c?: string; f?: string; p?: string; ok?: string; erro?: string }> }) {
  if (!(await requireAdmin())) redirect('/');
  const sp = await searchParams;
  const cads = await resumo();
  const caderno = /^\d{4}-d\d$/.test(sp.c ?? '') ? sp.c! : null;
  const filtro = (FILTROS.find((f) => f.id === sp.f)?.id ?? 'pending') as Decisao | 'todas';
  const tot = cads.reduce((a, c) => ({ total: a.total + c.total, published: a.published + c.published, archived: a.archived + c.archived }), { total: 0, published: 0, archived: 0 });

  return (
    <>
      <h1>Revisão do ENEM</h1>
      <p><Link href="/admin">Gestão</Link> · <Link href="/admin/questoes">Questões</Link></p>
      {sp.ok && <p className="ok">{sp.ok}</p>}
      {sp.erro && <p className="err">{sp.erro}</p>}
      <p className="muted">{tot.published} publicadas, {tot.archived} rejeitadas, {tot.total - tot.published - tot.archived} pendentes de {tot.total}. Só as publicadas aparecem para os alunos.</p>

      {!caderno ? (
        <table>
          <thead><tr><th>Caderno</th><th>Total</th><th>Publicadas</th><th>Rejeitadas</th><th>Pendentes</th><th /></tr></thead>
          <tbody>
            {cads.map((c) => (
              <tr key={c.caderno}>
                <td><strong>ENEM {c.caderno.replace('-d', ' · dia ')}</strong></td><td>{c.total}</td><td>{c.published}</td><td>{c.archived}</td><td>{c.pending}</td>
                <td><Link href={`/admin/enem?c=${c.caderno}`}>Revisar</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <Caderno caderno={caderno} filtro={filtro} p={Number(sp.p) || 1} resumoCad={cads.find((c) => c.caderno === caderno)} />
      )}
    </>
  );
}

async function Caderno({ caderno, filtro, p, resumoCad }: { caderno: string; filtro: Decisao | 'todas'; p: number; resumoCad?: { total: number; published: number; archived: number; pending: number } }) {
  const pg = await pagina(caderno, filtro, p);
  const volta = `/admin/enem?c=${caderno}&f=${filtro}&p=${pg.atual}`;
  const href = (f: string, n = 1) => `/admin/enem?c=${caderno}&f=${f}&p=${n}`;
  return (
    <>
      <p><Link href="/admin/enem">← Todos os cadernos</Link></p>
      <h2>ENEM {caderno.replace('-d', ' · dia ')}</h2>
      <p className="muted">{resumoCad?.published ?? 0} publicadas · {resumoCad?.archived ?? 0} rejeitadas · {resumoCad?.pending ?? 0} pendentes</p>
      <p className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        {FILTROS.map((f) => <Link key={f.id} className={f.id === filtro ? 'btn' : 'btn ghost'} style={{ padding: '6px 14px' }} href={href(f.id)}>{f.nome}</Link>)}
      </p>

      {pg.itens.length === 0 ? <p className="muted">Nenhuma questão neste filtro.</p> : (
        <form action={publicarEnemAction}>
          <input type="hidden" name="caderno" value={caderno} />
          <input type="hidden" name="volta" value={volta} />
          <p className="muted">Todas vêm marcadas. Desmarque as que tiverem problema (texto cortado, figura errada, gabarito duvidoso) e use os botões abaixo.</p>
          {pg.itens.map((q) => {
            const st = statusEfetivo(q);
            return (
              <div className="card" key={q.id} style={{ marginBottom: 12 }}>
                <label className="chk" style={{ fontWeight: 600 }}>
                  <input type="checkbox" name="id" value={q.id} defaultChecked />
                  <span>{q.id} · {TREINO_TEMAS[q.topic] ?? q.topic} · <em>{ROTULO[st]}</em></span>
                </label>
                <Statement text={q.statement} images={q.images} hideText={q.optionsAsImage && !!q.images?.length && q.statement.length < 4} />
                {!q.optionsAsImage && (
                  <ol type="A" style={{ paddingLeft: 22 }}>
                    {q.options.map((o) => (
                      <li key={o.id} style={o.id === q.correctOptionId ? { fontWeight: 700 } : undefined}>{optionText(o.text, o.id)}{o.id === q.correctOptionId ? ' ✔' : ''}</li>
                    ))}
                  </ol>
                )}
                <p className="muted" style={{ margin: 0 }}>Gabarito: <strong>{q.correctOptionId.toUpperCase()}</strong>{q.sourceRef ? ` · ${q.sourceRef}` : ''}</p>
              </div>
            );
          })}
          <p className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <button className="btn">Publicar marcadas</button>
            <button className="btn ghost" formAction={rejeitarEnemAction}>Rejeitar marcadas</button>
            <button className="btn ghost" formAction={pendenteEnemAction}>Voltar a pendente</button>
          </p>
        </form>
      )}

      <p className="row" style={{ gap: 8 }}>
        {pg.atual > 1 && <Link className="btn ghost" href={href(filtro, pg.atual - 1)}>← Anterior</Link>}
        <span className="muted">Página {pg.atual} de {pg.paginas} ({pg.total} questões)</span>
        {pg.atual < pg.paginas && <Link className="btn ghost" href={href(filtro, pg.atual + 1)}>Próxima →</Link>}
      </p>

      {(resumoCad?.pending ?? 0) > 0 && (
        <form action={revisarEnemAction} className="card">
          <h3 style={{ marginTop: 0 }}>Publicar todas as pendentes deste caderno</h3>
          <p className="muted">Faça isto só depois de amostrar. Para confirmar, digite <strong>{caderno}</strong>.</p>
          <input type="hidden" name="caderno" value={caderno} />
          <input type="hidden" name="volta" value={`/admin/enem?c=${caderno}`} />
          <input type="hidden" name="escopo" value="caderno-pendentes" />
          <input type="hidden" name="decisao" value="published" />
          <input name="confirma" placeholder={caderno} autoComplete="off" style={{ maxWidth: 160, marginRight: 8 }} />
          <button className="btn">Publicar {resumoCad?.pending} pendentes</button>
        </form>
      )}
    </>
  );
}
