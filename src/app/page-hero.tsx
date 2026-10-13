import type { ReactNode } from 'react';
import { Fita } from './ilustracoes';

/** Faixa de título das páginas internas: bloco verde com a fita colorida e borda em onda. */
export function PageHero({ title, lead, compact }: { title: ReactNode; lead?: ReactNode; compact?: boolean }) {
  return (
    <div className={`phero bleed ${compact ? 'compact' : ''}`}>
      <Fita className="fita" />
      <div className="phero-in">
        <h1>{title}</h1>
        {lead && <p className="lead">{lead}</p>}
      </div>
      <svg className="wave" viewBox="0 0 1440 60" preserveAspectRatio="none" aria-hidden><path d="M0 34C240 70 480 4 720 28S1200 64 1440 18V60H0Z" /></svg>
    </div>
  );
}

/** Tela dividida de entrar e cadastrar: painel verde de um lado, formulário do outro. */
export function AuthShell({ title, lead, children }: { title: ReactNode; lead: string; children: ReactNode }) {
  return (
    <div className="auth">
      <aside className="auth-side">
        <Fita className="fita" />
        <div style={{ position: 'relative' }}>
          <h2>{title}</h2>
          <p>{lead}</p>
        </div>
      </aside>
      <div className="auth-form">{children}</div>
    </div>
  );
}
