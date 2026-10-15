import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAllRaw } from './questions';

describe('explicações do ENEM', () => {
  const ex = JSON.parse(readFileSync('content/explicacoes/enem.json', 'utf8')) as Record<string, string>;
  const banco = new Map(loadAllRaw('ENEM').map((q) => [q.id, q]));
  it('todo id existe no banco e não tem figura', () => {
    for (const id of Object.keys(ex)) {
      const q = banco.get(id);
      expect(q, id).toBeTruthy();
      expect(q!.images?.length ?? 0, id).toBe(0);
      expect(ex[id]!.length, id).toBeGreaterThan(40);
    }
  });
  it('são mescladas à questão com o aviso de IA', () => {
    const id = Object.keys(ex)[0]!;
    expect(banco.get(id)!.explanation).toContain('IA');
  });
});
