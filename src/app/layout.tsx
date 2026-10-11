import type { Metadata } from 'next';
import Link from 'next/link';
import { logoutAction } from './actions';
import { getCurrentUser } from '@/lib/auth';
import './globals.css';

export const metadata: Metadata = {
  title: 'Simulaki',
  description: 'Simulados para a prova teórica do Detran, ENEM, PSC e SIS.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="pt-BR">
      <body>
        {process.env.BETA === '1' && <div className="beta">Versão beta: o conteúdo ainda está em revisão e pode conter erros. Confira sempre a legislação oficial.</div>}
        <header className="top">
          <div className="wrap">
            <Link href="/" className="logo">Simulaki</Link>
            <nav>
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
          </div>
        </header>
        <main>{children}</main>
        <footer className="muted wrap" style={{ paddingBottom: 32 }}>
          Plataforma independente de simulados. Não é um serviço oficial do Detran, do INEP, da UFAM nem da UEA.
          <div><Link href="/termos">Termos de uso</Link> · <Link href="/privacidade">Privacidade</Link> · <Link href="/reembolso">Reembolso</Link></div>
        </footer>
      </body>
    </html>
  );
}
