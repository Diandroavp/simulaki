import { inArray } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { loadAllRaw, type Question } from './questions';
import { ensureOverrides, overrideOf } from './question-overrides';
import { openFeedback } from './feedback';

/** Revisão em lote das provas de banco próprio (ENEM): resumo por caderno e aplicação das decisões. */

export type Decisao = 'published' | 'archived' | 'pending';
export const PAGE_SIZE = 20;

export function statusEfetivo(q: Question): 'published' | 'archived' | 'pending' {
  const s = overrideOf(q.id) ?? q.status;
  return s === 'published' ? 'published' : s === 'archived' ? 'archived' : 'pending';
}

/** "enem-2024-d1-017" -> "2024-d1" */
export function cadernoDe(id: string): string {
  return id.split('-').slice(1, 3).join('-');
}

export type ResumoCaderno = { caderno: string; total: number; published: number; archived: number; pending: number };

export async function resumo(bank = 'ENEM'): Promise<ResumoCaderno[]> {
  await ensureOverrides();
  const m = new Map<string, ResumoCaderno>();
  for (const q of loadAllRaw(bank)) {
    const c = cadernoDe(q.id);
    const r = m.get(c) ?? { caderno: c, total: 0, published: 0, archived: 0, pending: 0 };
    r.total++; r[statusEfetivo(q)]++;
    m.set(c, r);
  }
  return [...m.values()].sort((a, b) => b.caderno.localeCompare(a.caderno));
}

/** Avisos de erro em aberto dos alunos, por questão (id -> quantidade). */
export async function avisosAbertos(): Promise<Map<string, number>> {
  const m = new Map<string, number>();
  for (const f of await openFeedback()) m.set(f.questionId, (m.get(f.questionId) ?? 0) + 1);
  return m;
}

export type Filtro = Decisao | 'todas' | 'avisos';

export async function pagina(caderno: string, filtro: Filtro, p: number, bank = 'ENEM', soId?: string) {
  await ensureOverrides();
  const all = loadAllRaw(bank).filter((q) => cadernoDe(q.id) === caderno).sort((a, b) => a.id.localeCompare(b.id));
  const avisos = filtro === 'avisos' ? await avisosAbertos() : null;
  const lista = soId ? all.filter((q) => q.id === soId) : avisos ? all.filter((q) => avisos.has(q.id)) : filtro === 'todas' ? all : all.filter((q) => statusEfetivo(q) === filtro);
  const paginas = Math.max(1, Math.ceil(lista.length / PAGE_SIZE));
  const atual = Math.min(Math.max(1, p), paginas);
  return { itens: lista.slice((atual - 1) * PAGE_SIZE, atual * PAGE_SIZE), total: lista.length, paginas, atual };
}

/** Aplica a decisão às questões do banco (ids desconhecidos são ignorados). 'pending' volta ao estado do arquivo. */
export async function decidir(ids: string[], decisao: Decisao, reviewerId: string | null, bank = 'ENEM'): Promise<number> {
  const validos = new Set(loadAllRaw(bank).map((q) => q.id));
  const alvo = [...new Set(ids)].filter((id) => validos.has(id));
  if (alvo.length === 0) return 0;
  const db = await getDb();
  if (decisao === 'pending') {
    await db.delete(schema.questionReviews).where(inArray(schema.questionReviews.questionId, alvo));
  } else {
    await db
      .insert(schema.questionReviews)
      .values(alvo.map((questionId) => ({ questionId, status: decisao, reviewerId })))
      .onConflictDoUpdate({ target: schema.questionReviews.questionId, set: { status: decisao, reviewerId, updatedAt: new Date() } });
  }
  await ensureOverrides(true);
  return alvo.length;
}

/** Ids de um caderno que ainda estão pendentes (para "aprovar todas as pendentes"). */
export async function pendentesDoCaderno(caderno: string, bank = 'ENEM'): Promise<string[]> {
  await ensureOverrides();
  return loadAllRaw(bank).filter((q) => cadernoDe(q.id) === caderno && statusEfetivo(q) === 'pending').map((q) => q.id);
}
