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
  status: 'draft' | 'reviewed' | 'published' | 'archived';
};

/** Visão pública da questão: nunca inclui o gabarito. */
export type PublicQuestion = Pick<Question, 'id' | 'topic' | 'statement' | 'options'>;

const ROOT = path.join(process.cwd(), 'content', 'questions');

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
  const dir = path.join(ROOT, state.toLowerCase());
  const out: Question[] = [];
  if (existsSync(dir)) {
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.json')) continue;
      const list = JSON.parse(readFileSync(path.join(dir, f), 'utf8')) as Question[];
      out.push(...list);
    }
  }
  const ok = allowedStatuses();
  cache = { ...cache, [key]: out.filter((q) => ok.includes(q.status)) };
  return cache[key] as Question[];
}

/**
 * A distribuição oficial usa 5 grupos; sinalização entra em legislação.
 * Só para o sorteio: o tema original da questão é preservado.
 */
export function examTopic(topic: string): string {
  return topic === 'sinalizacao' ? 'legislacao' : topic;
}

export function toPublic(q: Question): PublicQuestion {
  return { id: q.id, topic: q.topic, statement: q.statement, options: q.options };
}
