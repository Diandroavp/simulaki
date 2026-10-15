import { describe, expect, it } from 'vitest';
import { compararComCorte, estimarNota, notaDaArea, pontosPercentuaisParaCorte } from './enem-nota';
import type { Ponto } from './enem-perfil';

const pt = (key: string, r: number, a: number): Ponto => ({ key, label: key, respondidas: r, acertos: a, pct: r ? Math.round((a / r) * 100) : null });

describe('nota estimada do ENEM', () => {
  it('reta de 350 a 850', () => {
    expect(notaDaArea(0)).toBe(350);
    expect(notaDaArea(50)).toBe(600);
    expect(notaDaArea(100)).toBe(850);
  });
  it('só estima com pelo menos 10 respostas em cada área', () => {
    const e = estimarNota([pt('a', 20, 10), pt('b', 20, 10), pt('c', 5, 5), pt('d', 20, 10)]);
    expect(e.media).toBeNull();
    expect(e.faltam).toEqual(['c']);
  });
  it('média das 4 áreas com a redação (padrão 600) e margem', () => {
    const e = estimarNota([pt('a', 20, 10), pt('b', 20, 10), pt('c', 20, 10), pt('d', 20, 10)]);
    expect(e.media).toBe(600);
    expect([e.min, e.max]).toEqual([560, 640]);
    expect(estimarNota([pt('a', 20, 20), pt('b', 20, 20), pt('c', 20, 20), pt('d', 20, 20)], 1000).media).toBe(880);
  });
  it('compara com a nota de corte', () => {
    expect(compararComCorte(700, 600).situacao).toBe('acima');
    expect(compararComCorte(610, 600).situacao).toBe('perto');
    expect(compararComCorte(500, 600)).toEqual({ situacao: 'abaixo', diferenca: -100 });
    expect(pontosPercentuaisParaCorte(500, 600)).toBe(25);
    expect(pontosPercentuaisParaCorte(700, 600)).toBe(0);
  });
});
