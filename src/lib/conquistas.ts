/**
 * Conquistas: níveis (Calouro → Lenda) e troféus. Tudo é calculado a partir do que o aluno já fez
 * (simulados, respostas, indicações), sem tabela própria: nunca fica desatualizado e não dá para "perder" nada.
 */

export type Estatisticas = {
  respondidas: number;
  certas: number;
  /** Simulados completos concluídos (fora treinos rápidos). */
  simulados: number;
  treinos: number;
  /** Melhor percentual em um simulado de pelo menos 10 questões (0 a 100). */
  melhorPct: number;
  /** Já passou em algum simulado do Detran (nota mínima atingida). */
  aprovouDetran: boolean;
  /** Fez simulados/treinos em ambos os mundos. */
  mundos: number;
  /** Maior sequência de dias seguidos com atividade. */
  melhorSequencia: number;
  /** Sequência atual (hoje ou ontem contam). */
  sequenciaAtual: number;
  /** Quantas das 4 áreas do ENEM têm pelo menos 10 respostas. */
  areasEnem: number;
  indicados: number;
};

export const NIVEIS = [
  { nome: 'Calouro', emoji: '🎒', xp: 0 },
  { nome: 'Esforçado', emoji: '✏️', xp: 40 },
  { nome: 'Esperto', emoji: '💡', xp: 120 },
  { nome: 'Cabeça', emoji: '🤓', xp: 300 },
  { nome: 'Fera', emoji: '🦁', xp: 600 },
  { nome: 'Craque', emoji: '⚽', xp: 1000 },
  { nome: 'Gênio', emoji: '🧬', xp: 1600 },
  { nome: 'Lenda', emoji: '👑', xp: 2500 },
] as const;

export const XP_POR_TROFEU = 25;

type Def = { id: string; emoji: string; titulo: string; descricao: string; meta: number; valor: (e: Estatisticas) => number };

const DEFS: Def[] = [
  { id: 'primeiro-passo', emoji: '🚀', titulo: 'Primeiro passo', descricao: 'Conclua seu primeiro simulado.', meta: 1, valor: (e) => e.simulados },
  { id: 'aquecendo', emoji: '🔥', titulo: 'Aquecendo', descricao: 'Responda 10 questões.', meta: 10, valor: (e) => e.respondidas },
  { id: 'centena', emoji: '💯', titulo: 'Centena', descricao: 'Responda 100 questões.', meta: 100, valor: (e) => e.respondidas },
  { id: 'milhar', emoji: '🏔️', titulo: 'Milhar', descricao: 'Responda 1.000 questões.', meta: 1000, valor: (e) => e.respondidas },
  { id: 'mandou-bem', emoji: '⭐', titulo: 'Mandou bem', descricao: 'Faça 80% ou mais em um simulado.', meta: 80, valor: (e) => e.melhorPct },
  { id: 'perfeito', emoji: '🎯', titulo: 'Perfeito', descricao: 'Acerte 100% de um simulado (mínimo de 10 questões).', meta: 100, valor: (e) => e.melhorPct },
  { id: 'aprovado', emoji: '✅', titulo: 'Aprovado no simulado', descricao: 'Atinja a nota mínima em um simulado do Detran.', meta: 1, valor: (e) => (e.aprovouDetran ? 1 : 0) },
  { id: 'sequencia-3', emoji: '📆', titulo: 'Três dias seguidos', descricao: 'Estude 3 dias seguidos.', meta: 3, valor: (e) => e.melhorSequencia },
  { id: 'sequencia-7', emoji: '🗓️', titulo: 'Semana de ferro', descricao: 'Estude 7 dias seguidos.', meta: 7, valor: (e) => e.melhorSequencia },
  { id: 'treino-rapido', emoji: '⚡', titulo: 'Treino rápido', descricao: 'Conclua 5 treinos rápidos.', meta: 5, valor: (e) => e.treinos },
  { id: 'maratonista', emoji: '🏃', titulo: 'Maratonista', descricao: 'Conclua 5 simulados.', meta: 5, valor: (e) => e.simulados },
  { id: 'veterano', emoji: '🎖️', titulo: 'Veterano', descricao: 'Conclua 20 simulados.', meta: 20, valor: (e) => e.simulados },
  { id: 'explorador', emoji: '🧭', titulo: 'Explorador', descricao: 'Estude no Detran e no ENEM.', meta: 2, valor: (e) => e.mundos },
  { id: 'radar-completo', emoji: '📡', titulo: 'Radar completo', descricao: 'Responda 10 questões em cada uma das 4 áreas do ENEM.', meta: 4, valor: (e) => e.areasEnem },
  { id: 'embaixador', emoji: '🤝', titulo: 'Embaixador', descricao: 'Um amigo entrou no Simulaki pelo seu link.', meta: 1, valor: (e) => e.indicados },
];

export type Trofeu = { id: string; emoji: string; titulo: string; descricao: string; ganho: boolean; atual: number; meta: number };
export type Conquistas = {
  xp: number;
  nivel: (typeof NIVEIS)[number];
  indice: number;
  proximo: (typeof NIVEIS)[number] | null;
  /** 0 a 100: quanto falta para o próximo nível. */
  progresso: number;
  faltamXp: number;
  trofeus: Trofeu[];
  ganhos: number;
};

/** Todos os troféus existentes (para mostrar para quem ainda não tem conta). */
export const TODOS_TROFEUS = DEFS.map(({ id, emoji, titulo, descricao, meta }) => ({ id, emoji, titulo, descricao, meta }));

export function calcularConquistas(e: Estatisticas): Conquistas {
  const trofeus: Trofeu[] = DEFS.map((d) => {
    const atual = Math.min(d.valor(e), d.meta);
    return { id: d.id, emoji: d.emoji, titulo: d.titulo, descricao: d.descricao, ganho: d.valor(e) >= d.meta, atual, meta: d.meta };
  });
  const ganhos = trofeus.filter((t) => t.ganho).length;
  const xp = (e.certas * 2) + (e.respondidas - e.certas) + (e.simulados * 20) + (e.treinos * 5) + (ganhos * XP_POR_TROFEU);
  let indice = 0;
  NIVEIS.forEach((n, i) => { if (xp >= n.xp) indice = i; });
  const nivel = NIVEIS[indice]!;
  const proximo = NIVEIS[indice + 1] ?? null;
  const progresso = proximo ? Math.round(((xp - nivel.xp) / (proximo.xp - nivel.xp)) * 100) : 100;
  return { xp, nivel, indice, proximo, progresso, faltamXp: proximo ? proximo.xp - xp : 0, trofeus, ganhos };
}

/** Sequências a partir de dias (AAAA-MM-DD, qualquer ordem, com repetição). `hoje` no mesmo formato. */
export function sequencias(dias: string[], hoje: string): { melhor: number; atual: number } {
  const dia = (s: string) => Date.parse(s + 'T00:00:00Z') / 86_400_000;
  const set = [...new Set(dias)].map(dia).sort((a, b) => a - b);
  let melhor = 0, corrente = 0, anterior = -Infinity;
  for (const d of set) {
    corrente = d === anterior + 1 ? corrente + 1 : 1;
    melhor = Math.max(melhor, corrente);
    anterior = d;
  }
  const h = dia(hoje);
  // a sequência atual só vale se a última atividade foi hoje ou ontem
  const atual = anterior === h || anterior === h - 1 ? corrente : 0;
  return { melhor, atual };
}
