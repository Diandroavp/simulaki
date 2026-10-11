// Lista os códigos de placa usados nas questões e se a imagem já existe em public/placas.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
const root = new URL('../content/questions/', import.meta.url).pathname;
const walk = (d) => readdirSync(d).flatMap((n) => { const f = join(d, n); return statSync(f).isDirectory() ? walk(f) : f.endsWith('.json') ? [f] : []; });
const codes = new Map();
for (const f of walk(root)) for (const q of JSON.parse(readFileSync(f, 'utf8'))) if (q.signCode) codes.set(q.signCode, (codes.get(q.signCode) ?? new Set()).add(q.id));
const pub = new URL('../public/placas/', import.meta.url).pathname;
const has = (c) => ['svg', 'png', 'webp'].some((e) => existsSync(join(pub, `${c}.${e}`)));
const missing = [...codes.keys()].filter((c) => !has(c)).sort();
console.log(`${codes.size} placas distintas; ${codes.size - missing.length} com imagem; faltam ${missing.length}:`);
console.log(missing.join(' '));
