import { describe, expect, it } from 'vitest';
import { diaManaus, sequencia, ultimosDias } from './desempenho';

describe('desempenho', () => {
  const hoje = new Date('2026-10-14T15:00:00Z'); // 11h em Manaus
  it('usa o dia de Manaus', () => {
    expect(diaManaus(new Date('2026-10-14T02:00:00Z'))).toBe('2026-10-13');
  });
  it('preenche os últimos dias com zero', () => {
    const d = ultimosDias([{ dia: '2026-10-14', respondidas: 4, acertos: 3 }], hoje, 3);
    expect(d.map((x) => x.dia)).toEqual(['2026-10-12', '2026-10-13', '2026-10-14']);
    expect(d.map((x) => x.respondidas)).toEqual([0, 0, 4]);
  });
  it('conta dias seguidos; hoje vazio não zera a sequência', () => {
    const mk = (xs: number[]) => xs.map((n, i) => ({ dia: String(i), respondidas: n, acertos: 0 }));
    expect(sequencia(mk([0, 2, 3, 1]))).toBe(3);
    expect(sequencia(mk([5, 2, 3, 0]))).toBe(3);
    expect(sequencia(mk([5, 0, 3, 1]))).toBe(2);
    expect(sequencia(mk([1, 1, 0, 0]))).toBe(0);
  });
});
