import { getDb, schema } from '@/db';

/**
 * Revisão de questões feita pelo painel: o status decidido (publicada/arquivada) vale mais que o do JSON.
 * `loadQuestions` é síncrono, então a tabela fica num mapa em memória, renovado a cada TTL.
 */
export type ReviewStatus = 'published' | 'archived';

const TTL_MS = 15_000;
let map = new Map<string, ReviewStatus>();
let version = 0;
let loadedAt = 0;

export function overrideOf(id: string): ReviewStatus | undefined {
  return map.get(id);
}
export function overridesVersion(): number {
  return version;
}
export function setOverrides(rows: { questionId: string; status: string }[]): void {
  map = new Map(rows.filter((r) => r.status === 'published' || r.status === 'archived').map((r) => [r.questionId, r.status as ReviewStatus]));
  version++;
  loadedAt = Date.now();
}
export function resetOverridesForTests(): void {
  map = new Map(); version++; loadedAt = 0;
}

/** Garante que o mapa está fresco. Nunca derruba a requisição: sem banco, segue com o que tem. */
export async function ensureOverrides(force = false): Promise<void> {
  if (!force && Date.now() - loadedAt < TTL_MS) return;
  try {
    const db = await getDb();
    setOverrides(await db.select().from(schema.questionReviews));
  } catch {
    loadedAt = Date.now();
  }
}
