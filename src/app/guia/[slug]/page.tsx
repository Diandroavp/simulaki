import Link from 'next/link';
import { PageHero } from '../../page-hero';
import { notFound } from 'next/navigation';
import { FONTE_RESOLUCAO, getGuia, GUIAS } from '@/lib/guias';

export function generateStaticParams() {
  return GUIAS.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const g = getGuia((await params).slug);
  if (!g) return {};
  return {
    title: g.titulo,
    description: g.resumo,
    alternates: { canonical: `/guia/${g.slug}` },
    openGraph: { type: 'article', title: g.titulo, description: g.resumo, locale: 'pt_BR' },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const g = getGuia((await params).slug);
  if (!g) notFound();
  const base = process.env.APP_URL ?? '';
  const ld = [
    {
      '@context': 'https://schema.org', '@type': 'Article', headline: g.titulo, description: g.resumo,
      dateModified: g.atualizado, inLanguage: 'pt-BR', mainEntityOfPage: `${base}/guia/${g.slug}`,
      publisher: { '@type': 'Organization', name: 'Simulaki' },
    },
    {
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: g.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  ];
  return (
    <>
    <PageHero title={g.titulo} lead={g.intro} />
    <article className="legal">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
      <p className="muted"><Link href="/guia">Todos os guias</Link></p>
      {g.blocos.map((b, i) => (
        <section key={i}>
          {b.h && <h2>{b.h}</h2>}
          {b.p?.map((t, j) => <p key={j}>{t}</p>)}
          {b.ul && <ul>{b.ul.map((t, j) => <li key={j}>{t}</li>)}</ul>}
        </section>
      ))}
      <h2>Perguntas frequentes</h2>
      {g.faq.map((f) => (
        <details key={f.q} style={{ marginBottom: 8 }}>
          <summary><strong>{f.q}</strong></summary>
          <p>{f.a}</p>
        </details>
      ))}
      <div className="card" style={{ marginTop: 28 }}>
        <h3 style={{ marginTop: 0 }}>Treine no formato da prova</h3>
        <p className="muted" style={{ marginTop: 0 }}>30 questões, correção na hora, explicação e fonte em cada uma. 1 simulado grátis por dia.</p>
        <Link className="btn" href="/cadastro">Criar conta grátis</Link>
      </div>
      <p className="muted" style={{ fontSize: '.85rem', marginTop: 24 }}>
        Fonte: <a href={FONTE_RESOLUCAO.url} rel="noopener noreferrer">{FONTE_RESOLUCAO.nome}</a>. Atualizado em {new Date(g.atualizado + 'T12:00:00').toLocaleDateString('pt-BR')}.
        O Simulaki é independente e não é um serviço oficial. Confirme as regras no Detran do seu estado.
      </p>
    </article>
    </>
  );
}
