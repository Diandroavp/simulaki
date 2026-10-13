import { afterEach, describe, expect, it, vi } from 'vitest';
import { cadernoDe, statusEfetivo } from './enem-review';
import { loadAllRaw, loadQuestions } from './questions';
import { resetOverridesForTests, setOverrides } from './question-overrides';

describe('revisão do ENEM', () => {
  afterEach(() => { resetOverridesForTests(); vi.unstubAllEnvs(); });

  it('agrupa por caderno', () => {
    expect(cadernoDe('enem-2024-d1-017')).toBe('2024-d1');
  });

  it('a decisão da revisão vale mais que o status do arquivo, e em produção só publicadas entram', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const q = loadAllRaw('ENEM').find((x) => x.status === 'draft')!;
    expect(loadQuestions('ENEM').some((x) => x.id === q.id)).toBe(false);
    expect(statusEfetivo(q)).toBe('pending');

    setOverrides([{ questionId: q.id, status: 'published' }]);
    expect(loadQuestions('ENEM').find((x) => x.id === q.id)?.status).toBe('published');
    expect(statusEfetivo(q)).toBe('published');

    setOverrides([{ questionId: q.id, status: 'archived' }]);
    expect(loadQuestions('ENEM').some((x) => x.id === q.id)).toBe(false);
    expect(statusEfetivo(q)).toBe('archived');

    setOverrides([]);
    expect(statusEfetivo(q)).toBe('pending');
  });

  it('ignora status desconhecido vindo do banco', () => {
    const q = loadAllRaw('ENEM')[0]!;
    setOverrides([{ questionId: q.id, status: 'qualquer' }]);
    expect(statusEfetivo(q)).toBe(q.status === 'published' ? 'published' : 'pending');
  });
});
