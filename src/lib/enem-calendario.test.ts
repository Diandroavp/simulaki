import { describe, expect, it } from 'vitest';
import { contagemEnem } from './enem-calendario';

// 12:00 UTC = 08:00 em Manaus
const em = (d: string) => new Date(`${d}T12:00:00Z`);

describe('contagem regressiva do ENEM', () => {
  it('antes do 1º dia', () => {
    expect(contagemEnem(em('2026-11-06'))?.texto).toContain('Faltam 2 dias para o 1º dia');
    expect(contagemEnem(em('2026-11-07'))?.texto).toContain('Faltam 1 dia para o 1º dia');
  });
  it('no 1º dia e entre as provas', () => {
    expect(contagemEnem(em('2026-11-08'))?.texto).toContain('Hoje é o 1º dia');
    expect(contagemEnem(em('2026-11-10'))?.texto).toContain('Faltam 5 dias para o 2º dia');
  });
  it('no 2º dia e depois dele some', () => {
    expect(contagemEnem(em('2026-11-15'))?.texto).toContain('2º dia');
    expect(contagemEnem(em('2026-11-16'))).toBeNull();
  });
  it('usa a data de Manaus (UTC-4), não a de UTC', () => {
    // 02:00 UTC de 8/11 ainda é 22:00 de 7/11 em Manaus
    expect(contagemEnem(new Date('2026-11-08T02:00:00Z'))?.texto).toContain('Faltam 1 dia');
  });
});
