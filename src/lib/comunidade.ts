import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import type { CurrentUser } from './auth';
import { allowAction } from './ratelimit';
import { DENUNCIAS_PARA_OCULTAR, validarApelido, validarTexto, type MundoCom, type Tipo } from './comunidade-regras';

const HORA = 3_600_000;

export type Motivo = { ok: true } | { ok: false; erro: string };

/** Quem pode escrever: e-mail confirmado, apelido escolhido e não silenciado. */
export function podePostar(u: CurrentUser): Motivo {
  if (u.muted) return { ok: false, erro: 'Sua conta está sem permissão para publicar na comunidade.' };
  if (!u.emailVerified) return { ok: false, erro: 'Confirme seu e-mail para publicar na comunidade.' };
  if (!u.nickname) return { ok: false, erro: 'Escolha um apelido antes de publicar.' };
  return { ok: true };
}

export async function definirApelido(userId: string, bruto: string): Promise<Motivo> {
  const v = validarApelido(bruto);
  if (!v.ok) return v;
  const db = await getDb();
  const [em_uso] = await db.select({ id: schema.users.id }).from(schema.users).where(sql`lower(${schema.users.nickname}) = ${v.apelido.toLowerCase()}`).limit(1);
  if (em_uso) return { ok: false, erro: 'Esse apelido já está em uso.' };
  try {
    await db.update(schema.users).set({ nickname: v.apelido }).where(and(eq(schema.users.id, userId), isNull(schema.users.nickname)));
  } catch {
    return { ok: false, erro: 'Esse apelido já está em uso.' };
  }
  return { ok: true };
}

export type NovaPublicacao = { user: CurrentUser; mundo: MundoCom; kind: Tipo; body: string; questionId?: string | null };

export async function publicar(p: NovaPublicacao): Promise<{ ok: true; id: string } | { ok: false; erro: string }> {
  const pode = podePostar(p.user);
  if (!pode.ok) return pode;
  const t = validarTexto(p.body);
  if (!t.ok) return t;
  if (!(await allowAction(`post:${p.user.id}`, 10, HORA))) return { ok: false, erro: 'Você publicou bastante agora há pouco. Tente de novo daqui a um tempo.' };
  const db = await getDb();
  const [row] = await db.insert(schema.communityPosts).values({ authorId: p.user.id, mundo: p.mundo, kind: p.kind, body: t.texto, questionId: p.questionId ?? null }).returning({ id: schema.communityPosts.id });
  return { ok: true, id: row!.id };
}

export async function responder(user: CurrentUser, postId: string, body: string): Promise<Motivo> {
  const pode = podePostar(user);
  if (!pode.ok) return pode;
  const t = validarTexto(body, 2);
  if (!t.ok) return t;
  const db = await getDb();
  const [post] = await db.select().from(schema.communityPosts).where(and(eq(schema.communityPosts.id, postId), isNull(schema.communityPosts.parentId))).limit(1);
  if (!post || post.status !== 'visible') return { ok: false, erro: 'Essa publicação não está mais disponível.' };
  if (!(await allowAction(`reply:${user.id}`, 30, HORA))) return { ok: false, erro: 'Muitas respostas em pouco tempo. Tente de novo daqui a um tempo.' };
  await db.insert(schema.communityPosts).values({ authorId: user.id, parentId: postId, mundo: post.mundo, kind: 'resposta', body: t.texto });
  return { ok: true };
}

export type Papel = 'admin' | 'moderador' | null;
export type Item = { id: string; autor: string | null; papel: Papel; autorId: string; mundo: string; kind: string; body: string; questionId: string | null; status: string; createdAt: Date; editedAt: Date | null; respostas: number };

const campos = {
  id: schema.communityPosts.id, autor: schema.users.nickname,
  papel: sql<Papel>`(case when ${schema.users.role} = 'admin' then 'admin' when ${schema.users.moderator} then 'moderador' else null end)`, autorId: schema.communityPosts.authorId, mundo: schema.communityPosts.mundo,
  kind: schema.communityPosts.kind, body: schema.communityPosts.body, questionId: schema.communityPosts.questionId, status: schema.communityPosts.status, createdAt: schema.communityPosts.createdAt, editedAt: schema.communityPosts.editedAt,
};

