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

import { diasAte, parseDataProva } from './desempenho';
describe('data da prova', () => {
  const hoje = new Date('2026-10-14T15:00:00Z');
  it('conta os dias até a prova no fuso de Manaus', () => {
    expect(diasAte(new Date('2026-11-14T16:00:00Z'), hoje)).toBe(31);
    expect(diasAte(new Date('2026-10-14T16:00:00Z'), hoje)).toBe(0);
  });
  it('só aceita datas futuras em até 2 anos, no formato AAAA-MM-DD', () => {
    expect(parseDataProva('2026-11-08', hoje)).toBeInstanceOf(Date);
    expect(parseDataProva('2026-10-14', hoje)).toBeNull();
    expect(parseDataProva('2026-10-01', hoje)).toBeNull();
    expect(parseDataProva('2029-01-01', hoje)).toBeNull();
    expect(parseDataProva('08/11/2026', hoje)).toBeNull();
    expect(parseDataProva('2026-02-31', hoje)).toBeNull();
  });
});
