'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * Anúncio do AdSense, sempre NÃO personalizado e só depois do aceite do aluno.
 * O script do Google só é carregado após "Aceitar"; a escolha fica neste navegador.
 */
const CHAVE = 'simulaki-anuncios';
type Escolha = 'sim' | 'nao' | null;

function lerEscolha(): Escolha {
  try { const v = localStorage.getItem(CHAVE); return v === 'sim' || v === 'nao' ? v : null; } catch { return null; }
}

export function AdSlot({ client, slot }: { client: string; slot: string }) {
  const [escolha, setEscolha] = useState<Escolha | undefined>(undefined);
  const ref = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => { setEscolha(lerEscolha()); }, []);

  useEffect(() => {
    if (escolha !== 'sim' || pushed.current) return;
    pushed.current = true;
    const w = window as unknown as { adsbygoogle?: unknown[] & { requestNonPersonalizedAds?: number } };
    const empurrar = () => {
      try {
        w.adsbygoogle = w.adsbygoogle || [];
        w.adsbygoogle.requestNonPersonalizedAds = 1;
        w.adsbygoogle.push({});
      } catch { /* anúncio é opcional */ }
    };
    if (document.querySelector('script[data-adsense]')) { empurrar(); return; }
    const s = document.createElement('script');
    s.async = true; s.crossOrigin = 'anonymous'; s.dataset.adsense = '1';
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
    s.onload = empurrar;
    document.head.appendChild(s);
  }, [escolha, client]);

  const salvar = (v: 'sim' | 'nao') => { try { localStorage.setItem(CHAVE, v); } catch { /* sem armazenamento */ } setEscolha(v); };

  if (escolha === undefined || escolha === 'nao') return null;
  if (escolha === null) {
    return (
      <aside className="card" style={{ marginTop: 16, padding: '12px 16px' }} aria-label="Anúncios">
        <p style={{ margin: 0, fontSize: '.9rem' }}>
          A versão gratuita pode mostrar anúncios <strong>não personalizados</strong> (Google AdSense), que usam cookies. Quem assina não vê anúncios.
          {' '}<a href="/privacidade">Saiba mais</a>
        </p>
        <div className="row" style={{ marginTop: 8 }}>
          <button className="btn" type="button" onClick={() => salvar('sim')}>Aceitar anúncios</button>
          <button className="btn ghost" type="button" onClick={() => salvar('nao')}>Agora não</button>
        </div>
      </aside>
    );
  }
  return (
    <aside style={{ marginTop: 16, minHeight: 90 }} aria-label="Publicidade">
      <p className="muted" style={{ margin: '0 0 4px', fontSize: '.72rem' }}>Publicidade</p>
      <ins ref={ref} className="adsbygoogle" style={{ display: 'block' }} data-ad-client={client} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" />
    </aside>
  );
}
