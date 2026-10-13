import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

process.env.PGLITE_DIR = 'memory://';
process.env.PAYMENT_GATEWAY = 'canvi';
process.env.CANVI_CLIENT_ID = 'cid';
process.env.CANVI_PRIVATE_KEY = 'pk';
process.env.CANVI_WEBHOOK_SECRET = 'segredo-bem-comprido-123';

// Servidor falso que imita a API da Canvi como documentada.
let server: Server;
let logins = 0;
let validToken = '';
const invoices = new Map<string, { valor: string; status: string }>();
let nextId = 5000;
const calls: string[] = [];

beforeAll(async () => {
  server = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const j = body ? JSON.parse(body) : {};
      const send = (o: object) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(o)); };
      calls.push(`${req.method} ${req.url}`);
      if (req.url === '/bt/token') {
        if (j.client_id !== 'cid' || j.private_key !== 'pk') return send({ code: 401, mensagem: 'Credencial não encontrada!' });
        validToken = `tok-${++logins}`; // novo login invalida o anterior, como na Canvi real
        return send({ code: 200, mensagem: 'Logado com sucesso!', token: validToken });
      }
      if (req.headers.authorization !== `Bearer ${validToken}`) { res.statusCode = 401; return send({ code: 401, mensagem: 'Token inválido' }); }
      if (req.url === '/bt/pix') {
        const id = String(++nextId);
        invoices.set(id, { valor: (Number(j.valor) / 100).toFixed(2), status: 'created' });
        return send({ code: 200, mensagem: 'Invoice PIX gerado', data: { id_invoice_pix: Number(id), brcode: `000201BRCODE${id}`, valor: (Number(j.valor) / 100).toFixed(2), status: 'created' } });
      }
      if (req.url === '/bt/pix/dinamico/consulta') {
        const inv = invoices.get(String(j.id_invoice_pix));
        return send(inv ? { code: 200, mensagem: 'Dados do Pix', data: { id: Number(j.id_invoice_pix), ...inv } } : { code: 400, mensagem: 'Invoice não encontrado', data: '' });
      }
      send({ code: 404, mensagem: 'rota' });
    });
  });
  await new Promise<void>((r) => server.listen(0, r));
  process.env.CANVI_BASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());

const { getDb, schema } = await import('@/db');
const { startCheckout, userHasAccess } = await import('./billing');
const { candidateIds, handleCanviNotification, reconcilePayment, secretMatches } = await import('./canvi-webhook');
const { mapStatus } = await import('./payments/canvi');

async function userWithPendingPix() {
  const db = await getDb();
  const [u] = await db.insert(schema.users).values({ emailVerifiedAt: new Date(), name: 'T', email: `c${Math.random()}@t.com` }).returning();
  const r = await startCheckout(u!.id, 'passe-60');
  if (!r.ok || !('paymentId' in r)) throw new Error('checkout falhou');
  const [pay] = (await db.select().from(schema.payments)).filter((p) => p.id === r.paymentId);
  return { uid: u!.id, pay: pay! };
}

describe('Canvi: cobrança Pix', () => {
  it('cria a cobrança em centavos, guarda id_invoice_pix e o brcode, e reaproveita o token', async () => {
    const { pay } = await userWithPendingPix();
    expect(pay.gatewayId).toMatch(/^500\d$/);
    expect(pay.pixCopyPaste).toBe(`000201BRCODE${pay.gatewayId}`);
    expect(pay.amountCents).toBe(2990);
    expect(invoices.get(pay.gatewayId!)?.valor).toBe('29.90'); // 2990 centavos viraram R$ 29,90 na API
    await userWithPendingPix();
    expect(logins).toBe(1); // um login só; token em cache no banco
  });

  it('token expirado/invalidado (401) renova uma vez e repete a chamada', async () => {
    validToken = 'outro-processo-invalidou'; // simula login em outro lugar
    const { pay } = await userWithPendingPix();
    expect(pay.gatewayId).toBeTruthy();
    expect(logins).toBe(2);
  });
});

describe('Canvi: confirmação', () => {
  it('aviso de pagamento NÃO libera acesso se a API da Canvi diz que não está pago', async () => {
    const { uid, pay } = await userWithPendingPix();
    const r = await handleCanviNotification({ id_invoice_pix: pay.gatewayId }); // aviso falso: invoice ainda "created"
    expect(r.confirmed).toEqual([]);
    expect((await userHasAccess(uid)).full).toBe(false);
  });

  it('aviso + status paid na API libera acesso, e repetir o aviso não duplica', async () => {
    const { uid, pay } = await userWithPendingPix();
    invoices.get(pay.gatewayId!)!.status = 'paid';
    const a = await handleCanviNotification({ data: { id_invoice_pix: Number(pay.gatewayId) } });
    const b = await handleCanviNotification({ id_invoice_pix: pay.gatewayId });
    expect(a.confirmed).toEqual([pay.gatewayId]);
    expect(b.confirmed).toEqual([]);
    expect((await userHasAccess(uid)).full).toBe(true);
    const db = await getDb();
    expect((await db.select().from(schema.subscriptions)).filter((s) => s.ownerUserId === uid)).toHaveLength(1);
  });

  it('sem webhook: a consulta periódica também confirma', async () => {
    const { uid, pay } = await userWithPendingPix();
    expect(await reconcilePayment(pay.id)).toBe('pending');
    invoices.get(pay.gatewayId!)!.status = 'paid';
    expect(await reconcilePayment(pay.id)).toBe('paid');
    expect((await userHasAccess(uid)).full).toBe(true);
  });

  it('id que não é de pagamento nosso é ignorado; Pix expirado é reportado', async () => {
    expect((await handleCanviNotification({ id_invoice_pix: '999999' })).checked).toBe(0);
    const { pay } = await userWithPendingPix();
    invoices.get(pay.gatewayId!)!.status = 'expired';
    expect(await reconcilePayment(pay.id)).toBe('expired');
  });
});

describe('Canvi: utilitários', () => {
  it('segredo da URL do webhook', () => {
    expect(secretMatches('segredo-bem-comprido-123', process.env.CANVI_WEBHOOK_SECRET)).toBe(true);
    expect(secretMatches('errado-errado-errado-1', process.env.CANVI_WEBHOOK_SECRET)).toBe(false);
    expect(secretMatches('x', 'curto')).toBe(false); // segredo fraco nunca vale
    expect(secretMatches('qualquer', undefined)).toBe(false);
  });
  it('extrai ids de payloads de formatos variados e mapeia status', () => {
    expect(candidateIds({ id_invoice_pix: 1 })).toEqual(['1']);
    expect(candidateIds({ data: { id: 2, nome: 'x' } })).toEqual(['2']);
    expect(candidateIds('lixo')).toEqual([]);
    expect(['created', 'authorized', 'paid', 'expired', 'canceled'].map(mapStatus)).toEqual(['pending', 'pending', 'paid', 'expired', 'canceled']);
  });
});
