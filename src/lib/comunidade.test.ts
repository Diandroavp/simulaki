import { describe, expect, it } from 'vitest';
import type { CurrentUser } from './auth';

process.env.PGLITE_DIR = 'memory://';
const { getDb, schema } = await import('@/db');
const { decidirDenuncia, definirApelido, denunciar, denunciasAbertas, eleger, feed, ocultadas, podePostar, publicar, responder, topico } = await import('./comunidade');
const { deleteAccount } = await import('./account');

async function novo(email: string, nick: string | null, extra: Partial<CurrentUser> = {}): Promise<CurrentUser> {
  const db = await getDb();
  const [u] = await db.insert(schema.users).values({ name: 'Fulano ' + email, email, emailVerifiedAt: new Date() }).returning();
  if (nick) await definirApelido(u!.id, nick);
  return { id: u!.id, name: u!.name, email, role: 'student', emailVerified: true, nickname: nick, moderator: false, muted: false, ...extra };
}

describe('comunidade', () => {
  it('apelido é único sem diferenciar maiúsculas', async () => {
    const a = await novo('c1@example.com', 'Fera_Um');
    const db = await getDb();
    const [outro] = await db.insert(schema.users).values({ name: 'Outro', email: 'c1b@example.com' }).returning();
    expect(await definirApelido(outro!.id, 'fera_um')).toEqual({ ok: false, erro: 'Esse apelido já está em uso.' });
    expect(a.nickname).toBe('Fera_Um');
  });

  it('só publica com e-mail confirmado e apelido', async () => {
    expect(podePostar({ id: 'x', name: 'x', email: 'x', role: 'student', emailVerified: false, nickname: 'abc', moderator: false, muted: false }).ok).toBe(false);
    expect(podePostar({ id: 'x', name: 'x', email: 'x', role: 'student', emailVerified: true, nickname: null, moderator: false, muted: false }).ok).toBe(false);
    expect(podePostar({ id: 'x', name: 'x', email: 'x', role: 'student', emailVerified: true, nickname: 'abc', moderator: false, muted: true }).ok).toBe(false);
  });

  it('publica, responde, mostra no feed e recusa link', async () => {
    const a = await novo('c2@example.com', 'Autor_Dois');
    const b = await novo('c3@example.com', 'Ajuda_Tres');
    expect((await publicar({ user: a, mundo: 'enem', kind: 'duvida', body: 'visite www.golpe.com' })).ok).toBe(false);
    const p = await publicar({ user: a, mundo: 'enem', kind: 'duvida', body: 'Alguém explica a questão de razão e proporção?' });
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    expect((await responder(b, p.id, 'Claro! Monte a regra de três.')).ok).toBe(true);
    const t = await topico(p.id);
    expect(t?.respostas).toHaveLength(1);
    expect(t?.respostas[0]?.autor).toBe('Ajuda_Tres');
    const f = await feed('enem', null);
    expect(f.find((x) => x.id === p.id)?.respostas).toBe(1);
  });

  it('mostra o marcador de ADM e de moderador', async () => {
    const adm = await novo('m1@example.com', 'Chefe_Um', { role: 'admin' });
    const db = await getDb();
    const { eq } = await import('drizzle-orm');
    await db.update(schema.users).set({ role: 'admin' }).where(eq(schema.users.id, adm.id));
    const mod = await novo('m2@example.com', 'Ajudante_Dois');
    await db.update(schema.users).set({ moderator: true }).where(eq(schema.users.id, mod.id));
    const aluno = await novo('m3@example.com', 'Aluno_Tres');
    const pa = await publicar({ user: adm, mundo: 'geral', kind: 'conversa', body: 'mensagem do admin' });
    const pm = await publicar({ user: mod, mundo: 'geral', kind: 'conversa', body: 'mensagem do moderador' });
    const pl = await publicar({ user: aluno, mundo: 'geral', kind: 'conversa', body: 'mensagem do aluno' });
    const f = await feed('geral', null);
    expect(f.find((x) => pa.ok && x.id === pa.id)?.papel).toBe('admin');
    expect(f.find((x) => pm.ok && x.id === pm.id)?.papel).toBe('moderador');
    expect(f.find((x) => pl.ok && x.id === pl.id)?.papel).toBeNull();
  });

  it('3 denúncias escondem a publicação; o moderador decide', async () => {
    const autor = await novo('c4@example.com', 'Autor_Quatro');
    const mod = await novo('c5@example.com', 'Mod_Cinco', { moderator: true });
    const p = await publicar({ user: autor, mundo: 'geral', kind: 'conversa', body: 'texto que vai ser denunciado' });
    if (!p.ok) throw new Error('falhou');
    const den = [await novo('d1@example.com', 'Den_Um'), await novo('d2@example.com', 'Den_Dois'), await novo('d3@example.com', 'Den_Tres')];
    expect((await denunciar(autor, p.id, 'spam', '')).ok).toBe(false); // não denuncia a si
    for (const d of den) expect((await denunciar(d, p.id, 'ofensivo', '')).ok).toBe(true);
    expect(await topico(p.id)).toBeNull(); // oculta para os alunos
    expect((await ocultadas()).some((x) => x.id === p.id)).toBe(true);
    const abertas = await denunciasAbertas();
    expect(abertas.find((x) => x.postId === p.id)?.denuncias).toHaveLength(3);
    await decidirDenuncia(mod, p.id, 'manter');
    expect(await topico(p.id)).not.toBeNull(); // voltou
    expect((await denunciasAbertas()).some((x) => x.postId === p.id)).toBe(false);
  });

  it('ocultar e silenciar impede novas publicações', async () => {
    const autor = await novo('c6@example.com', 'Autor_Seis');
    const mod = await novo('c7@example.com', 'Mod_Sete', { moderator: true });
    const p = await publicar({ user: autor, mundo: 'geral', kind: 'conversa', body: 'mensagem ruim' });
    if (!p.ok) throw new Error('falhou');
    const d = await novo('d4@example.com', 'Den_Quatro');
    await denunciar(d, p.id, 'ofensivo', '');
    await decidirDenuncia(mod, p.id, 'ocultar-silenciar');
    expect(await topico(p.id)).toBeNull();
    const db = await getDb();
    const [u] = await db.select().from(schema.users).limit(1).where((await import('drizzle-orm')).eq(schema.users.id, autor.id));
    expect(u?.communityMuted).toBe(true);
  });

  it('eleger moderador exige conta existente com e-mail confirmado', async () => {
    await novo('c8@example.com', 'Futuro_Mod');
    expect((await eleger('naoexiste@example.com', true)).ok).toBe(false);
    expect((await eleger('C8@example.com', true)).ok).toBe(true);
  });

  it('excluir a conta apaga o texto e o apelido', async () => {
    const a = await novo('c9@example.com', 'Sai_Nove');
    const p = await publicar({ user: a, mundo: 'geral', kind: 'conversa', body: 'vou sair daqui' });
    if (!p.ok) throw new Error('falhou');
    expect(await deleteAccount(a.id)).toBe('ok');
    expect(await topico(p.id)).toBeNull();
    const db = await getDb();
    const rows = await db.select().from(schema.communityPosts);
    expect(rows.find((r) => r.id === p.id)?.body).toBe('[mensagem removida pelo autor]');
  });
});
