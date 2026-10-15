import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { desempenho } from '@/lib/desempenho';
import { perfilEnem } from '@/lib/enem-perfil';
import { marcasManuais } from '@/lib/enem-checklist';
import { montarPlano } from '@/lib/enem-plano';
import { PageHero } from '../page-hero';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Plano da semana' };

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?erro=${encodeURIComponent('Entre para ver seu plano.')}`);
  const [d, perfil, manuais] = await Promise.all([desempenho(user.id), perfilEnem(user.id), marcasManuais(user.id)]);
  const plano = montarPlano(perfil, manuais, d.diasProva);
  return (
    <>
      <PageHero compact title={<>Seu plano da <em>semana</em></>} />
      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ margin: 0 }}>
          {plano.retaFinal ? '🏁 Reta final! Ritmo mais forte: ' : '📅 Plano feito pra você: '}
          cerca de <strong>{plano.ritmo} questões por dia</strong>, começando pelo que mais vai render nota.
          {d.diasProva === null && <> Informe a data da sua prova em <Link href="/desempenho">Meu desempenho</Link> e eu ajusto o ritmo.</>}
          {d.diasProva !== null && <> Faltam <strong>{d.diasProva} dias</strong> para a prova.</>}
        </p>
      </div>
      <ol className="plano">
        {plano.dias.map((x) => (
          <li key={x.dia} className="card">
            <span className="plano-dia">{x.dia}</span>
            <div style={{ minWidth: 0 }}>
              <strong>{x.titulo}</strong>
              <p className="muted" style={{ margin: '4px 0 0' }}>{x.detalhe}</p>
            </div>
            <Link className="btn ghost" style={{ padding: '4px 14px' }} href="/personalizado">Treinar</Link>
          </li>
        ))}
      </ol>
      <p className="muted">O plano se atualiza sozinho conforme você responde e marca seu <Link href="/checklist">checklist</Link>. <Link href="/desempenho">Voltar ao desempenho</Link></p>
    </>
  );
}
