'use client';

import { useState } from 'react';

export function CopiarLink({ link }: { link: string }) {
  const [ok, setOk] = useState(false);
  async function copiar() {
    try { await navigator.clipboard.writeText(link); setOk(true); setTimeout(() => setOk(false), 2500); } catch { /* o link aparece na tela para copiar à mão */ }
  }
  const zap = `https://wa.me/?text=${encodeURIComponent(`Estou estudando no Simulaki e recomendo. Crie sua conta: ${link}`)}`;
  return (
    <>
      <input readOnly value={link} aria-label="Seu link de indicação" onFocus={(e) => e.currentTarget.select()} style={{ marginBottom: 8 }} />
      <div className="row" style={{ gap: 8 }}>
        <button className="btn ghost" onClick={copiar}>{ok ? 'Copiado!' : 'Copiar link'}</button>
        <a className="btn ghost" href={zap} target="_blank" rel="noopener noreferrer">WhatsApp</a>
      </div>
    </>
  );
}
