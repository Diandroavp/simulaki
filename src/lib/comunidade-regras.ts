/** Regras da comunidade (funções puras, testáveis). O público é jovem: nada de links, e-mails nem telefones. */

export const MUNDOS_COM = ['detran', 'enem', 'geral'] as const;
export type MundoCom = (typeof MUNDOS_COM)[number];
export const MUNDO_COM_NOME: Record<MundoCom, string> = { detran: '🚗 Detran', enem: '🎓 ENEM', geral: '💬 Geral' };

export const TIPOS = [
  { id: 'duvida', label: '❓ Dúvida' },
  { id: 'resultado', label: '📊 Resultado' },
  { id: 'conquista', label: '🏆 Conquista' },
  { id: 'conversa', label: '💬 Conversa' },
] as const;
export type Tipo = (typeof TIPOS)[number]['id'];
export const tipoValido = (t: string): t is Tipo => TIPOS.some((x) => x.id === t);
export const mundoComValido = (m: string): m is MundoCom => (MUNDOS_COM as readonly string[]).includes(m);

export const MOTIVOS_DENUNCIA = [
  { id: 'ofensivo', label: 'Ofensivo ou desrespeitoso' },
  { id: 'dados-pessoais', label: 'Mostra dados pessoais' },
  { id: 'spam', label: 'Spam ou propaganda' },
  { id: 'outro', label: 'Outro motivo' },
] as const;
export const motivoDenunciaValido = (m: string) => MOTIVOS_DENUNCIA.some((x) => x.id === m);

/** Quantas denúncias de pessoas diferentes escondem a publicação até um moderador olhar. */
export const DENUNCIAS_PARA_OCULTAR = 3;
export const MAX_TEXTO = 1000;

const RESERVADOS = ['admin', 'administrador', 'moderador', 'moderacao', 'suporte', 'simulaki', 'equipe', 'oficial'];

export function validarApelido(bruto: string): { ok: true; apelido: string } | { ok: false; erro: string } {
  const a = bruto.trim();
  if (a.length < 3 || a.length > 20) return { ok: false, erro: 'O apelido deve ter de 3 a 20 caracteres.' };
  if (!/^[A-Za-z0-9_]+$/.test(a)) return { ok: false, erro: 'Use só letras sem acento, números e _ (sem espaços).' };
  if (RESERVADOS.some((r) => a.toLowerCase().includes(r))) return { ok: false, erro: 'Esse apelido não pode ser usado. Escolha outro.' };
  return { ok: true, apelido: a };
}

export function validarTexto(bruto: string, min = 3): { ok: true; texto: string } | { ok: false; erro: string } {
  const t = bruto.replace(/\r\n/g, '\n').trim();
  if (t.length < min) return { ok: false, erro: 'Escreva um pouco mais.' };
  if (t.length > MAX_TEXTO) return { ok: false, erro: `O texto pode ter até ${MAX_TEXTO} caracteres.` };
  if (/(https?:\/\/|www\.)/i.test(t) || /\b[\w-]+\.(com|net|org|io|me|ly|gg|br|app|link)\b/i.test(t)) return { ok: false, erro: 'Por segurança, links não são permitidos na comunidade.' };
  if (/\S+@\S+/.test(t)) return { ok: false, erro: 'Não compartilhe e-mail nem @ de redes sociais.' };
  // 9 ou mais dígitos seguidos (ignorando espaço, traço, ponto e parênteses) parecem telefone ou documento
  if (/\d{9,}/.test(t.replace(/[\s().-]/g, ''))) return { ok: false, erro: 'Não compartilhe telefone, CPF ou outros números pessoais.' };
  return { ok: true, texto: t };
}
