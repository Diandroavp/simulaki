import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emailFimDoPlano, emailSaudade, lembretesAtivos, lerTokenDescadastro, rodarLembretes, tokenDescadastro } from './lembretes';

const ID = '8a2f4c1e-3b5d-4e6f-9a7b-1c2d3e4f5a6b';

describe('lembretes por e-mail', () => {
  beforeEach(() => { vi.stubEnv('CRON_SECRET', 'segredo-de-teste-com-16+'); });
  afterEach(() => vi.unstubAllEnvs());

  it('o token de descadastro vale só para o próprio usuário', () => {
    const t = tokenDescadastro(ID);
    expect(lerTokenDescadastro(t)).toBe(ID);
    expect(lerTokenDescadastro(t.replace(ID, '00000000-0000-0000-0000-000000000000'))).toBeNull();
    expect(lerTokenDescadastro(t.slice(0, -2) + 'xx')).toBeNull();
    expect(lerTokenDescadastro('lixo')).toBeNull();
  });
  it('sem segredo o token não é aceito', () => {
    const t = tokenDescadastro(ID);
    vi.stubEnv('CRON_SECRET', '');
    expect(lerTokenDescadastro(t)).toBeNull();
  });
  it('fica desligado por padrão e só liga com a flag e um segredo', async () => {
    expect(lembretesAtivos()).toBe(false);
    expect((await rodarLembretes()).ativo).toBe(false);
    vi.stubEnv('REMINDERS_ENABLED', '1');
    expect(lembretesAtivos()).toBe(true);
    vi.stubEnv('CRON_SECRET', 'curto');
    expect(lembretesAtivos()).toBe(false);
  });
  it('todo e-mail leva o link para sair da lista', () => {
    expect(emailSaudade('Ana', 'https://x.com', ID).text).toContain(`https://x.com/api/descadastrar?t=${tokenDescadastro(ID)}`);
    const f = emailFimDoPlano('Ana', new Date('2026-11-01T15:00:00Z'), 'https://x.com', ID);
    expect(f.text).toContain('01/11/2026');
    expect(f.text).toContain('/api/descadastrar?t=');
  });
});
