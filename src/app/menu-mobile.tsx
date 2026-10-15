'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

/** Menu "hambúrguer" para telas pequenas; fecha sozinho ao trocar de página. */
export function MenuMobile({ links, children }: { links: { href: string; label: string; destaque?: boolean }[]; children?: React.ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const path = usePathname();
  useEffect(() => setAberto(false), [path]);
  return (
    <div className="menu-mob">
      <button className="menu-btn" aria-expanded={aberto} aria-controls="menu-painel" aria-label={aberto ? 'Fechar menu' : 'Abrir menu'} onClick={() => setAberto((a) => !a)}>
        <span aria-hidden>{aberto ? '✕' : '☰'}</span> Menu
      </button>
      {aberto && (
        <div id="menu-painel" className="menu-painel">
          {links.map((l) => <Link key={l.href} href={l.href} className={l.destaque ? 'btn' : ''}>{l.label}</Link>)}
          {children}
        </div>
      )}
    </div>
  );
}

/** Barra de navegação fixa na parte de baixo (só no celular, para quem está logado). */
export function TabBar() {
  const path = usePathname();
  const abas = [
    { href: '/app', label: 'Início', icone: '🏠', ativo: path === '/app' },
    { href: '/app/detran', label: 'Detran', icone: '🚗', ativo: path.startsWith('/app/detran') },
    { href: '/app/enem', label: 'ENEM', icone: '🎓', ativo: path.startsWith('/app/enem') || path === '/checklist' || path === '/plano' || path === '/nota' },
    { href: '/planos', label: 'Planos', icone: '⭐', ativo: path === '/planos' },
  ];
  return (
    <nav className="tabbar" aria-label="Navegação principal">
      {abas.map((a) => (
        <Link key={a.href} href={a.href} aria-current={a.ativo ? 'page' : undefined} className={a.ativo ? 'on' : ''}>
          <span aria-hidden>{a.icone}</span>{a.label}
        </Link>
      ))}
    </nav>
  );
}
