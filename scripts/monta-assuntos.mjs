// Monta src/lib/enem-assuntos.json a partir da classificação manual em scripts/assuntos-revisados/*.txt
// Formato de cada linha: "<questionId> <letra>" (letra = posição do assunto na taxonomia da área; '-' = sem assunto).
// Questões de inglês/espanhol (id terminado em -en/-es) são sempre atribuídas à língua.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const MAPA = {
  linguagens: ['interpretacao-generos', 'gramatica-variacao', 'literatura', 'artes-corpo-cultura', 'tecnologia-comunicacao', 'lingua-ingles', 'lingua-espanhol'],
  humanas: ['historia-brasil-colonia-imperio', 'historia-brasil-republica', 'historia-geral', 'geografia-fisica-ambiental', 'geografia-humana-urbana', 'geografia-economia-geopolitica', 'filosofia', 'sociologia-cidadania'],
  natureza: ['fisica-mecanica', 'fisica-eletricidade', 'fisica-termo-ondas-optica', 'quimica-geral', 'quimica-organica', 'fisico-quimica', 'ecologia-ambiente', 'genetica-evolucao', 'citologia-bioquimica', 'saude-corpo-humano', 'botanica-zoologia'],
  matematica: ['razao-proporcao', 'porcentagem-juros', 'funcoes-algebra', 'geometria-plana', 'geometria-espacial', 'estatistica', 'probabilidade-combinatoria', 'trigonometria-analitica'],
};

const out = {};
let total = 0, sem = 0;
for (const [area, chaves] of Object.entries(MAPA)) {
  const f = `scripts/assuntos-revisados/${area}.txt`;
  if (!existsSync(f)) continue;
  for (const linha of readFileSync(f, 'utf8').split('\n')) {
    const [id, c] = linha.trim().split(/\s+/);
    if (!id || !c) continue;
    total++;
    let chave = c === '-' ? null : chaves[c.charCodeAt(0) - 97];
    if (area === 'linguagens') {
      if (/-en$/.test(id)) chave = 'lingua-ingles';
      else if (/-es$/.test(id)) chave = 'lingua-espanhol';
    }
    if (c !== '-' && !chave && !(area === 'linguagens' && /-(en|es)$/.test(id))) throw new Error(`letra inválida ${c} em ${id}`);
    if (!chave) { sem++; continue; }
    out[id] = chave;
  }
}
const ord = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync('src/lib/enem-assuntos.json', JSON.stringify(ord, null, 0).replace(/,"/g, ',\n"') + '\n');
console.log(`${Object.keys(ord).length} com assunto de ${total} (sem assunto: ${sem})`);
