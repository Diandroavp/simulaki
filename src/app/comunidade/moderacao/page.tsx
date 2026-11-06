import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireModerator } from '@/lib/auth';
import { denunciasAbertas, ocultadas, silenciados } from '@/lib/comunidade';
import { MOTIVOS_DENUNCIA } from '@/lib/comunidade-regras';
import { decidirAction, reativarAction, restaurarAction } from '../actions';

export const metadata = { title: 'Moderação', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const motivo = (id: string) => MOTIVOS_DENUNCIA.find((m) => m.id === id)?.label ?? id;
const quando = (d: Date) => d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Manaus' });

export default async function Moderacao() {
  if (!(await requireModerator())) redirect('/');
  const [abertas, ocultas, mudos] = await Promise.all([denunciasAbertas(), ocultadas(), silenciados()]);
  return (
    <div style={{ maxWidth: 820 }}>
      <h1>🛡️ Moderação</h1>
      <p className="muted"><Link href="/comunidade">← Comunidade</Link></p>

      <h2 style={{ fontSize: '1.3rem' }}>Denúncias abertas ({abertas.length})</h2>
      {abertas.length === 0 && <div className="card"><p style={{ margin: 0 }}>Nenhuma denúncia aberta. Tudo tranquilo por aqui.</p></div>}
      {abertas.map((d) => (
        <div className="card" key={d.postId} style={{ marginBottom: 12 }}>
          <div className="muted">Autor: <strong>{d.item.autor ?? 'conta excluída'}</strong>{d.item.papel ? ` (${d.item.papel === 'admin' ? 'ADM' : 'moderador'})` : ''} · {quando(d.item.createdAt)} · {d.item.status === 'hidden' ? 'oculta (3 denúncias)' : 'visível'}{d.autorSilenciado ? ' · autor silenciado' : ''}</div>
          <p style={{ whiteSpace: 'pre-wrap', margin: '10px 0' }}>{d.item.body}</p>
          <ul style={{ margin: '0 0 10px' }}>
            {d.denuncias.map((x, i) => <li key={i}>{motivo(x.reason)}{x.note ? `: "${x.note}"` : ''} <span className="muted">(por {x.por ?? '—'})</span></li>)}
          </ul>
          <form action={decidirAction} className="row" style={{ marginTop: 0 }}>
            <input type="hidden" name="id" value={d.postId} />
            <button className="btn ghost" name="decisao" value="manter">Manter visível</button>
            <button className="btn ghost" name="decisao" value="ocultar">Ocultar</button>
            <button className="btn" name="decisao" value="ocultar-silenciar">Ocultar e silenciar autor</button>
          </form>
        </div>
      ))}

      <h2 style={{ fontSize: '1.3rem' }}>Ocultas ({ocultas.length})</h2>
      {ocultas.length === 0 && <p className="muted">Nada oculto.</p>}
      {ocultas.map((o) => (
        <div className="card" key={o.id} style={{ marginBottom: 12 }}>
          <div className="muted">{o.autor ?? 'conta excluída'} · {quando(o.createdAt)}</div>
          <p style={{ whiteSpace: 'pre-wrap', margin: '8px 0' }}>{o.body}</p>
          <form action={restaurarAction}><input type="hidden" name="id" value={o.id} /><button className="btn ghost">Restaurar</button></form>
        </div>
      ))}

      <h2 style={{ fontSize: '1.3rem' }}>Silenciados ({mudos.length})</h2>
      {mudos.length === 0 && <p className="muted">Ninguém silenciado.</p>}
      {mudos.map((m) => (
        <form key={m.id} action={reativarAction} className="row" style={{ alignItems: 'center' }}>
          <input type="hidden" name="id" value={m.id} /><strong>{m.apelido ?? 'sem apelido'}</strong><button className="btn ghost">Reativar</button>
        </form>
      ))}
    </div>
  );
}
