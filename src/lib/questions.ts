import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

export type Option = { id: string; text: string };
export type Question = {
  id: string;
  stateCode: string;
  topic: string;
  statement: string;
  options: Option[];
  correctOptionId: string;
  explanation?: string;
  legalRef?: string;
  /** Fonte da questão, para exibir ao aluno (ex.: banco oficial e ano). */
  source?: string;
  /** Detalhe da fonte (parte, módulo, número). */
  sourceRef?: string;
  /** Código da placa, quando a questão se refere a uma. */
  signCode?: string;
  status: 'draft' | 'reviewed' | 'published' | 'archived';
};

/** Visão pública da questão: nunca inclui o gabarito. */
export type PublicQuestion = Pick<Question, 'id' | 'topic' | 'statement' | 'options'> & { sourceLine: string; signCode?: string; signImage?: string };

const ROOT = path.join(process.cwd(), 'content', 'questions');
const SIGNS = path.join(process.cwd(), 'public', 'placas');

/** Imagem da placa (public/placas/<codigo>.svg|png|webp), se existir. */
export function signImage(code: string): string | null {
  if (!/^[A-Za-z0-9-]+$/.test(code)) return null;
  for (const ext of ['svg', 'png', 'webp']) {
    if (existsSync(path.join(SIGNS, `${code}.${ext}`))) return `/placas/${code}.${ext}`;
  }
  return null;
}

/**
 * Em produção só entram questões publicadas. Em desenvolvimento (ou com
 * ALLOW_DRAFT_QUESTIONS=1, para demonstração) entram também os rascunhos.
 */
function allowedStatuses(): Question['status'][] {
  const demo = process.env.ALLOW_DRAFT_QUESTIONS === '1' || process.env.NODE_ENV !== 'production';
  return demo ? ['published', 'reviewed', 'draft'] : ['published'];
}

let cache: Record<string, Question[]> = {};

export function loadQuestions(stateCode: string): Question[] {
  const state = stateCode.toUpperCase();
  const key = `${state}:${allowedStatuses().join(',')}`;
  if (cache[key]) return cache[key];
  const out: Question[] = [];
  // Banco nacional (br/) vale para todos os estados; o do estado soma a ele.
  for (const sub of new Set([state.toLowerCase(), 'br'])) {
    const dir = path.join(ROOT, sub);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.json')) continue;
      out.push(...(JSON.parse(readFileSync(path.join(dir, f), 'utf8')) as Question[]));
    }
  }
  const ok = allowedStatuses();
  // Questão que depende de uma placa só entra quando a imagem da placa existe.
  cache = { ...cache, [key]: out.filter((q) => ok.includes(q.status) && (!q.signCode || signImage(q.signCode))) };
  return cache[key] as Question[];
}

/**
 * A distribuição oficial usa 5 grupos; sinalização entra em legislação.
 * Só para o sorteio: o tema original da questão é preservado.
 */
export function examTopic(topic: string): string {
  return topic === 'sinalizacao' ? 'legislacao' : topic;
}

/** Linha de fonte mostrada ao aluno: de onde vem a questão e em que ela se baseia. */
export function sourceLine(q: Question): string {
  if (q.source) return `Fonte: ${q.source}${q.sourceRef ? ` · ${q.sourceRef}` : ''}`;
  const ref = q.legalRef && !q.legalRef.includes('conferir') ? q.legalRef : null;
  if (!ref) return 'Fonte: elaborada pelo Simulaki';
  const law = /^CTB/i.test(ref) ? ' (Lei nº 9.503/1997)' : '';
  return `Fonte: elaborada pelo Simulaki com base em ${ref}${law}`;
}

export function toPublic(q: Question): PublicQuestion {
  return { id: q.id, topic: q.topic, statement: q.statement, options: q.options, sourceLine: sourceLine(q), ...(q.signCode ? { signCode: q.signCode, signImage: signImage(q.signCode) ?? undefined } : {}) };
}
