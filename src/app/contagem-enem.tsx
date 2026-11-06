import Link from 'next/link';
import { contagemEnem } from '@/lib/enem-calendario';

/** Faixa de contagem regressiva do ENEM. Some sozinha depois do 2º dia de prova. */
export function ContagemEnem({ logado = false }: { logado?: boolean }) {
  const c = contagemEnem();
  if (!c) return null;
  const href = logado && c.href === '/cadastro' ? '/app/enem' : c.href;
  return (
    <p className="note" role="status" style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
      <span><strong>ENEM 2026:</strong> {c.texto}</span>
      <Link className="btn" style={{ padding: '6px 12px' }} href={href}>{logado && c.href === '/cadastro' ? 'Ir para o ENEM' : c.cta}</Link>
    </p>
  );
}
