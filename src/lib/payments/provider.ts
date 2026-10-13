import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { canviProvider } from './canvi';

export type PixCharge = { gatewayId: string; copyPaste: string; expiresAt: Date };

export type ChargeState = { status: 'pending' | 'paid' | 'expired' | 'canceled'; amountCents: number; raw?: string };

export interface PixProvider {
  name: string;
  createPixCharge(input: { amountCents: number; description: string; reference: string }): Promise<PixCharge>;
  /** Consulta a cobrança no gateway. É a fonte da verdade: webhook sozinho nunca libera acesso. */
  getCharge(gatewayId: string): Promise<ChargeState>;
}

/**
 * Provedor de teste: não move dinheiro e o código gerado NÃO é um Pix válido.
 * Serve para desenvolver o fluxo inteiro (cobrança, webhook, assinatura) antes de ligar a API real.
 */
const mock: PixProvider = {
  name: 'mock',
  async createPixCharge({ amountCents }) {
    const id = `mock_${randomBytes(8).toString('hex')}`;
    return {
      gatewayId: id,
      copyPaste: `SIMULAKI-TESTE-NAO-PAGAVEL|${id}|${(amountCents / 100).toFixed(2)}`,
      expiresAt: new Date(Date.now() + 30 * 60_000),
    };
  },
  async getCharge() {
    return { status: 'pending', amountCents: 0 }; // o provedor de teste confirma pelo botão/webhook assinado
  },
};

export function getPixProvider(): PixProvider {
  const name = process.env.PAYMENT_GATEWAY ?? 'mock';
  if (name === 'mock') {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_MOCK_PAYMENTS !== '1') {
      throw new Error('Gateway de pagamento não configurado: o provedor de teste está bloqueado em produção.');
    }
    return mock;
  }
  if (name === 'canvi') return canviProvider();
  throw new Error(`Gateway "${name}" ainda não implementado.`);
}

/** Pix só abre quando o provedor está configurado; senão o site mostra "em breve" em vez de dar erro. */
export function paymentsEnabled(): boolean {
  const name = process.env.PAYMENT_GATEWAY ?? 'mock';
  if (name === 'canvi') return !!(process.env.CANVI_CLIENT_ID && process.env.CANVI_PRIVATE_KEY);
  if (name === 'mock') return process.env.NODE_ENV !== 'production' || process.env.ALLOW_MOCK_PAYMENTS === '1';
  return false;
}

export const isMockGateway = () => (process.env.PAYMENT_GATEWAY ?? 'mock') === 'mock';

/** Assinatura HMAC-SHA256 do corpo bruto do webhook (hex). */
export function signBody(rawBody: string, secret: string): string {
  return createHmac('sha256', secret).update(rawBody).digest('hex');
}

export function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = Buffer.from(signBody(rawBody, secret), 'hex');
  let given: Buffer;
  try {
    given = Buffer.from(signature, 'hex');
  } catch {
    return false;
  }
  return given.length === expected.length && timingSafeEqual(given, expected);
}
