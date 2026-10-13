import Link from 'next/link';
import { GUIAS } from '@/lib/guias';
import { PageHero } from '../page-hero';

export const metadata = {
  title: 'Guias para a prova teórica da CNH',
  description: 'Regras da prova teórica, o que mudou, o Banco Nacional de Questões e como estudar.',
  alternates: { canonical: '/guia' },
};

export default function Page() {
  return (
    <>
      <PageHero title={<>Guias para a <em>prova teórica</em></>} lead="Informações conferidas nas normas oficiais, com a fonte em cada página." />
      <div className="guias">
        {GUIAS.map((g) => (
          <Link key={g.slug} className="guia" href={`/guia/${g.slug}`}>
            <b>{g.titulo}</b>
            <span>{g.resumo}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
