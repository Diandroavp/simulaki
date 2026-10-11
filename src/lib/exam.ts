/**
 * Configuração da prova por estado.
 * `verified: false` significa que o valor veio de fonte secundária e precisa ser
 * conferido no Detran do estado antes do lançamento.
 */

export type ExamConfig = {
  stateCode: string;
  questionCount: number;
  durationMinutes: number;
  minCorrect: number;
  /** Distribuição de questões por tema, quando conhecida (soma = questionCount). */
  topicDistribution?: Record<string, number>;
  verified: boolean;
  source: string;
};

// Distribuição citada por um blog para AM e BA (idêntica nas duas páginas; tratar como não confirmada).
const DISTRIBUICAO_BLOG: Record<string, number> = {
  legislacao: 12,
  direcao_defensiva: 10,
  primeiros_socorros: 3,
  meio_ambiente_cidadania: 3,
  mecanica: 2,
};

export const EXAM_CONFIGS: Record<string, ExamConfig> = {
  // Estado piloto.
  AM: {
    stateCode: 'AM',
    questionCount: 30,
    durationMinutes: 60, // Res. CONTRAN 1.020/2025: mínimo de 1h (art. 33 §2º)
    minCorrect: 20,
    topicDistribution: DISTRIBUICAO_BLOG,
    verified: false,
    source: 'Res. CONTRAN 1.020/2025 art. 33-34: 30 questões, mín. 60 min, 20 acertos. Distribuição por tema: não confirmada',
  },
  BA: {
    stateCode: 'BA',
    questionCount: 30,
    durationMinutes: 60, // idem: valores iguais aos de AM na mesma fonte; confirmar.
    minCorrect: 20,
    topicDistribution: DISTRIBUICAO_BLOG,
    verified: false,
    source: 'https://doutormultas.com.br/?p=20024 (blog; confirmar em detran.ba.gov.br ou no CFC)',
  },
  SP: {
    stateCode: 'SP',
    questionCount: 30,
    durationMinutes: 40,
    minCorrect: 20,
    // sem distribuição por tema conhecida: sorteio livre do banco do estado
    verified: false,
    source:
      'https://www.despachantedok.com.br/blog/?p=35880 e https://olhardireto.com.br/noticias/prova-teorica-para-tirar-cnh-passa-a-ser-eletronica-em-sp (confirmar em detran.sp.gov.br)',
  },
};

/** Padrão nacional mais comum (30 questões, 70% de acerto). Usado quando o estado não está configurado. */
export const DEFAULT_EXAM: ExamConfig = {
  stateCode: 'BR',
  questionCount: 30,
  durationMinutes: 40,
  minCorrect: 20,
  verified: false,
  source: 'Referência geral; cada Detran define as próprias regras',
};

export function getExamConfig(stateCode: string | null | undefined): ExamConfig {
  if (!stateCode) return DEFAULT_EXAM;
  return EXAM_CONFIGS[stateCode.toUpperCase()] ?? DEFAULT_EXAM;
}

export type AnswerInput = { selectedOptionId: string | null; correctOptionId: string };

export function scoreAttempt(answers: AnswerInput[], config: ExamConfig) {
  const correct = answers.filter((a) => a.selectedOptionId === a.correctOptionId).length;
  return {
    correct,
    total: answers.length,
    passed: correct >= config.minCorrect,
  };
}

/** Embaralha (Fisher-Yates) e devolve `count` itens sem repetir; aceita gerador para testes. */
export function pickQuestions<T>(pool: T[], count: number, random: () => number = Math.random): T[] {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = copy[i] as T;
    copy[i] = copy[j] as T;
    copy[j] = a;
  }
  return copy.slice(0, Math.min(count, copy.length));
}

/**
 * Monta uma prova respeitando a distribuição por tema, quando o estado a define.
 * Se faltar questão em algum tema, completa com as demais para chegar ao total.
 */
export function buildExam<T extends { topic: string }>(
  pool: T[],
  config: ExamConfig,
  random: () => number = Math.random,
): T[] {
  const dist = config.topicDistribution;
  if (!dist) return pickQuestions(pool, config.questionCount, random);

  const chosen: T[] = [];
  for (const [topic, qty] of Object.entries(dist)) {
    chosen.push(
      ...pickQuestions(
        pool.filter((q) => q.topic === topic),
        qty,
        random,
      ),
    );
  }
  if (chosen.length < config.questionCount) {
    const rest = pool.filter((q) => !chosen.includes(q));
    chosen.push(...pickQuestions(rest, config.questionCount - chosen.length, random));
  }
  return pickQuestions(chosen, chosen.length, random); // embaralha a ordem final
}
