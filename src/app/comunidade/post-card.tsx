import { denunciarAction, excluirAction } from './actions';
import { MOTIVOS_DENUNCIA, TIPOS } from '@/lib/comunidade-regras';
import type { Item } from '@/lib/comunidade';

const quando = (d: Date) => d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Manaus' });

/** Marcador de quem faz parte da equipe: ADM ou Moderador. */
export function Papel({ papel }: { papel: Item['papel'] }) {
  if (!papel) return null;
  return <span className="badge on" title={papel === 'admin' ? 'Administrador do Simulaki' : 'Moderador da comunidade'}>🛡️ {papel === 'admin' ? 'ADM' : 'Moderador'}</span>;
}

export function Selo({ kind }: { kind: string }) {
  const t = TIPOS.find((x) => x.id === kind);
  return t ? <span className="badge">{t.label}</span> : null;
}

/** Uma mensagem (publicação ou resposta) com as ações de denunciar e, para o autor, excluir. */
export function Mensagem({ item, raiz, meuId, resposta }: { item: Item; raiz: string; meuId: string; resposta?: boolean }) {
  const meu = item.autorId === meuId;
  return (
    <div className="card" style={{ marginBottom: 12, marginLeft: resposta ? 20 : 0 }}>
      <div className="row" style={{ marginTop: 0, alignItems: 'center', gap: 8 }}>
        <strong>{item.autor ?? 'Conta excluída'}</strong><Papel papel={item.papel} />
        {!resposta && <Selo kind={item.kind} />}
        <span className="muted">{quando(item.createdAt)}</span>
      </div>
      <p style={{ whiteSpace: 'pre-wrap', margin: '10px 0' }}>{item.body}</p>
      {item.status === 'visible' && (
        <div className="row" style={{ marginTop: 4, gap: 14 }}>
          {meu ? (
            <form action={excluirAction}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="raiz" value={raiz} /><button className="btn ghost" style={{ padding: '2px 10px', fontSize: '.85rem' }}>Excluir</button></form>
          ) : (
            <details>
              <summary className="muted" style={{ cursor: 'pointer' }}>Denunciar</summary>
              <form action={denunciarAction}>
                <input type="hidden" name="id" value={item.id} /><input type="hidden" name="raiz" value={raiz} />
                <label>Motivo<select name="motivo" required defaultValue="">
                  <option value="" disabled>Escolha</option>
                  {MOTIVOS_DENUNCIA.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select></label>
                <label>Quer explicar? (opcional)<input name="nota" maxLength={300} /></label>
                <div className="row"><button className="btn ghost">Enviar denúncia</button></div>
              </form>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
