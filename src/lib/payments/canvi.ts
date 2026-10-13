import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import type { ChargeState, PixCharge, PixProvider } from './provider';

/**
 * Integração com a API Gateway da Canvi (docs.canvi.com.br), Pix dinâmico.
 * Endpoints usados: POST /bt/token, POST /bt/pix, POST /bt/pix/dinamico/consulta.
 * Valores em centavos, como a API pede. Respostas vêm no formato { code, mensagem, data }.
 */

const DEFAULT_BASE = 'https://gateway-homol.service-canvi.com.br'; // sandbox; produção "sob demanda" (CANVI_BASE_URL)
const TOKEN_TTL_MS = 6 * 86_400_000; // o JWT dura 7 dias; renovamos com folga

export class CanviError extends Error {
  constructor(message: string, readonly code?: number) {
    super(message);
  }
}

const baseUrl = () => (process.env.CANVI_BASE_URL ?? DEFAULT_BASE).replace(/\/$/, '');
export const isCanviSandbox = () => baseUrl().includes('homol') || baseUrl().includes('sandbox');

async function login(): Promise<string> {
  const client_id = process.env.CANVI_CLIENT_ID;
  const private_key = process.env.CANVI_PRIVATE_KEY;
  if (!client_id || !private_key) throw new CanviError('CANVI_CLIENT_ID/CANVI_PRIVATE_KEY não configurados.');
  const res = await fetch(`${baseUrl()}/bt/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ client_id, private_key }),
  });
  const j = (await res.json().catch(() => ({}))) as { code?: number; token?: string; mensagem?: string };
  if (!res.ok || j.code !== 200 || !j.token) throw new CanviError(`Falha no login Canvi: ${j.mensagem ?? res.status}`, j.code);
  const db = await getDb();
  const row = { provider: 'canvi', token: j.token, expiresAt: new Date(Date.now() + TOKEN_TTL_MS), updatedAt: new Date() };
  await db.insert(schema.gatewayTokens).values(row).onConflictDoUpdate({ target: schema.gatewayTokens.provider, set: row });
  return j.token;
}

async function storedToken(): Promise<string | null> {
  const db = await getDb();
  const [t] = await db.select().from(schema.gatewayTokens).where(eq(schema.gatewayTokens.provider, 'canvi')).limit(1);
  return t && t.expiresAt > new Date() ? t.token : null;
}

type Envelope<T> = { code: number; mensagem?: string; data?: T };

async function call<T>(path: string, body: unknown): Promise<T> {
  let token = (await storedToken()) ?? (await login());
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(`${baseUrl()}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const j = (await res.json().catch(() => ({}))) as Envelope<T>;
    const unauthorized = res.status === 401 || j.code === 401;
    if (unauthorized && attempt === 0) {
      // Outro processo pode já ter renovado (login invalida o token anterior): usa o do banco antes de logar de novo.
      const fresh = await storedToken();
      token = fresh && fresh !== token ? fresh : await login();
      continue;
    }
    if (!res.ok || j.code !== 200) throw new CanviError(j.mensagem ?? `Erro Canvi ${res.status}`, j.code ?? res.status);
    return j.data as T;
  }
  throw new CanviError('Não autorizado na Canvi.');
}

type CreateData = { id_invoice_pix: number | string; brcode: string; vencimento?: string; valor?: string };
type QueryData = { id?: number | string; valor: string; status: string };

const toCents = (valor: string) => Math.round(Number.parseFloat(valor) * 100);

export function mapStatus(raw: string): ChargeState['status'] {
  const s = String(raw ?? '').trim().toLowerCase();
  if (['paid', 'pago', 'liquidado', 'completed', 'concluido', 'concluído', 'confirmed'].includes(s)) return 'paid';
  if (['expired', 'expirado', 'vencido'].includes(s)) return 'expired';
  if (['canceled', 'cancelled', 'cancelado'].includes(s)) return 'canceled';
  if (!['created', 'authorized', 'criado', 'autorizado', 'pending', 'pendente'].includes(s)) console.warn('[canvi] status desconhecido:', raw);
  return 'pending'; // created, authorized
}

export function canviProvider(): PixProvider {
  return {
    name: 'canvi',
    async createPixCharge({ amountCents, description, reference }): Promise<PixCharge> {
      // Sem "vencimento" a Canvi usa 1 hora; refletimos isso na nossa expiração.
      const data = await call<CreateData>('/bt/pix', {
        valor: String(amountCents),
        tipo_transacao: 'pixCashin', // pixCashin dispara webhook; pixCashinSemStatus não
        descricao: description.slice(0, 255),
        texto_instrucao: 'Pagamento de assinatura Simulaki.',
        identificador_externo: reference,
        identificador_movimento: 'simulaki-assinaturas',
        enviar_qr_code: false, // geramos o QR a partir do brcode
      });
      if (!data?.id_invoice_pix || !data.brcode) throw new CanviError('Resposta inesperada da Canvi ao criar o Pix.');
      return { gatewayId: String(data.id_invoice_pix), copyPaste: data.brcode, expiresAt: new Date(Date.now() + 60 * 60_000) };
    },
    async getCharge(gatewayId): Promise<ChargeState> {
      const d = await call<QueryData>('/bt/pix/dinamico/consulta', { id_invoice_pix: gatewayId });
      return { status: mapStatus(d.status), amountCents: toCents(d.valor), raw: String(d.status) };
    },
  };
}

/** Só sandbox: simula o pagamento de uma cobrança (POST /bt/desenvolvedor/simular_baixa). */
export async function simulateSandboxPayment(gatewayId: string, amountCents: number) {
  if (!isCanviSandbox()) throw new CanviError('Simulação só existe no sandbox.');
  await call('/bt/desenvolvedor/simular_baixa', {
    id: gatewayId,
    tipo_transacao: 'pixCashin',
    pix: { pagamento: { valor: (amountCents / 100).toFixed(2), pagador: { id: '25553985030', nome: 'Pagador de Teste' } } },
  });
}
