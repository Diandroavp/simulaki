import type { Ponto } from './enem-perfil';

/**
 * Estimativa GROSSEIRA da nota do ENEM. A nota real usa a Teoria de Resposta ao Item (TRI), que pesa
 * cada questão pela dificuldade e pela coerência das respostas, e não dá para reproduzi-la só com o % de acertos.
 * Aqui usamos uma reta: 0% ≈ 350 e 100% ≈ 850 pontos por área, com margem de ±40.
 */
export const NOTA_BASE = 350;
export const NOTA_POR_PONTO = 5;
export const MARGEM = 40;
export const MIN_RESPOSTAS_NOTA = 10;
export const REDACAO_PADRAO = 600;

export type NotaArea = { key: string; label: string; pct: number | null; nota: number | null; respondidas: number };
export type Estimativa = { areas: NotaArea[]; redacao: number; redacaoInformada: boolean; media: number | null; min: number | null; max: number | null; faltam: string[] };

export const notaDaArea = (pct: number) => Math.round(NOTA_BASE + NOTA_POR_PONTO * pct);

export function estimarNota(areas: Ponto[], redacao?: number | null): Estimativa {
  const red = redacao !== null && redacao !== undefined && redacao >= 0 && redacao <= 1000 ? Math.round(redacao) : REDACAO_PADRAO;
  const lista: NotaArea[] = areas.map((a) => {
    const pct = a.respondidas >= MIN_RESPOSTAS_NOTA ? Math.round((a.acertos / a.respondidas) * 100) : null;
    return { key: a.key, label: a.label, pct, nota: pct === null ? null : notaDaArea(pct), respondidas: a.respondidas };
  });
  const faltam = lista.filter((a) => a.nota === null).map((a) => a.label);
  if (faltam.length) return { areas: lista, redacao: red, redacaoInformada: redacao != null, media: null, min: null, max: null, faltam };
  const media = Math.round((lista.reduce((s, a) => s + a.nota!, 0) + red) / 5);
  return { areas: lista, redacao: red, redacaoInformada: redacao != null, media, min: Math.max(0, media - MARGEM), max: Math.min(1000, media + MARGEM), faltam };
}

export type Comparacao = { situacao: 'acima' | 'perto' | 'abaixo'; diferenca: number };

/** Compara a média estimada com a nota de corte que o aluno informou. */
export function compararComCorte(media: number, corte: number): Comparacao {
  const diferenca = Math.round(media - corte);
  return { situacao: diferenca >= MARGEM ? 'acima' : diferenca > -MARGEM ? 'perto' : 'abaixo', diferenca };
}

/** Quantos pontos de acerto por área faltam, em média, para chegar ao corte (cada ponto percentual vale NOTA_POR_PONTO/5 na média). */
export function pontosPercentuaisParaCorte(media: number, corte: number): number {
  return Math.max(0, Math.ceil((corte - media) / (NOTA_POR_PONTO * 4 / 5)));
}
