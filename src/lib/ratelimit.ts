import { and, eq, gt, sql } from 'drizzle-orm';
import { getDb, schema } from '@/db';

export const MAX_FAILURES = 8;
export const WINDOW_MS = 15 * 60_000;

export async function isLockedOut(email: string): Promise<boolean> {
  const db = await getDb();
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.loginFailures)
    .where(and(eq(schema.loginFailures.key, email), gt(schema.loginFailures.createdAt, new Date(Date.now() - WINDOW_MS))));
  return (row?.n ?? 0) >= MAX_FAILURES;
}

export async function recordFailure(email: string) {
  const db = await getDb();
  await db.insert(schema.loginFailures).values({ key: email });
}

export async function clearFailures(email: string) {
  const db = await getDb();
  await db.delete(schema.loginFailures).where(eq(schema.loginFailures.key, email));
}

/** Limite genérico por chave (ex.: `signup:<ip>`): true se ainda pode, e já registra a tentativa. */
export async function allowAction(key: string, max: number, windowMs: number): Promise<boolean> {
  const db = await getDb();
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.loginFailures)
    .where(and(eq(schema.loginFailures.key, key), gt(schema.loginFailures.createdAt, new Date(Date.now() - windowMs))));
  if ((row?.n ?? 0) >= max) return false;
  await db.insert(schema.loginFailures).values({ key });
  return true;
}
