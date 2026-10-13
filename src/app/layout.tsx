import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { logoutAction } from './actions';
import { getCurrentUser } from '@/lib/auth';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? 'http://localhost:3000'),
  title: { default: 'Simulaki | Simulados para a prova do Detran', template: '%s | Simulaki' },
  description: 'Treine no formato da prova teórica do Detran com cronômetro, correção na hora e explicação de cada questão com a base legal.',
  openGraph: { type: 'website', locale: 'pt_BR', siteName: 'Simulaki', title: 'Simulaki | Simulados para a prova do Detran', description: 'Simulados com cronômetro, correção na hora e explicação com a base legal.' },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const t = (await cookies()).get('tema')?.value;
  const tema = t === 'placa' || t === 'painel' ? t : 'cartao';
  return (
    <html lang="pt-BR" data-tema={tema}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Young+Serif&family=Hanken+Grotesk:wght@400;500;600;700&family=Archivo:wght@400;600;800&family=Archivo+Black&family=Chakra+Petch:wght@500;600;700&family=Figtree:wght@400;500;700&display=swap" />
      </head>
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
          <div className="tema" aria-label="Aparência do site">
            Aparência:
            {([['cartao', 'Cartão-resposta'], ['placa', 'Placa'], ['painel', 'Painel']] as const).map(([k, n]) => (
              <a key={k} href={`/api/tema?t=${k}`} aria-current={tema === k}>{n}</a>
            ))}
          </div>
          <div><Link href="/guia">Guias</Link> · <Link href="/termos">Termos de uso</Link> · <Link href="/privacidade">Privacidade</Link> · <Link href="/reembolso">Reembolso</Link></div>
        </footer>
      </body>
    </html>
  );
}
