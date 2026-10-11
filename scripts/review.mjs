// Revisão e publicação de questões.
//   node scripts/review.mjs export [saida.csv]          lista as questões não publicadas em CSV (para o revisor)
//   node scripts/review.mjs publish "Nome Revisor" id1 id2 ...   publica as questões, registrando quem revisou
//   node scripts/review.mjs publish "Nome Revisor" --all-draft   publica todas as rascunho (use só após revisar tudo)
//   node scripts/review.mjs archive id1 id2 ...         arquiva questões com erro
//   node scripts/review.mjs status                      contagem por status
// Publicar exige explicação, base legal e quatro ou cinco alternativas; é a trava final antes de ir ao ar.

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../content/questions/', import.meta.url).pathname;
const walk = (d) => readdirSync(d).flatMap((n) => { const f = join(d, n); return statSync(f).isDirectory() ? walk(f) : f.endsWith('.json') ? [f] : []; });
const files = walk(ROOT).map((file) => ({ file, items: JSON.parse(readFileSync(file, 'utf8')) }));
const all = files.flatMap((f) => f.items);
const save = () => { for (const f of files) writeFileSync(f.file, JSON.stringify(f.items, null, 2) + '\n'); };
const csv = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;

const [cmd, ...args] = process.argv.slice(2);

if (cmd === 'status') {
  const c = {};
  for (const q of all) c[q.status] = (c[q.status] ?? 0) + 1;
  console.log(c);
} else if (cmd === 'export') {
  const out = args[0] ?? 'revisao.csv';
  const head = ['id', 'estado', 'tema', 'enunciado', 'A', 'B', 'C', 'D', 'gabarito', 'explicacao', 'base_legal', 'status', 'DECISAO (ok / corrigir / descartar)', 'OBSERVACOES'];
  const rows = all.filter((q) => q.status !== 'published' && q.status !== 'archived').map((q) => {
    const o = Object.fromEntries(q.options.map((x) => [x.id, x.text]));
    return [q.id, q.stateCode, q.topic, q.statement, o.a, o.b, o.c, o.d, q.correctOptionId, q.explanation, q.legalRef, q.status, '', ''];
  });
  writeFileSync(out, '﻿' + [head, ...rows].map((r) => r.map(csv).join(';')).join('\n') + '\n');
  console.log(`${rows.length} questões exportadas para ${out}`);
} else if (cmd === 'publish') {
  const [reviewer, ...rest] = args;
  if (!reviewer || reviewer.startsWith('--') || !rest.length) { console.error('Uso: publish "Nome Revisor" id1 id2 ... | --all-draft'); process.exit(1); }
  const ids = rest[0] === '--all-draft' ? all.filter((q) => q.status === 'draft' || q.status === 'reviewed').map((q) => q.id) : rest;
  let n = 0; const bad = [];
  for (const id of ids) {
    const q = all.find((x) => x.id === id);
    if (!q) { bad.push(`${id}: não encontrada`); continue; }
    if (!q.explanation?.trim()) { bad.push(`${id}: falta explicação`); continue; }
    if (!q.legalRef?.trim()) { bad.push(`${id}: falta base legal`); continue; }
    if (q.legalRef.includes('conferir')) { bad.push(`${id}: base legal marcada "conferir"; ajuste o texto depois de verificar`); continue; }
    if (!Array.isArray(q.options) || q.options.length < 4 || !q.options.some((o) => o.id === q.correctOptionId)) { bad.push(`${id}: alternativas inválidas`); continue; }
    q.status = 'published'; q.reviewedBy = reviewer; n++;
  }
  if (n) save();
  console.log(`${n} publicada(s) por ${reviewer}.`);
  if (bad.length) { console.error('Não publicadas:\n - ' + bad.join('\n - ')); process.exit(2); }
} else if (cmd === 'archive') {
  let n = 0;
  for (const id of args) { const q = all.find((x) => x.id === id); if (q) { q.status = 'archived'; n++; } }
  if (n) save();
  console.log(`${n} arquivada(s).`);
} else {
  console.error('Comandos: status | export [arquivo.csv] | publish "Nome" ids... | archive ids...');
  process.exit(1);
}