export async function feed(mundo: string | null, kind: string | null, limite = 40): Promise<Item[]> {
  const db = await getDb();
  const filtros = [isNull(schema.communityPosts.parentId), eq(schema.communityPosts.status, 'visible')];
  if (mundo) filtros.push(eq(schema.communityPosts.mundo, mundo));
  if (kind) filtros.push(eq(schema.communityPosts.kind, kind));
  const rows = await db.select(campos).from(schema.communityPosts).innerJoin(schema.users, eq(schema.users.id, schema.communityPosts.authorId)).where(and(...filtros)).orderBy(desc(schema.communityPosts.createdAt)).limit(limite);
  if (rows.length === 0) return [];
  const cont = await db
    .select({ parentId: schema.communityPosts.parentId, n: sql<number>`count(*)::int` })
    .from(schema.communityPosts)
    .where(and(inArray(schema.communityPosts.parentId, rows.map((r) => r.id)), eq(schema.communityPosts.status, 'visible')))
    .groupBy(schema.communityPosts.parentId);
  const n = new Map(cont.map((c) => [c.parentId, c.n]));
  return rows.map((r) => ({ ...r, respostas: n.get(r.id) ?? 0 }));
}

export async function topico(id: string, comOcultas = false): Promise<{ post: Item; respostas: Item[] } | null> {
  const db = await getDb();
  const [post] = await db.select(campos).from(schema.communityPosts).innerJoin(schema.users, eq(schema.users.id, schema.communityPosts.authorId)).where(and(eq(schema.communityPosts.id, id), isNull(schema.communityPosts.parentId))).limit(1);
  if (!post || (!comOcultas && post.status !== 'visible')) return null;
  const rs = await db.select(campos).from(schema.communityPosts).innerJoin(schema.users, eq(schema.users.id, schema.communityPosts.authorId)).where(and(eq(schema.communityPosts.parentId, id), comOcultas ? sql`true` : eq(schema.communityPosts.status, 'visible'))).orderBy(asc(schema.communityPosts.createdAt)).limit(200);
  return { post: { ...post, respostas: rs.length }, respostas: rs.map((r) => ({ ...r, respostas: 0 })) };
}

/** O autor edita a própria mensagem (só enquanto está visível). Passa pelas mesmas regras de texto e fica marcada como editada. */
export async function editarPropria(user: CurrentUser, id: string, body: string): Promise<Motivo> {
  const pode = podePostar(user);
  if (!pode.ok) return pode;
  const t = validarTexto(body, 2);
  if (!t.ok) return t;
  const db = await getDb();
  const r = await db
    .update(schema.communityPosts)
    .set({ body: t.texto, editedAt: new Date() })
    .where(and(eq(schema.communityPosts.id, id), eq(schema.communityPosts.authorId, user.id), eq(schema.communityPosts.status, 'visible')))
    .returning({ id: schema.communityPosts.id });
  return r.length ? { ok: true } : { ok: false, erro: 'Não foi possível editar essa mensagem.' };
}

/** O autor apaga a própria publicação (o texto some; as denúncias ficam). */
export async function removerPropria(user: CurrentUser, postId: string): Promise<void> {
  const db = await getDb();
  await db.update(schema.communityPosts).set({ status: 'removed', body: '[mensagem removida pelo autor]' }).where(and(eq(schema.communityPosts.id, postId), eq(schema.communityPosts.authorId, user.id)));
}

export async function denunciar(user: CurrentUser, postId: string, reason: string, note: string): Promise<Motivo> {
  if (!user.emailVerified) return { ok: false, erro: 'Confirme seu e-mail para denunciar.' };
  if (!(await allowAction(`report:${user.id}`, 20, HORA))) return { ok: false, erro: 'Muitas denúncias em pouco tempo.' };
  const db = await getDb();
  const [post] = await db.select().from(schema.communityPosts).where(eq(schema.communityPosts.id, postId)).limit(1);
  if (!post || post.status === 'removed') return { ok: false, erro: 'Publicação não encontrada.' };
  if (post.authorId === user.id) return { ok: false, erro: 'Você não pode denunciar a própria publicação. Use "Excluir".' };
  await db.insert(schema.communityReports).values({ postId, reporterId: user.id, reason, note: note.slice(0, 300) || null }).onConflictDoNothing();
  const [r] = await db.select({ n: sql<number>`count(distinct ${schema.communityReports.reporterId})::int` }).from(schema.communityReports).where(and(eq(schema.communityReports.postId, postId), eq(schema.communityReports.status, 'open')));
  if ((r?.n ?? 0) >= DENUNCIAS_PARA_OCULTAR && post.status === 'visible') {
    await db.update(schema.communityPosts).set({ status: 'hidden' }).where(eq(schema.communityPosts.id, postId));
  }
  return { ok: true };
}

export type DenunciaAberta = { postId: string; item: Item; denuncias: { reason: string; note: string | null; por: string | null }[]; autorSilenciado: boolean };

