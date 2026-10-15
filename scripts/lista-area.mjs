// Lista questões de uma área para classificação manual: node scripts/lista-area.mjs <area> <inicio> <qtd>
import { readdirSync, readFileSync } from 'node:fs';
import { classifica } from './classifica-assuntos.mjs';
const [area, ini, qtd] = [process.argv[2], Number(process.argv[3]), Number(process.argv[4])];
const dir = 'content/questions/enem';
const qs = readdirSync(dir).filter((f) => f.endsWith('.json')).sort().flatMap((f) => JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'))).filter((q) => q.topic === area && q.status !== 'archived');
console.log(`total ${qs.length}`);
qs.slice(ini, ini + qtd).forEach((q, i) => console.log(`${ini + i}|${q.id.replace('enem-', '')}|${q.statement.slice(-170).replace(/\s+/g, ' ')}`));
