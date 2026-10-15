import { createHmac, timingSafeEqual } from 'node:crypto';
import { and, eq, gte, isNotNull, lt, sql } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { sendEmail } from './email';

/**
 * Lembretes por e-mail, rodados uma vez por dia por um cron (ver vercel.json).
 * Desligados por padrão: só funcionam com REMINDERS_ENABLED=1 e um segredo (CRON_SECRET).
 * - "Sentimos sua falta": só para quem aceitou receber novidades, 3 dias depois do último simulado.
 * - "Seu plano termina": aviso de serviço, 3 dias antes do fim da assinatura.
 * Todo e-mail leva o link para sair da lista.
 */
const DIA = 86_400_000;

const segredo = () => process.env.UNSUBSCRIBE_SECRET || process.env.CRON_SECRET || '';
export const lembretesAtivos = () => process.env.REMINDERS_ENABLED === '1' && segredo().length >= 16;

export function tokenDescadastro(userId: string): string {
  return `${userId}.${createHmac('sha256', segredo()).update(userId).digest('base64url').slice(0, 32)}`;
}

/** Devolve o id do usuário se o token é válido. */
export function lerTokenDescadastro(token: string): string | null {
  if (!segredo()) return null;
  const [id, mac] = token.split('.');
  if (!id || !mac || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const esperado = tokenDescadastro(id).split('.')[1]!;
  const a = Buffer.from(mac); const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b) ? id : null;
}

const rodape = (appUrl: string, userId: string) => `\n\n--\nNão quer mais receber estes e-mails? ${appUrl}/api/descadastrar?t=${tokenDescadastro(userId)}`;

export function emailSaudade(nome: string, appUrl: string, userId: string) {
  return {
    subject: 'Que tal um treino rápido hoje?',
    text: `Olá, ${nome}.\n\nFaz alguns dias que você não treina no Simulaki. Dez questões já ajudam a manter o ritmo:\n${appUrl}/app\n\nEscolha o seu mundo (Detran, ENEM…) e faça 5, 10 ou 20 questões, só o que der hoje.${rodape(appUrl, userId)}`,
  };
}

export function emailFimDoPlano(nome: string, fim: Date, appUrl: string, userId: string) {
  const data = fim.toLocaleDateString('pt-BR', { timeZone: 'America/Manaus' });
  return {
    subject: 'Seu plano do Simulaki termina em breve',
    text: `Olá, ${nome}.\n\nSeu acesso ilimitado vai até ${data}. Para continuar sem interrupção, você pode estender o plano a qualquer momento:\n${appUrl}/planos${rodape(appUrl, userId)}`,
  };
}

export async function rodarLembretes(now = new Date(), appUrl = process.env.APP_URL ?? 'http://localhost:3000') {
  if (!lembretesAtivos()) return { ativo: false as const, saudade: 0, fimDoPlano: 0 };
  const db = await getDb();
  const ativo = and(isNotNull(schema.users.emailVerifiedAt), sql`${schema.users.deletedAt} is null`);

  // Último simulado ou treino entre 3 e 4 dias atrás (a janela de 24h garante um único aviso).
  const inativos = await db
    .select({ id: schema.users.id, nome: schema.users.name, email: schema.users.email, ultimo: sql<Date>`max(${schema.attempts.startedAt})` })
    .from(schema.users)
    .innerJoin(schema.attempts, eq(schema.attempts.userId, schema.users.id))
    .where(and(ativo, eq(schema.users.marketingConsent, true)))
    .groupBy(schema.users.id)
    .having(sql`max(${schema.attempts.startedAt}) >= ${new Date(now.getTime() - 4 * DIA).toISOString()}::timestamptz and max(${schema.attempts.startedAt}) < ${new Date(now.getTime() - 3 * DIA).toISOString()}::timestamptz`);
  let saudade = 0;
  for (const u of inativos) {
    const m = emailSaudade(u.nome.split(' ')[0]!, appUrl, u.id);
    if (await sendEmail({ to: u.email, ...m })) saudade++;
  }

  const acabando = await db
    .select({ id: schema.users.id, nome: schema.users.name, email: schema.users.email, fim: schema.subscriptions.endsAt })
    .from(schema.subscriptions)
    .innerJoin(schema.users, eq(schema.users.id, schema.subscriptions.ownerUserId))
    .where(and(ativo, eq(schema.subscriptions.status, 'active'), gte(schema.subscriptions.endsAt, new Date(now.getTime() + 3 * DIA)), lt(schema.subscriptions.endsAt, new Date(now.getTime() + 4 * DIA))));
  let fimDoPlano = 0;
  for (const u of acabando) {
    const m = emailFimDoPlano(u.nome.split(' ')[0]!, u.fim!, appUrl, u.id);
    if (await sendEmail({ to: u.email, ...m })) fimDoPlano++;
  }
  return { ativo: true as const, saudade, fimDoPlano };
}

export async function descadastrar(userId: string): Promise<void> {
  const db = await getDb();
  await db.update(schema.users).set({ marketingConsent: false }).where(eq(schema.users.id, userId));
}