export async function denunciasAbertas(): Promise<DenunciaAberta[]> {
  const db = await getDb();
  const rows = await db
    .select({ postId: schema.communityReports.postId, reason: schema.communityReports.reason, note: schema.communityReports.note, por: schema.users.nickname })
    .from(schema.communityReports)
    .innerJoin(schema.users, eq(schema.users.id, schema.communityReports.reporterId))
    .where(eq(schema.communityReports.status, 'open'))
    .orderBy(asc(schema.communityReports.createdAt));
  const ids = [...new Set(rows.map((r) => r.postId))];
  if (ids.length === 0) return [];
  const posts = await db
    .select({ ...campos, silenciado: schema.users.communityMuted })
    .from(schema.communityPosts)
    .innerJoin(schema.users, eq(schema.users.id, schema.communityPosts.authorId))
    .where(inArray(schema.communityPosts.id, ids));
  return ids.flatMap((id) => {
    const p = posts.find((x) => x.id === id);
    if (!p) return [];
    return [{ postId: id, item: { ...p, respostas: 0 }, denuncias: rows.filter((r) => r.postId === id).map((r) => ({ reason: r.reason, note: r.note, por: r.por })), autorSilenciado: p.silenciado }];
  });
}

export async function totalDenunciasAbertas(): Promise<number> {
  const db = await getDb();
  const [r] = await db.select({ n: sql<number>`count(distinct ${schema.communityReports.postId})::int` }).from(schema.communityReports).where(eq(schema.communityReports.status, 'open'));
  return r?.n ?? 0;
}

export type Decisao = 'ocultar' | 'manter' | 'ocultar-silenciar';

export async function decidirDenuncia(moderador: CurrentUser, postId: string, decisao: Decisao): Promise<void> {
  const db = await getDb();
  const [post] = await db.select().from(schema.communityPosts).where(eq(schema.communityPosts.id, postId)).limit(1);
  if (!post) return;
  const upheld = decisao !== 'manter';
  await db.transaction(async (tx) => {
    await tx.update(schema.communityReports).set({ status: upheld ? 'upheld' : 'dismissed', resolvedBy: moderador.id, resolvedAt: new Date() }).where(and(eq(schema.communityReports.postId, postId), eq(schema.communityReports.status, 'open')));
    await tx.update(schema.communityPosts).set({ status: upheld ? 'hidden' : post.status === 'hidden' ? 'visible' : post.status }).where(and(eq(schema.communityPosts.id, postId), sql`${schema.communityPosts.status} <> 'removed'`));
    if (decisao === 'ocultar-silenciar' && post.authorId !== moderador.id) await tx.update(schema.users).set({ communityMuted: true }).where(eq(schema.users.id, post.authorId));
  });
}

export async function ocultadas(): Promise<Item[]> {
  const db = await getDb();
  const rows = await db.select(campos).from(schema.communityPosts).innerJoin(schema.users, eq(schema.users.id, schema.communityPosts.authorId)).where(eq(schema.communityPosts.status, 'hidden')).orderBy(desc(schema.communityPosts.createdAt)).limit(50);
  return rows.map((r) => ({ ...r, respostas: 0 }));
}

export async function restaurar(postId: string): Promise<void> {
  const db = await getDb();
  await db.update(schema.communityPosts).set({ status: 'visible' }).where(and(eq(schema.communityPosts.id, postId), eq(schema.communityPosts.status, 'hidden')));
}

export async function silenciados(): Promise<{ id: string; apelido: string | null }[]> {
  const db = await getDb();
  return db.select({ id: schema.users.id, apelido: schema.users.nickname }).from(schema.users).where(eq(schema.users.communityMuted, true)).limit(100);
}

export async function reativar(userId: string): Promise<void> {
  const db = await getDb();
  await db.update(schema.users).set({ communityMuted: false }).where(eq(schema.users.id, userId));
}

export async function moderadores(): Promise<{ id: string; name: string; email: string; apelido: string | null }[]> {
  const db = await getDb();
  return db.select({ id: schema.users.id, name: schema.users.name, email: schema.users.email, apelido: schema.users.nickname }).from(schema.users).where(and(eq(schema.users.moderator, true), isNull(schema.users.deletedAt)));
}

export async function eleger(email: string, ativo: boolean): Promise<Motivo> {
  const db = await getDb();
  const [u] = await db.select({ id: schema.users.id, verified: schema.users.emailVerifiedAt }).from(schema.users).where(and(sql`lower(${schema.users.email}) = ${email.trim().toLowerCase()}`, isNull(schema.users.deletedAt))).limit(1);
  if (!u) return { ok: false, erro: 'Nenhuma conta encontrada com esse e-mail.' };
  if (ativo && !u.verified) return { ok: false, erro: 'Essa conta ainda não confirmou o e-mail.' };
  await db.update(schema.users).set({ moderator: ativo }).where(eq(schema.users.id, u.id));
  return { ok: true };
}
