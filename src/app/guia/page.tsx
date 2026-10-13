import Link from 'next/link';
import { GUIAS } from '@/lib/guias';

export const metadata = {
  title: 'Guias para a prova teórica da CNH',
  description: 'Regras da prova teórica, o que mudou, o Banco Nacional de Questões e como estudar.',
  alternates: { canonical: '/guia' },
};

export default function Page() {
  return (
    <div className="legal">
      <h1>Guias para a prova teórica</h1>
      <p className="muted">Informações conferidas nas normas oficiais, com a fonte em cada página.</p>
      <ul className="simlist">
        {GUIAS.map((g) => (
          <li key={g.slug}>
            <Link className="name" href={`/guia/${g.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>{g.titulo}</Link>
            <span className="desc">{g.resumo}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
