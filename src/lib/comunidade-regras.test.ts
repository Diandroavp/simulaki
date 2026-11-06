import { describe, expect, it } from 'vitest';
import { validarApelido, validarTexto } from './comunidade-regras';

describe('apelido', () => {
  it('aceita apelidos simples', () => {
    expect(validarApelido('  Fera_do_ENEM ')).toEqual({ ok: true, apelido: 'Fera_do_ENEM' });
  });
  it('recusa curto, longo, com espaço ou acento', () => {
    expect(validarApelido('ab').ok).toBe(false);
    expect(validarApelido('a'.repeat(21)).ok).toBe(false);
    expect(validarApelido('maria silva').ok).toBe(false);
    expect(validarApelido('joão').ok).toBe(false);
  });
  it('recusa nomes que parecem da equipe', () => {
    expect(validarApelido('Moderador_Oficial').ok).toBe(false);
    expect(validarApelido('suporte123').ok).toBe(false);
  });
});

describe('texto', () => {
  it('aceita uma dúvida normal, com número de questão', () => {
    expect(validarTexto('Na questão 45 de 2019, por que a letra C está certa?').ok).toBe(true);
  });
  it('recusa links, e-mails e telefones', () => {
    expect(validarTexto('olha https://site.xyz/oi').ok).toBe(false);
    expect(validarTexto('entra em www.exemplo.com').ok).toBe(false);
    expect(validarTexto('visite meusite.com.br agora').ok).toBe(false);
    expect(validarTexto('me chama em fulano@gmail.com').ok).toBe(false);
    expect(validarTexto('meu zap é (92) 99999-1234').ok).toBe(false);
    expect(validarTexto('meu cpf 123.456.789-09').ok).toBe(false);
  });
  it('recusa vazio e texto longo demais', () => {
    expect(validarTexto('  ').ok).toBe(false);
    expect(validarTexto('a'.repeat(1001)).ok).toBe(false);
  });
});
