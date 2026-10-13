import Link from 'next/link';
import { PageHero } from '../../page-hero';
import { notFound } from 'next/navigation';
import { ESTADOS, FONTE_RESOLUCAO, GUIAS } from '@/lib/guias';
import { ensureOverrides } from '@/lib/question-overrides';
import { isAvailable, getSimulation } from '@/lib/simulations';

export function generateStaticParams() {
  return ESTADOS.map((e) => ({ uf: e.uf }));
}

const find = (uf: string) => ESTADOS.find((e) => e.uf === uf);

export async function generateMetadata({ params }: { params: Promise<{ uf: string }> }) {
  const e = find((await params).uf);
  if (!e) return {};
  const title = `Simulado Detran ${e.sigla}: prova teórica da CNH`;
  const description = `Simulado da prova teórica do Detran ${e.sigla} (${e.nome}): 30 questões, correção na hora, explicação e fonte em cada questão.`;
  return { title, description, alternates: { canonical: `/detran/${e.uf}` }, openGraph: { type: 'website', title, description, locale: 'pt_BR' } };
}

export default async function Page({ params }: { params: Promise<{ uf: string }> }) {
  const e = find((await params).uf);
  if (!e) notFound();
  await ensureOverrides();
  const sim = getSimulation(e.slug);
  const on = sim ? isAvailable(sim) : false;
  return (
    <>
    <PageHero title={<>Simulado <em>Detran {e.sigla}</em></>} lead={`Treine para a prova teórica da primeira habilitação em ${e.nome}, no formato definido pela Resolução CONTRAN 1.020/2025.`} />
    <article className="legal">
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Regras da prova</h3>
        <ul>
          <li>30 questões de múltipla escolha.</li>
          <li>Tempo mínimo de 1 hora (o dobro para quem tem dislexia, TDAH ou autismo).</li>
          <li>Aprovação com 20 acertos.</li>
        </ul>
        <p className="muted" style={{ marginBottom: 0 }}>
          Fonte: <a href={FONTE_RESOLUCAO.url} rel="noopener noreferrer">{FONTE_RESOLUCAO.nome}</a>. O Detran-{e.sigla} aplica a prova no sistema do estado; confirme com o órgão o formato do dia do exame.
        </p>
      </div>
      <div className="row">
        {on ? <Link className="btn" href="/cadastro">Fazer o simulado grátis</Link> : <span className="badge">Em breve para {e.nome}</span>}
        <Link className="btn ghost" href="/planos">Ver planos</Link>
      </div>
      <h2>Leia também</h2>
      <ul>
        {GUIAS.map((g) => <li key={g.slug}><Link href={`/guia/${g.slug}`}>{g.titulo}</Link></li>)}
      </ul>
      <p className="muted" style={{ fontSize: '.85rem' }}>O Simulaki é uma plataforma independente e não é um serviço oficial do Detran.</p>
    </article>
    </>
  );
}
