import { describe, expect, it } from 'vitest';

process.env.PGLITE_DIR = 'memory://';
const { getDb, schema } = await import('@/db');
const { reportQuestion } = await import('./feedback');
const { pagina, decidir, resumo } = await import('./enem-review');

describe('revisão do ENEM com banco', () => {
  it('avisos de alunos aparecem num filtro próprio e a decisão fica gravada', async () => {
    const db = await getDb();
    const [u] = await db.insert(schema.users).values({ name: 'A', email: `a${Math.random()}@t.com` }).returning();
    const id = 'enem-2024-d1-017';
    expect(await reportQuestion(u!.id, id, 'A figura está cortada')).toBe('ok');
    const av = await pagina('2024-d1', 'avisos', 1);
    expect(av.itens.map((q) => q.id)).toEqual([id]);
    const so = await pagina('2024-d1', 'todas', 1, 'ENEM', id);
    expect(so.total).toBe(1);

    const antes = (await resumo()).find((c) => c.caderno === '2024-d1')!;
    expect(await decidir([id, 'inexistente'], 'published', u!.id)).toBe(1);
    const depois = (await resumo()).find((c) => c.caderno === '2024-d1')!;
    expect(depois.published).toBe(antes.published + 1);
    expect(await decidir([id], 'pending', u!.id)).toBe(1);
    expect((await resumo()).find((c) => c.caderno === '2024-d1')!.published).toBe(antes.published);
  });
});
