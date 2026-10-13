import { describe, expect, it } from 'vitest';
import { catalogo } from './personalizado';
import { nomeTipo } from './simulations';

describe('simulado personalizado', () => {
  it('lista os bancos com contagem por tema e ENEM isolado do Detran', () => {
    const c = catalogo();
    const enem = c.find((b) => b.bank === 'ENEM');
    expect(enem).toBeTruthy();
    expect(enem!.temas.map((t) => t.id).sort()).toEqual(['humanas', 'linguagens', 'matematica', 'natureza']);
    expect(enem!.anos.length).toBeGreaterThan(5);
    const am = c.find((b) => b.bank === 'AM');
    expect(am!.temas.some((t) => t.id === 'humanas')).toBe(false);
    for (const b of c) expect(b.temas.reduce((a, t) => a + t.total, 0)).toBe(b.total);
  });
  it('nomeia os tipos personalizados no histórico', () => {
    expect(nomeTipo('custom:ENEM')).toBe('Personalizado · ENEM');
    expect(nomeTipo('treino:custom:AM')).toBe('Personalizado · Detran AM');
    expect(nomeTipo('detran-am')).toBe('Detran AM');
  });
});
