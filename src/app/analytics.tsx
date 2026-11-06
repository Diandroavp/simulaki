'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Google Analytics 4 com aviso de cookies. Sem aceite do visitante, o Google recebe o "consent mode" como negado
 * (sem cookies de medição). A escolha fica neste navegador. Não mede páginas de gestão, de pagamento nem de simulado em andamento.
 */
const CHAVE = 'simulaki-analytics';
const IGNORAR = ['/admin', '/pagamento', '/assinar'];

export function Analytics({ id }: { id: string }) {
  const path = usePathname() ?? '';
  const [escolha, setEscolha] = useState<'sim' | 'nao' | null | undefined>(undefined);

  useEffect(() => {
    try { const v = localStorage.getItem(CHAVE); setEscolha(v === 'sim' || v === 'nao' ? v : null); } catch { setEscolha(null); }
  }, []);

  const salvar = (v: 'sim' | 'nao') => {
    try { localStorage.setItem(CHAVE, v); } catch { /* sem armazenamento */ }
    setEscolha(v);
  };

  if (IGNORAR.some((p) => path.startsWith(p))) return null;
  if (escolha === undefined) return null;

  return (
    <>
      <Script id="ga-init" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('consent','default',{analytics_storage:'${escolha === 'sim' ? 'granted' : 'denied'}',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
        gtag('js', new Date());
        gtag('config','${id}');
      `}</Script>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      {escolha === null && (
        <div role="region" aria-label="Aviso de cookies" style={{ position: 'fixed', left: 12, right: 12, bottom: 12, zIndex: 50, maxWidth: 560, margin: '0 auto', background: 'var(--card, #fff)', border: '1px solid var(--line, #ddd)', borderRadius: 12, padding: 14, boxShadow: '0 6px 24px rgba(0,0,0,.15)' }}>
          <p style={{ margin: '0 0 10px', fontSize: '.9rem' }}>Usamos o Google Analytics para entender quais páginas ajudam mais os alunos. Pode recusar sem perder nada. <a href="/privacidade">Saiba mais</a>.</p>
          <div className="row">
            <button className="btn" type="button" onClick={() => { salvar('sim'); (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.('consent', 'update', { analytics_storage: 'granted' }); }}>Aceitar</button>
            <button className="btn ghost" type="button" onClick={() => salvar('nao')}>Recusar</button>
          </div>
        </div>
      )}
    </>
  );
}
