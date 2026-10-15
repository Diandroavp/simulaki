import { describe, expect, it } from 'vitest';
import { escolherPatrocinador, valido, type Patrocinador } from './patrocinio';

const base: Patrocinador = { id: 'a', nome: 'Cursinho A', texto: 'Aulões de revisão para o ENEM.', url: 'https://exemplo.com.br', ativo: true };
const hoje = new Date('2026-10-15T12:00:00Z');

describe('patrocínio', () => {
  it('nunca aparece para quem paga', () => {
    expect(escolherPatrocinador([base], { tela: 'hub', pago: true, hoje })).toBeNull();
    expect(escolherPatrocinador([base], { tela: 'hub', pago: false, hoje })?.id).toBe('a');
  });
  it('respeita ativo, tela, mundo e datas', () => {
    expect(escolherPatrocinador([{ ...base, ativo: false }], { tela: 'hub', pago: false, hoje })).toBeNull();
    expect(escolherPatrocinador([{ ...base, telas: ['desempenho'] }], { tela: 'hub', pago: false, hoje })).toBeNull();
    expect(escolherPatrocinador([{ ...base, mundos: ['detran'] }], { tela: 'hub', mundo: 'enem', pago: false, hoje })).toBeNull();
    expect(escolherPatrocinador([{ ...base, de: '2026-11-01' }], { tela: 'hub', pago: false, hoje })).toBeNull();
    expect(escolherPatrocinador([{ ...base, ate: '2026-10-01' }], { tela: 'hub', pago: false, hoje })).toBeNull();
    expect(escolherPatrocinador([{ ...base, de: '2026-10-15', ate: '2026-10-15' }], { tela: 'hub', pago: false, hoje })?.id).toBe('a');
  });
  it('faz rodízio por dia, estável no mesmo dia', () => {
    const l = [base, { ...base, id: 'b' }];
    const a = escolherPatrocinador(l, { tela: 'hub', pago: false, hoje })!.id;
    expect(escolherPatrocinador(l, { tela: 'hub', pago: false, hoje: new Date('2026-10-15T20:00:00Z') })!.id).toBe(a);
    expect(escolherPatrocinador(l, { tela: 'hub', pago: false, hoje: new Date('2026-10-16T12:00:00Z') })!.id).not.toBe(a);
  });
  it('só aceita https e textos curtos', () => {
    expect(valido(base)).toBe(true);
    expect(valido({ ...base, url: 'http://exemplo.com' })).toBe(false);
    expect(valido({ ...base, url: 'javascript:alert(1)' })).toBe(false);
    expect(valido({ ...base, texto: 'x'.repeat(141) })).toBe(false);
  });
});
