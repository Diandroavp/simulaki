// Uso: node scripts/dump-sem-explicacao.mjs <caderno> <inicio> <qtd>
import fs from 'node:fs';
const [cad, ini = '0', qtd = '20'] = process.argv.slice(2);
const ex = JSON.parse(fs.readFileSync('content/explicacoes/enem.json', 'utf8'));
const a = JSON.parse(fs.readFileSync(`content/questions/enem/${cad}.json`, 'utf8'))
  .filter((q) => !q.images?.length && !q.optionsAsImage && !ex[q.id]);
console.log(`(${a.length} restantes)`);
for (const q of a.slice(+ini, +ini + +qtd)) {
  console.log(`\n## ${q.id} gab=${q.correctOptionId}\n${q.statement.replace(/\s+/g, ' ')}\n${q.options.map((o) => `${o.id}) ${o.text.replace(/\s+/g, ' ')}`).join('\n')}`);
}
