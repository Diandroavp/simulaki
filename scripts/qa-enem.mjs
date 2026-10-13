// Controle de qualidade automático das questões do ENEM importadas (não substitui a revisão humana).
// Uso: node scripts/qa-enem.mjs
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
const dir = 'content/questions/enem';
const flags = {}; const add = (f, id) => (flags[f] ??= []).push(id);
let total = 0; const seen = new Map();
for (const f of readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
  for (const q of JSON.parse(readFileSync(path.join(dir, f), 'utf8'))) {
    total++;
    const imgs = q.images ?? [];
    const st = (q.statement ?? '').trim();
    if (q.options.length !== 5) add('opcoes!=5', q.id);
    if (!q.options.some((o) => o.id === q.correctOptionId)) add('gabarito fora das opcoes', q.id);
    if (!st && !imgs.length) add('sem enunciado nem imagem', q.id);
    if (st && st.length < 25 && !imgs.length) add('enunciado muito curto', q.id);
    for (const i of imgs) {
      const p = path.join('public', i);
      if (!existsSync(p)) add('imagem ausente', q.id);
      else if (statSync(p).size < 700) add('imagem minuscula', q.id);
    }
    const bad = /\(cid:|\u0000|�|ENEM\s*20\d\d|QUESTÃO\s*\d+|\*0\d{5}/;
    if (bad.test(st)) add('lixo no enunciado', q.id);
    if (!q.optionsAsImage) {
      for (const o of q.options) {
        if (!o.text.trim()) add('alternativa vazia', q.id);
        if (o.text.length > 450) add('alternativa muito longa (possivel mistura)', q.id);
        if (bad.test(o.text)) add('lixo na alternativa', q.id);
      }
      const texts = q.options.map((o) => o.text.trim());
      if (new Set(texts).size < texts.length) add('alternativas repetidas', q.id);
    }
    if (q.options.length === 5 && q.optionsAsImage && !imgs.length) add('alternativas em imagem sem imagem', q.id);
    if (st.length > 60) { const k = st.slice(0, 120); if (seen.has(k) && !/-(en|es)$/.test(q.id)) add('enunciado repetido', q.id + ' = ' + seen.get(k)); seen.set(k, q.id); }
  }
}
console.log(`ENEM: ${total} questões`);
for (const [f, ids] of Object.entries(flags).sort((a, b) => b[1].length - a[1].length)) console.log(`${String(ids.length).padStart(5)}  ${f}  ex.: ${ids.slice(0, 3).join(', ')}`);
if (!Object.keys(flags).length) console.log('Nenhum alerta.');
