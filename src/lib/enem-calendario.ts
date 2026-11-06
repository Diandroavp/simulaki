/**
 * Datas do ENEM 2026 (domingos 8 e 15 de novembro; 1º dia: Linguagens, Ciências Humanas e redação;
 * 2º dia: Ciências da Natureza e Matemática). Atualize a cada edição, conferindo o edital do INEP.
 */
export const ENEM_DIA1 = '2026-11-08';
export const ENEM_DIA2 = '2026-11-15';

export type Contagem = { texto: string; cta: string; href: string };

/** Data civil em Manaus (UTC-4), AAAA-MM-DD. */
const hojeManaus = (now: Date) => new Date(now.getTime() - 4 * 3_600_000).toISOString().slice(0, 10);
const dias = (de: string, ate: string) => Math.round((Date.parse(ate + 'T00:00:00Z') - Date.parse(de + 'T00:00:00Z')) / 86_400_000);
const plural = (n: number) => `${n} ${n === 1 ? 'dia' : 'dias'}`;

/** Mensagem da contagem regressiva para o dia de hoje; null depois da 2ª prova. */
export function contagemEnem(now = new Date()): Contagem | null {
  const hoje = hojeManaus(now);
  const d1 = dias(hoje, ENEM_DIA1);
  const d2 = dias(hoje, ENEM_DIA2);
  if (d1 > 0) return { texto: `Faltam ${plural(d1)} para o 1º dia do ENEM (8/11).`, cta: 'Treinar agora', href: '/cadastro' };
  if (d1 === 0) return { texto: 'Hoje é o 1º dia do ENEM. Boa prova!', cta: 'Preparar o 2º dia', href: '/guia/semana-entre-as-provas-do-enem' };
  if (d2 > 0) return { texto: `1º dia feito? Faltam ${plural(d2)} para o 2º dia (15/11): Natureza e Matemática.`, cta: 'Ver a trilha da semana', href: '/guia/semana-entre-as-provas-do-enem' };
  if (d2 === 0) return { texto: 'Hoje é o 2º dia do ENEM. Boa prova!', cta: 'Ver os guias', href: '/guia' };
  return null;
}
