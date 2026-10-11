import path from 'node:path';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import * as schema from './schema';

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

/**
 * Com DATABASE_URL usa PostgreSQL (rode `npm run db:migrate` antes).
 * Sem DATABASE_URL usa PGlite (Postgres embutido em arquivo, em .data/), só para desenvolvimento:
 * migrações são aplicadas sozinhas na primeira conexão.
 */
async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: postgres } = await import('postgres');
    const { drizzle } = await import('drizzle-orm/postgres-js');
    return drizzle(postgres(url, { max: 5 }), { schema }) as unknown as Db;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL é obrigatório em produção.');
  }
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const { migrate } = await import('drizzle-orm/pglite/migrator');
  const client = new PGlite(process.env.PGLITE_DIR ?? path.join(process.cwd(), '.data', 'pglite'));
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });
  return db as unknown as Db;
}

const g = globalThis as unknown as { __simulakiDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  g.__simulakiDb ??= connect().then(async (db) => {
    await seedPlans(db);
    return db;
  });
  return g.__simulakiDb;
}

/** Planos iniciais (hipóteses de preço; ajustar quando validar com o mercado). */
async function seedPlans(db: Db) {
  await db
    .insert(schema.plans)
    .values([
      { slug: 'passe-60', name: 'Passe 60 dias', audience: 'student', billing: 'one_time', priceCents: 1990, periodDays: 60 },
      { slug: 'mensal', name: 'Mensal', audience: 'student', billing: 'recurring', priceCents: 1290, periodDays: 30 },
      { slug: 'parceiro-start', name: 'Parceiro Start', audience: 'organization', billing: 'recurring', priceCents: 9900, periodDays: 30, studentLimit: 50 },
      { slug: 'parceiro-pro', name: 'Parceiro Pro', audience: 'organization', billing: 'recurring', priceCents: 19900, periodDays: 30, studentLimit: 200 },
    ])
    .onConflictDoNothing({ target: schema.plans.slug });
}

export { sql, schema };
