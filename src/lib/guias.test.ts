import { describe, expect, it } from 'vitest';
import { ESTADOS, GUIAS } from './guias';
import sitemap from '../app/sitemap';

describe('guias e páginas por estado', () => {
  it('slugs únicos e cada guia tem FAQ e fonte de dados', () => {
    expect(new Set(GUIAS.map((g) => g.slug)).size).toBe(GUIAS.length);
    for (const g of GUIAS) {
      expect(g.faq.length).toBeGreaterThan(0);
      expect(g.resumo.length).toBeLessThanOrEqual(160);
      expect(g.atualizado).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
  it('as regras citadas batem com a configuração da prova', async () => {
    const { getExamConfig } = await import('./exam');
    const c = getExamConfig('AM');
    const texto = JSON.stringify(GUIAS);
    expect(texto).toContain(`${c.questionCount} questões`);
    expect(texto).toContain(`${c.minCorrect} acertos`);
  });
  it('o sitemap lista todos os guias e estados', () => {
    const urls = sitemap().map((s) => s.url);
    for (const g of GUIAS) expect(urls.some((u) => u.endsWith(`/guia/${g.slug}`))).toBe(true);
    for (const e of ESTADOS) expect(urls.some((u) => u.endsWith(`/detran/${e.uf}`))).toBe(true);
  });
});
