import { describe, expect, it } from 'vitest';
import { loadQuestions } from './questions';
import { getExamConfig } from './exam';
import { getSimulation, isAvailable } from './simulations';

describe('banco do ENEM', () => {
  it('não mistura com o banco nacional do Detran', () => {
    const enem = loadQuestions('ENEM');
    expect(enem.length).toBeGreaterThan(100);
    expect(enem.every((q) => q.stateCode === 'ENEM')).toBe(true);
  });
  it('cada questão tem 5 alternativas e gabarito válido', () => {
    for (const q of loadQuestions('ENEM')) {
      expect(q.options).toHaveLength(5);
      expect(q.options.map((o) => o.id)).toContain(q.correctOptionId);
    }
  });
  it('simulado ENEM usa configuração própria com 4 áreas somando o total', () => {
    const c = getExamConfig('ENEM');
    expect(Object.values(c.topicDistribution ?? {}).reduce((a, b) => a + b, 0)).toBe(c.questionCount);
    expect(getSimulation('enem')?.stateCode).toBe('ENEM');
    expect(isAvailable(getSimulation('enem')!)).toBe(true);
  });
});
