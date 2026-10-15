'use client';

import { useState } from 'react';

/** Compartilha só o percentual e o nome do simulado (nada de questões nem dados pessoais). */
export function ShareResult({ nome, pct }: { nome: string; pct: number }) {
  const [copiado, setCopiado] = useState(false);
  const link = () => `${window.location.origin}/?utm_source=compartilhar`;
  const texto = () => `Fiz ${pct}% de acertos no simulado ${nome} do Simulaki. Teste o seu: ${link()}`;

  async function compartilhar() {
    try {
      if (navigator.share) { await navigator.share({ text: texto() }); return; }
    } catch { /* o aluno fechou a janela de compartilhar */ return; }
    try {
      await navigator.clipboard.writeText(texto());
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch { window.prompt?.('Copie e compartilhe:', texto()); }
  }

  return (
    <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
      <button className="btn ghost" onClick={compartilhar}>{copiado ? 'Copiado!' : 'Compartilhar resultado'}</button>
      <button className="btn ghost" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(texto())}`, '_blank', 'noopener,noreferrer')}>WhatsApp</button>
    </div>
  );
}
