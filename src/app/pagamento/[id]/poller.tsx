'use client';
import { useCallback, useEffect, useState } from 'react';

/** Consulta o status a cada 4s e recarrega a página quando o pagamento é confirmado. */
export default function Poller({ paymentId, suporte }: { paymentId: string; suporte: string }) {
  const [secs, setSecs] = useState(0);
  const [gw, setGw] = useState<string>('');
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const r = await fetch(`/api/pagamentos/${paymentId}/status`, { cache: 'no-store' });
      if (r.ok) {
        const j = await r.json();
        if (j.status === 'paid') {
          location.reload();
          return;
        }
        setGw(String(j.gateway ?? ''));
      }
    } catch {
      /* tenta de novo no próximo ciclo */
    } finally {
      setChecking(false);
    }
  }, [paymentId]);

  useEffect(() => {
    const poll = setInterval(check, 4000);
    const clock = setInterval(() => setSecs((x) => x + 1), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [check]);

  const slow = secs >= 90;
  const veryslow = secs >= 300;
  return (
    <div className="waitbox" aria-live="polite">
      <p className="waiting">
        <span className="pulse" aria-hidden />
        <span>
          <strong>{secs < 20 ? 'Aguardando o pagamento' : 'Já fez o Pix? Estamos conferindo com o banco'}</strong>
          <br />
          Esta página libera seu acesso sozinha, não precisa enviar comprovante.
        </span>
      </p>
      <div className="tips">
        <p><strong>Já pagou?</strong> Aguarde nesta página. A confirmação costuma levar de alguns segundos a 2 minutos.</p>
        <p><strong>Não pague de novo.</strong> Se o Pix saiu da sua conta, ele está a caminho e não se perde.</p>
      </div>
      {slow && (
        <div className="note" style={{ marginTop: 12 }}>
          <strong>Está levando mais que o normal.</strong> Às vezes o banco demora para avisar. Seu pagamento está registrado e o acesso é liberado assim que for confirmado.
          {veryslow && (
            <>
              {' '}Se passar de 10 minutos, escreva para <a href={`mailto:${suporte}`}>{suporte}</a> com o código <b className="tabnum">{paymentId.slice(0, 8)}</b> e o comprovante.
            </>
          )}
        </div>
      )}
      <button type="button" className="btn ghost" onClick={check} disabled={checking} style={{ width: '100%', marginTop: 12 }}>
        {checking ? 'Verificando…' : 'Já paguei, verificar agora'}
      </button>
      {slow && gw && <p className="muted" style={{ margin: '8px 0 0', fontSize: '.8rem' }}>Código de verificação: {gw}</p>}
    </div>
  );
}

export function CopyPix({ code }: { code: string }) {
  const [ok, setOk] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const el = document.getElementById('pix-code');
      if (el) {
        const r = document.createRange();
        r.selectNodeContents(el);
        const s = getSelection();
        s?.removeAllRanges();
        s?.addRange(r);
      }
    }
    setOk(true);
    setTimeout(() => setOk(false), 2500);
  }
  return (
    <button type="button" className="btn" onClick={copy} style={{ width: '100%' }}>
      {ok ? 'Código copiado ✓' : 'Copiar código Pix'}
    </button>
  );
}

export function Countdown({ until }: { until: string }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const end = new Date(until).getTime();
    const tick = () => setLeft(Math.max(0, Math.floor((end - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [until]);
  if (left === null) return null;
  const m = String(Math.floor(left / 60)).padStart(2, '0');
  const s = String(left % 60).padStart(2, '0');
  return <span className="tabnum">{left === 0 ? 'expirado' : `expira em ${m}:${s}`}</span>;
}
