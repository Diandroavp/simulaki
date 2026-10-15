/**
 * "Mundos": cada prova/concurso é um universo próprio (Detran, ENEM…). Desempenho, caderno de erros,
 * treino e simulados nunca se misturam entre mundos.
 */
export type Mundo = 'detran' | 'enem';

export const MUNDOS: { slug: Mundo; nome: string; emoji: string; descricao: string; bancos: string[]; simulados: string[] }[] = [
  { slug: 'detran', nome: 'Detran', emoji: '🚗', descricao: 'Prova teórica de habilitação: legislação, sinalização, direção defensiva e mais.', bancos: ['AM', 'SP', 'BA'], simulados: ['detran-am', 'detran-sp', 'detran-ba'] },
  { slug: 'enem', nome: 'ENEM', emoji: '🎓', descricao: 'Treino por área e assunto, radar de aptidão, checklist e plano de estudos.', bancos: ['ENEM'], simulados: ['enem'] },
];

export const mundoPorSlug = (s: string | null | undefined) => MUNDOS.find((m) => m.slug === s);
export const mundoValido = (s: string | null | undefined): s is Mundo => !!mundoPorSlug(s);

/** Mundo de uma questão, pelo id (as do ENEM começam com "enem-"). */
export const mundoDeQuestao = (id: string): Mundo => (id.startsWith('enem-') ? 'enem' : 'detran');

/** Mundo de uma tentativa, pelo tipo ('enem', 'custom:ENEM', 'treino:enem:matematica', 'detran-sp', 'treino:legislacao'…). */
export function mundoDeTipo(tipo: string): Mundo {
  const t = tipo.toLowerCase();
  return t === 'enem' || t.endsWith(':enem') || t.startsWith('treino:enem:') ? 'enem' : 'detran';
}

/** Estados com simulado do Detran. Quem estuda AM não faz SP: o aluno escolhe o seu e só vê ele. */
export const UFS_DETRAN: { uf: string; nome: string; slug: string }[] = [
  { uf: 'AM', nome: 'Amazonas', slug: 'detran-am' },
  { uf: 'SP', nome: 'São Paulo', slug: 'detran-sp' },
  { uf: 'BA', nome: 'Bahia', slug: 'detran-ba' },
];
