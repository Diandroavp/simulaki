import { describe, expect, it } from 'vitest';
import { mundoDeQuestao, mundoDeTipo, mundoValido } from './mundos';

describe('mundos', () => {
  it('separa ENEM e Detran por questão e por tipo de tentativa', () => {
    expect(mundoDeQuestao('enem-2024-d1-010')).toBe('enem');
    expect(mundoDeQuestao('am-leg-001')).toBe('detran');
    for (const t of ['enem', 'custom:ENEM', 'treino:custom:ENEM', 'treino:enem:matematica']) expect(mundoDeTipo(t)).toBe('enem');
    for (const t of ['detran-sp', 'custom:AM', 'treino:legislacao', 'treino:erros']) expect(mundoDeTipo(t)).toBe('detran');
  });
  it('valida o slug', () => {
    expect(mundoValido('enem')).toBe(true);
    expect(mundoValido('psc')).toBe(false);
  });
});
