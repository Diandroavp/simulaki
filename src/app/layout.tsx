import type { Metadata } from 'next';
import Link from 'next/link';
import { logoutAction } from './actions';
import { getCurrentUser } from '@/lib/auth';
import { MenuMobile, TabBar } from './menu-mobile';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/geist';
import '@fontsource-variable/caveat';
import '@fontsource-variable/playfair-display/wght.css';
import '@fontsource-variable/playfair-display/wght-italic.css';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? 'http://localhost:3000'),
  title: { default: 'Simulaki | Simulados para a prova do Detran', template: '%s | Simulaki' },
  description: 'Treine no formato da prova teórica do Detran com cronômetro, correção na hora e explicação de cada questão com a base legal.',
  openGraph: { type: 'website', locale: 'pt_BR', siteName: 'Simulaki', title: 'Simulaki | Simulados para a prova do Detran', description: 'Simulados com cronômetro, correção na hora e explicação com a base legal.' },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const links = user
    ? [
        { href: '/app', label: 'Minha área' }, { href: '/planos', label: 'Planos' },
        ...(user.role === 'partner_admin' ? [{ href: '/parceiro', label: 'Meu parceiro' }] : []),
        ...(user.role === 'admin' || user.role === 'staff' ? [{ href: '/admin', label: 'Gestão' }, { href: '/admin/parceiros', label: 'Parceiros' }] : []),
      ]
    : [{ href: '/planos', label: 'Planos' }, { href: '/entrar', label: 'Entrar' }, { href: '/cadastro', label: 'Criar conta grátis', destaque: true }];
  return (
    <html lang="pt-BR">
      <body>
        {process.env.BETA === '1' && <div className="beta">Versão beta: o conteúdo ainda está em revisão e pode conter erros. Confira sempre a legislação oficial.</div>}
        <header className="top">
          <div className="wrap">
            <Link href="/" className="logo">Simulaki</Link>
            <nav className="nav-desk">
              <Link href="/planos">Planos</Link>
              {user ? (
                <>
                  <Link href="/app">Minha área</Link>
                  {user.role === 'partner_admin' && <Link href="/parceiro">Meu parceiro</Link>}
                  {(user.role === 'admin' || user.role === 'staff') && <><Link href="/admin">Gestão</Link><Link href="/admin/parceiros">Parceiros</Link></>}
                  <form action={logoutAction}><button className="btn ghost" style={{ padding: '6px 12px' }}>Sair</button></form>
                </>
              ) : (
                <>
                  <Link href="/entrar">Entrar</Link>
                  <Link className="btn" style={{ padding: '8px 14px' }} href="/cadastro">Criar conta grátis</Link>
                </>
              )}
            </nav>
            <MenuMobile links={links}>
              {user && <form action={logoutAction}><button className="btn ghost">Sair</button></form>}
            </MenuMobile>
          </div>
        </header>
        <main>{children}</main>
        {user && <TabBar />}
        <footer className="foot">
          <div className="wrap">
            <p className="muted" style={{ margin: 0 }}>Plataforma independente de simulados. Não é um serviço oficial do Detran, do INEP, da UFAM nem da UEA.</p>
            <nav>
              <Link href="/guia">Guias</Link>
              <Link href="/planos">Planos</Link>
              <Link href="/termos">Termos de uso</Link>
              <Link href="/privacidade">Privacidade</Link>
              <Link href="/reembolso">Reembolso</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
