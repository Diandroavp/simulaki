import { userHasAccess } from '@/lib/billing';
import { carregarPatrocinadores, escolherPatrocinador, type Tela } from '@/lib/patrocinio';

/** Banner "oferecido por": só para quem não tem plano, nunca em simulado/treino. Sem rastreamento. */
export async function Patrocinio({ userId, tela, mundo }: { userId: string; tela: Tela; mundo?: string }) {
  const lista = carregarPatrocinadores();
  if (!lista.length) return null;
  const { full } = await userHasAccess(userId);
  const p = escolherPatrocinador(lista, { tela, mundo, pago: full });
  if (!p) return null;
  return (
    <aside className="card" style={{ marginTop: 16, padding: '12px 16px' }} aria-label="Patrocínio">
      <p className="muted" style={{ margin: 0, fontSize: '.78rem' }}>Oferecido por</p>
      <p style={{ margin: '2px 0 0' }}>
        <a href={p.url} target="_blank" rel="sponsored noopener noreferrer"><strong>{p.nome}</strong></a>
        {' · '}<span className="muted">{p.texto}</span>
      </p>
    </aside>
  );
}
