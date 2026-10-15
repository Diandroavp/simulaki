import { and, eq } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { ASSUNTO_LABEL } from './assuntos';
import type { Ponto } from './enem-perfil';

export type StatusEstudo = 'nao_vi' | 'estudando' | 'dominado';
export const STATUS: { key: StatusEstudo; label: string }[] = [
  { key: 'nao_vi', label: 'Não vi' },
  { key: 'estudando', label: 'Estudando' },
  { key: 'dominado', label: 'Dominado' },
];
/** Para ser "dominado" automaticamente: pelo menos 10 respostas e 80% de acertos. */
export const DOMINIO_MIN_RESPOSTAS = 10;
export const DOMINIO_MIN_PCT = 80;

export const statusValido = (s: string): s is StatusEstudo => STATUS.some((x) => x.key === s);

/** Status automático pelo desempenho: sem respostas = não vi; muitos acertos = dominado; senão estudando. */
export function statusAuto(p: Pick<Ponto, 'respondidas' | 'acertos'>): StatusEstudo {
  if (p.respondidas === 0) return 'nao_vi';
  const pct = (p.acertos / p.respondidas) * 100;
  return p.respondidas >= DOMINIO_MIN_RESPOSTAS && pct >= DOMINIO_MIN_PCT ? 'dominado' : 'estudando';
}

/** A marcação manual, quando existe, vale mais que a automática. */
export function statusFinal(manual: StatusEstudo | undefined, p: Pick<Ponto, 'respondidas' | 'acertos'>): { status: StatusEstudo; manual: boolean } {
  return manual ? { status: manual, manual: true } : { status: statusAuto(p), manual: false };
}

export async function marcasManuais(userId: string): Promise<Record<string, StatusEstudo>> {
  const db = await getDb();
  const rows = await db.select().from(schema.enemChecklist).where(eq(schema.enemChecklist.userId, userId));
  return Object.fromEntries(rows.filter((r) => statusValido(r.status)).map((r) => [r.assuntoKey, r.status as StatusEstudo]));
}

/** status = null volta ao automático. */
export async function salvarMarca(userId: string, assuntoKey: string, status: StatusEstudo | null): Promise<boolean> {
  if (!(assuntoKey in ASSUNTO_LABEL)) return false;
  const db = await getDb();
  if (status === null) {
    await db.delete(schema.enemChecklist).where(and(eq(schema.enemChecklist.userId, userId), eq(schema.enemChecklist.assuntoKey, assuntoKey)));
    return true;
  }
  await db.insert(schema.enemChecklist).values({ userId, assuntoKey, status })
    .onConflictDoUpdate({ target: [schema.enemChecklist.userId, schema.enemChecklist.assuntoKey], set: { status, updatedAt: new Date() } });
  return true;
}
