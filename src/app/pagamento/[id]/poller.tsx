'use client';
import { useEffect } from 'react';

export default function Poller({ paymentId }: { paymentId: string }) {
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const r = await fetch(`/api/pagamentos/${paymentId}/status`, { cache: 'no-store' });
        if (r.ok && (await r.json()).status === 'paid') location.reload();
      } catch {
        /* tenta de novo no próximo ciclo */
      }
    }, 4000);
    return () => clearInterval(t);
  }, [paymentId]);
  return <p className="muted" aria-live="polite">Aguardando pagamento…</p>;
}
