import { describe, expect, it } from 'vitest';
import { catalogo, selecionar } from './personalizado';
import { loadQuestions } from './questions';
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
  it('lista as provas oficiais do ENEM e refaz um dia inteiro na ordem real', async () => {
    const enem = catalogo().find((b) => b.bank === 'ENEM')!;
    expect(enem.cadernos.length).toBeGreaterThan(10);
    const c = enem.cadernos.find((x) => x.id === '2024-d1')!;
    expect(c.total).toBeGreaterThan(80);
    const { picked, faltou } = await selecionar('u', { bank: 'ENEM', modo: 'prova', itens: {}, caderno: '2024-d1' }, loadQuestions('ENEM'));
    expect(faltou).toBe(0);
    expect(picked).toHaveLength(c.total);
    expect(picked.every((q) => q.id.startsWith('enem-2024-d1-'))).toBe(true);
    expect(picked.map((q) => q.id)).toEqual([...picked.map((q) => q.id)].sort());
  });
});
