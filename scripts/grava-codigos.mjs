// Grava a classificação manual: node scripts/grava-codigos.mjs <area> <inicio> "<grupos de letras separados por espaço>"
import { readdirSync, readFileSync, appendFileSync, mkdirSync } from 'node:fs';
const [area, ini, txt] = [process.argv[2], Number(process.argv[3]), process.argv[4]];
const dir = 'content/questions/enem';
const qs = readdirSync(dir).filter((f) => f.endsWith('.json')).sort().flatMap((f) => JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'))).filter((q) => q.topic === area && q.status !== 'archived');
const codes = txt.replace(/\s+/g, '').split('');
mkdirSync('scripts/assuntos-revisados', { recursive: true });
let out = '';
codes.forEach((c, i) => { const q = qs[ini + i]; if (!q) throw new Error(`índice ${ini + i} fora da lista`); out += `${q.id} ${c}\n`; });
appendFileSync(`scripts/assuntos-revisados/${area}.txt`, out);
console.log(`gravadas ${codes.length} (${ini}..${ini + codes.length - 1}) em ${area}`);
