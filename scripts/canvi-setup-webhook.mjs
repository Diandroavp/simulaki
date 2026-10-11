#!/usr/bin/env node
// Registra na Canvi a URL do webhook de Pix (POST /bt/configurar_webhook).
// Uso: CANVI_CLIENT_ID=... CANVI_PRIVATE_KEY=... CANVI_WEBHOOK_SECRET=... APP_URL=https://simulaki.com node scripts/canvi-setup-webhook.mjs
const base = (process.env.CANVI_BASE_URL ?? 'https://gateway-homol.service-canvi.com.br').replace(/\/$/, '');
const { CANVI_CLIENT_ID: client_id, CANVI_PRIVATE_KEY: private_key, CANVI_WEBHOOK_SECRET: secret, APP_URL } = process.env;
if (!client_id || !private_key || !secret || !APP_URL) {
  console.error('Faltam variáveis: CANVI_CLIENT_ID, CANVI_PRIVATE_KEY, CANVI_WEBHOOK_SECRET, APP_URL');
  process.exit(1);
}
const post = async (path, body, token) => {
  const r = await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  return { status: r.status, json: await r.json().catch(() => ({})) };
};
const login = await post('/bt/token', { client_id, private_key });
if (!login.json.token) { console.error('Login falhou:', login.json.mensagem ?? login.status); process.exit(1); }
const url = `${APP_URL.replace(/\/$/, '')}/api/webhooks/canvi/${secret}`;
const res = await post('/bt/configurar_webhook', { tipo_transacao: 'pixCashin', url, type: 'json' }, login.json.token);
console.log('Resposta:', res.status, JSON.stringify(res.json));
console.log('Atenção: este login invalidou o token anterior; o app renova sozinho no próximo uso.');
