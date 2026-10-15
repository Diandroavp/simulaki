import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { AREAS, contagemPorAssunto } from '@/lib/assuntos';
import { perfilEnem } from '@/lib/enem-perfil';
import { STATUS, marcasManuais, statusFinal } from '@/lib/enem-checklist';
import { PageHero } from '../page-hero';
import { marcarAssuntoAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Checklist de estudos' };

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?erro=${encodeURIComponent('Entre para ver seu checklist.')}`);
  const [perfil, manuais] = await Promise.all([perfilEnem(user.id), marcasManuais(user.id)]);
  const qtd = contagemPorAssunto();
  let dominados = 0, total = 0;
  const blocos = AREAS.map((a) => ({
    a,
    itens: perfil.assuntos[a.key].map((p) => {
      const f = statusFinal(manuais[p.key], p);
      total++; if (f.status === 'dominado') dominados++;
      return { p, ...f };
    }),
  }));
  return (
    <>
      <PageHero compact title={<>Checklist de <em>estudos</em></>} />
      <div className="card" style={{ marginBottom: 16 }}>
        <strong>{dominados} de {total} assuntos dominados</strong>
        <div className="meter" style={{ margin: '8px 0' }}><i style={{ width: `${total ? Math.round((dominados / total) * 100) : 0}%` }} /></div>
        <p className="muted" style={{ margin: 0 }}>O status muda sozinho conforme você responde (dominado: 10 respostas ou mais com 80% de acertos). Se preferir, marque você mesmo: sua marcação vale mais.</p>
      </div>
      {blocos.map(({ a, itens }) => (
        <div className="card" key={a.key} style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>{a.label}</h3>
          <ul className="chk-list">
            {itens.map(({ p, status, manual }) => (
              <li key={p.key}>
                <div>
                  <strong>{p.label}</strong>
                  <div className="muted">
                    {p.respondidas > 0 ? `${p.acertos}/${p.respondidas} acertos` : 'nenhuma resposta ainda'}
                    {qtd[p.key] ? ` · ${qtd[p.key]} questões no banco` : ''}
                    {manual ? ' · marcado por você' : ''}
                  </div>
                </div>
                <form action={marcarAssuntoAction} className="chk-opts">
                  <input type="hidden" name="assunto" value={p.key} />
                  {STATUS.map((s) => (
                    <button key={s.key} name="status" value={s.key} className={`chk chk-${s.key}${status === s.key ? ' on' : ''}`} aria-pressed={status === s.key}>{s.label}</button>
                  ))}
                  {manual && <button name="status" value="auto" className="chk auto" title="Voltar ao automático">Automático</button>}
                </form>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p><Link href="/desempenho">Voltar ao desempenho</Link></p>
    </>
  );
}
