'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getCurrentUser, requireAdmin, requireModerator } from '@/lib/auth';
import { conquistasDe } from '@/lib/conquistas-db';
import { decidirDenuncia, definirApelido, denunciar, editarPropria, eleger, publicar, reativar, removerPropria, responder, restaurar, type Decisao } from '@/lib/comunidade';
import { mundoComValido, motivoDenunciaValido, tipoValido } from '@/lib/comunidade-regras';
import { questaoPorId } from '@/lib/questao-por-id';

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const volta = (path: string, msg: string, tipo: 'erro' | 'ok' = 'erro'): never => redirect(`${path}${path.includes('?') ? '&' : '?'}${tipo}=${encodeURIComponent(msg)}`);

async function logado() {
  const u = await getCurrentUser();
  if (!u) redirect('/entrar');
  return u!;
}

export async function apelidoAction(form: FormData) {
  const u = await logado();
  const r = await definirApelido(u.id, str(form, 'apelido'));
  if (!r.ok) volta('/comunidade', r.erro);
  redirect('/comunidade?ok=' + encodeURIComponent('Apelido definido. Bem-vindo à comunidade!'));
}

export async function publicarAction(form: FormData) {
  const u = await logado();
  const tipo = str(form, 'tipo'), mundo = str(form, 'mundo');
  const questao = str(form, 'questao');
  const back = `/comunidade/novo?tipo=${encodeURIComponent(tipo)}&mundo=${encodeURIComponent(mundo)}${questao ? `&questao=${encodeURIComponent(questao)}` : ''}`;
  if (!tipoValido(tipo) || !mundoComValido(mundo)) volta('/comunidade/novo', 'Escolha o tipo e a área.');
  const r = await publicar({ user: u, mundo: mundo as never, kind: tipo as never, body: str(form, 'texto'), questionId: questao && questaoPorId(questao) ? questao : null });
  if (!r.ok) volta(back, r.erro);
  revalidatePath('/comunidade');
  redirect(`/comunidade/${(r as { id: string }).id}`);
}

export async function responderAction(form: FormData) {
  const u = await logado();
  const id = str(form, 'id');
  const r = await responder(u, id, str(form, 'texto'));
  if (!r.ok) volta(`/comunidade/${id}`, r.erro);
  revalidatePath(`/comunidade/${id}`);
  redirect(`/comunidade/${id}?ok=${encodeURIComponent('Resposta enviada.')}`);
}

export async function editarAction(form: FormData) {
  const u = await logado();
  const id = str(form, 'id'), raiz = str(form, 'raiz');
  const r = await editarPropria(u, id, str(form, 'texto'));
  if (!r.ok) volta(`/comunidade/${raiz}`, r.erro);
  revalidatePath(`/comunidade/${raiz}`);
  redirect(`/comunidade/${raiz}?ok=${encodeURIComponent('Mensagem atualizada.')}`);
}

export async function excluirAction(form: FormData) {
  const u = await logado();
  const id = str(form, 'id'), raiz = str(form, 'raiz');
  await removerPropria(u, id);
  revalidatePath('/comunidade');
  redirect(id === raiz ? '/comunidade?ok=' + encodeURIComponent('Publicação excluída.') : `/comunidade/${raiz}?ok=${encodeURIComponent('Resposta excluída.')}`);
}

export async function denunciarAction(form: FormData) {
  const u = await logado();
  const id = str(form, 'id'), raiz = str(form, 'raiz'), motivo = str(form, 'motivo');
  if (!motivoDenunciaValido(motivo)) volta(`/comunidade/${raiz}`, 'Escolha o motivo da denúncia.');
  const r = await denunciar(u, id, motivo, str(form, 'nota'));
  if (!r.ok) volta(`/comunidade/${raiz}`, r.erro);
  redirect(`/comunidade/${raiz}?ok=${encodeURIComponent('Denúncia enviada. Obrigado por ajudar a cuidar da comunidade.')}`);
}

/** Compartilha o nível atual como publicação do tipo conquista. */
export async function compartilharConquistaAction() {
  const u = await logado();
  const c = await conquistasDe(u.id);
  const texto = `Cheguei ao nível ${c.nivel.emoji} ${c.nivel.nome} com ${c.xp} XP e ${c.ganhos} ${c.ganhos === 1 ? 'troféu' : 'troféus'} no Simulaki!`;
  const r = await publicar({ user: u, mundo: 'geral', kind: 'conquista', body: texto });
  if (!r.ok) volta('/conquistas', r.erro);
  revalidatePath('/comunidade');
  redirect(`/comunidade/${(r as { id: string }).id}`);
}

// ---------- moderação ----------

export async function decidirAction(form: FormData) {
  const m = await requireModerator();
  if (!m) redirect('/');
  const d = str(form, 'decisao');
  if (d === 'ocultar' || d === 'manter' || d === 'ocultar-silenciar') await decidirDenuncia(m, str(form, 'id'), d as Decisao);
  revalidatePath('/comunidade/moderacao');
  redirect('/comunidade/moderacao');
}

export async function restaurarAction(form: FormData) {
  if (!(await requireModerator())) redirect('/');
  await restaurar(str(form, 'id'));
  redirect('/comunidade/moderacao');
}

export async function reativarAction(form: FormData) {
  if (!(await requireModerator())) redirect('/');
  await reativar(str(form, 'id'));
  redirect('/comunidade/moderacao');
}

export async function elegerAction(form: FormData) {
  if (!(await requireAdmin())) redirect('/');
  const r = await eleger(str(form, 'email'), str(form, 'ativo') !== '0');
  redirect(`/admin/moderadores?${r.ok ? 'ok=Feito.' : 'erro=' + encodeURIComponent(r.erro)}`);
}
