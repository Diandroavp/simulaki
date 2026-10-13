import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHero } from '../../page-hero';
import { ensureOverrides } from '@/lib/question-overrides';
import { getSimulation, isAvailable } from '@/lib/simulations';
import { VESTIBULARES, vestibular } from '@/lib/vestibulares';

export const revalidate = 60;

export function generateStaticParams() {
  return VESTIBULARES.map((v) => ({ slug: v.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const v = vestibular((await params).slug);
  if (!v) return {};
  return { title: v.titulo, description: v.lead, alternates: { canonical: `/prova/${v.slug}` }, openGraph: { type: 'website', title: v.titulo, description: v.lead, locale: 'pt_BR' } };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const v = vestibular((await params).slug);
  if (!v) notFound();
  await ensureOverrides();
  const sim = getSimulation(v.slug);
  const on = sim ? isAvailable(sim) : false;
  return (
    <>
      <PageHero title={<>Simulado <em>{v.nome}</em></>} lead={v.lead} />
      <article className="legal">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Sobre a prova</h3>
          <p>{v.quem}</p>
          <ul>{v.formato.map((f) => <li key={f}>{f}</li>)}</ul>
          <p className="muted" style={{ marginBottom: 0 }}>Fonte: <a href={v.fonte.url} rel="noopener noreferrer">{v.fonte.nome}</a>.</p>
        </div>
        <div className="row">
          {on ? <Link className="btn" href="/cadastro">Fazer o simulado</Link> : <span className="badge">Em breve</span>}
          <Link className="btn ghost" href="/planos">Ver planos</Link>
        </div>
        <p className="muted" style={{ fontSize: '.85rem' }}>{v.aviso}</p>
      </article>
    </>
  );
}
