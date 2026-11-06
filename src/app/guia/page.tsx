import Link from 'next/link';
import { GUIAS } from '@/lib/guias';
import { PageHero } from '../page-hero';

const NOTICIAS = GUIAS.filter((g) => g.tipo === 'noticia').sort((a, b) => (b.publicado ?? '').localeCompare(a.publicado ?? ''));

export const metadata = {
  title: 'Notícias e guias: CNH e ENEM',
  description: 'Regras da prova teórica da CNH, o que mudou, como estudar e guias do ENEM, com a fonte em cada página.',
  alternates: { canonical: '/guia' },
};

export default function Page() {
  return (
    <>
      <PageHero title={<>Guias para a <em>prova teórica</em></>} lead="Informações conferidas nas normas oficiais, com a fonte em cada página." />
      {NOTICIAS.length > 0 && (
        <>
          <h2>Notícias</h2>
          <div className="guias">
            {NOTICIAS.map((g) => (
              <Link key={g.slug} className="guia" href={`/guia/${g.slug}`}>
                <b>{g.titulo}</b>
                <span>{new Date(g.publicado + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} · {g.resumo}</span>
              </Link>
            ))}
          </div>
          <h2 style={{ marginTop: 32 }}>Guias da CNH</h2>
        </>
      )}
      <div className="guias">
        {GUIAS.filter((g) => g.tipo !== 'noticia' && g.tema !== 'enem').map((g) => (
          <Link key={g.slug} className="guia" href={`/guia/${g.slug}`}>
            <b>{g.titulo}</b>
            <span>{g.resumo}</span>
          </Link>
        ))}
      </div>
      <h2 style={{ marginTop: 32 }}>Guias do ENEM</h2>
      <div className="guias">
        {GUIAS.filter((g) => g.tipo !== 'noticia' && g.tema === 'enem').map((g) => (
          <Link key={g.slug} className="guia" href={`/guia/${g.slug}`}>
            <b>{g.titulo}</b>
            <span>{g.resumo}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
