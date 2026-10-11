// Valida os arquivos de questões em content/questions/**.json
// Uso: npm run validate:questions

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('../content/questions/', import.meta.url).pathname;

const TOPICS = [
  'legislacao',
  'sinalizacao',
  'direcao_defensiva',
  'mecanica',
  'primeiros_socorros',
  'meio_ambiente_cidadania',
];
const STATUSES = ['draft', 'reviewed', 'published', 'archived'];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : full.endsWith('.json') ? [full] : [];
  });
}

const errors = [];
const seen = new Map();
const byStatus = {};
const byTopic = {};
let total = 0;

for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file);
  let items;
  try {
    items = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    errors.push(`${rel}: JSON inválido (${e.message})`);
    continue;
  }
  if (!Array.isArray(items)) {
    errors.push(`${rel}: o arquivo deve conter uma lista de questões`);
    continue;
  }

  for (const q of items) {
    total++;
    const where = `${rel} [${q.id ?? 'sem id'}]`;
    const fail = (msg) => errors.push(`${where}: ${msg}`);

    if (!q.id || typeof q.id !== 'string') fail('falta o campo id');
    else if (seen.has(q.id)) fail(`id repetido (também em ${seen.get(q.id)})`);
    else seen.set(q.id, rel);

    if (!/^([A-Z]{2})$/.test(q.stateCode ?? '')) fail('stateCode deve ser a sigla do estado em maiúsculas');
    if (!TOPICS.includes(q.topic)) fail(`topic inválido: ${q.topic}`);
    if (!q.statement || q.statement.trim().length < 10) fail('enunciado vazio ou muito curto');

    const opts = Array.isArray(q.options) ? q.options : [];
    if (opts.length < 4 || opts.length > 5) fail('use 4 ou 5 alternativas');
    const ids = opts.map((o) => o.id);
    if (new Set(ids).size !== ids.length) fail('ids de alternativas repetidos');
    if (opts.some((o) => !o.text || !o.text.trim())) fail('há alternativa sem texto');
    if (!ids.includes(q.correctOptionId)) fail('correctOptionId não existe nas alternativas');

    if (!STATUSES.includes(q.status)) fail(`status inválido: ${q.status}`);
    if (['reviewed', 'published'].includes(q.status)) {
      if (!q.explanation || !q.explanation.trim()) fail('questão revisada/publicada precisa de explicação');
      if (!q.legalRef || !q.legalRef.trim()) fail('questão revisada/publicada precisa de referência legal');
    }
    if (q.status === 'published' && !q.reviewedBy) fail('questão publicada precisa de reviewedBy');

    byStatus[q.status] = (byStatus[q.status] ?? 0) + 1;
    byTopic[q.topic] = (byTopic[q.topic] ?? 0) + 1;
  }
}

console.log(`Questões lidas: ${total}`);
console.log('Por status:', byStatus);
console.log('Por tema:  ', byTopic);

if (errors.length) {
  console.error(`\n${errors.length} problema(s) encontrado(s):`);
  for (const e of errors) console.error(' - ' + e);
  process.exit(1);
}
console.log('\nTudo certo.');
