// Uso: node scripts/merge-explicacoes.mjs <arquivo.json>  (mescla {id: texto} em content/explicacoes/enem.json, só ids existentes sem figura)
import fs from 'node:fs';
const dest = 'content/explicacoes/enem.json';
const ex = JSON.parse(fs.readFileSync(dest, 'utf8'));
const novo = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const banco = new Map();
for (const f of fs.readdirSync('content/questions/enem')) for (const q of JSON.parse(fs.readFileSync(`content/questions/enem/${f}`, 'utf8'))) banco.set(q.id, q);
let n = 0;
for (const [id, t] of Object.entries(novo)) {
  const q = banco.get(id);
  if (!q || q.images?.length || q.optionsAsImage) { console.error('ignorado:', id); continue; }
  ex[id] = t; n++;
}
const ord = Object.fromEntries(Object.entries(ex).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(dest, JSON.stringify(ord, null, 2) + '\n');
console.log('mesclados', n, 'total', Object.keys(ord).length);
