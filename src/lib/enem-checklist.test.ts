import { describe, expect, it } from 'vitest';
import { statusAuto, statusFinal } from './enem-checklist';

describe('checklist ENEM', () => {
  it('automático: não vi, estudando e dominado', () => {
    expect(statusAuto({ respondidas: 0, acertos: 0 })).toBe('nao_vi');
    expect(statusAuto({ respondidas: 4, acertos: 4 })).toBe('estudando');
    expect(statusAuto({ respondidas: 10, acertos: 7 })).toBe('estudando');
    expect(statusAuto({ respondidas: 10, acertos: 8 })).toBe('dominado');
  });
  it('marcação manual vale mais que a automática', () => {
    expect(statusFinal('nao_vi', { respondidas: 20, acertos: 20 })).toEqual({ status: 'nao_vi', manual: true });
    expect(statusFinal(undefined, { respondidas: 20, acertos: 20 })).toEqual({ status: 'dominado', manual: false });
  });
});
