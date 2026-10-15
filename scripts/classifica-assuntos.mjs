// Classifica as questões do ENEM por assunto (heurística de palavras-chave).
// Uso: node scripts/classifica-assuntos.mjs [--amostra N]   -> grava src/lib/enem-assuntos.json
// Questão sem sinal claro fica sem assunto (conta só na área). Revisável: edite o JSON ou as palavras abaixo.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const R = {
  matematica: {
    'razao-proporcao': ['proporcao', 'proporcional', 'regra de tres', 'velocidade media', 'grandeza', 'densidade', 'km/l', 'por litro', 'dilu', 'concentracao', 'medida de', 'unidade de medida', 'converter', 'quilometr', 'gramas', 'por hora', 'por minuto'],
    'porcentagem-juros': ['%', 'por cento', 'porcentagem', 'juros', 'desconto', 'acrescimo', 'aumento de', 'lucro', 'prestac', 'financi', 'montante', 'capital', 'inflacao', 'reajuste', 'imposto', 'preco', 'reais', 'r$', 'parcela'],
    'funcoes-algebra': ['funcao', 'equacao', 'parabola', 'polinomio', 'inequac', 'sistema de equac', 'logaritm', 'exponencial', 'progressao', 'sequencia', 'termo geral', 'f(x)', 'y =', 'valor maximo', 'valor minimo', 'lei de formacao', 'expressao algebrica', 'incognita'],
    'geometria-plana': ['area', 'perimetro', 'triangulo', 'circulo', 'circunferencia', 'retangul', 'quadrado', 'losango', 'trapezio', 'angulo', 'semelhan', 'pitagoras', 'hexagon', 'poligono', 'raio', 'apotema', 'planta'],
    'geometria-espacial': ['volume', 'cilindr', 'cone', 'esfera', 'piramide', 'prisma', 'cubo', 'paralelepipedo', 'capacidade', 'litros', 'reservatorio', 'tronco', 'embalagem'],
    'estatistica': ['media', 'mediana', 'desvio padrao', 'variancia', 'grafico de barras', 'histograma', 'frequencia', 'percentil', 'grafico de setores'],
    'probabilidade-combinatoria': ['probabilidade', 'sorteio', 'combinac', 'arranjo', 'permutac', 'anagrama', 'maneiras', 'chance', 'evento', 'sorteado', 'aleatori', 'senha', 'codigo', 'possibilidades', 'distintas', 'diferentes formas'],
    'trigonometria-analitica': ['seno', 'cosseno', 'tangente', 'trigonom', 'coordenadas', 'plano cartesiano', 'reta', 'vetor', 'matriz', 'determinante', 'distancia entre', 'graus', 'radiano', 'inclinacao', 'rampa', 'elipse', 'hiperbole'],
  },
  natureza: {
    'fisica-mecanica': ['velocidade', 'aceleracao', 'forca', 'newton', 'energia cinetica', 'energia potencial', 'potencia mecanica', 'atrito', 'impulso', 'quantidade de movimento', 'colisao', 'pendulo', 'queda', 'lancamento', 'torque', 'alavanca', 'pressao', 'empuxo', 'gravidade', 'movimento', 'trajetoria', 'hidrostatica', 'polia', 'rotacao', 'satelite', 'orbita'],
    'fisica-eletricidade': ['corrente eletrica', 'resistor', 'resistencia eletrica', 'tensao', 'voltagem', 'circuito', 'carga eletrica', 'campo magnetico', 'eletromagnet', 'inducao', 'gerador', 'transformador', 'potencia eletrica', 'kwh', 'lampada', 'bateria', 'choque', 'capacitor', 'fusivel', 'chuveiro', 'eletrostat', 'ampere', 'volt', 'ohm', 'rede eletrica', 'energia eletrica'],
    'fisica-termo-ondas-optica': ['calor', 'temperatura', 'termica', 'dilatacao', 'calorimetr', 'gas ideal', 'onda', 'frequencia', 'comprimento de onda', 'sonora', 'lente', 'espelho', 'refracao', 'reflexao', 'difracao', 'interferencia', 'radiacao', 'espectro', 'doppler', 'termodinam', 'maquina termica', 'isolante', 'condutor termico', 'conducao', 'convec', 'microondas', 'ultrassom', 'miopia'],
    'quimica-geral': ['atomo', 'modelo atomico', 'tabela periodica', 'ligacao ionica', 'ligacao covalente', 'metal', 'acido', 'oxido', 'estequiometr', 'mol ', 'massa molar', 'solucao', 'solubilidade', 'separacao', 'destilacao', 'filtracao', 'decantacao', 'ph ', 'neutraliza', 'reacao quimica', 'balanceamento', 'elemento quimico', 'aguas', 'tratamento de agua', 'eletronegatividade'],
    'quimica-organica': ['organico', 'organica', 'hidrocarbone', 'alcool', 'aldeido', 'cetona', 'acido carboxilico', 'ester', 'amina', 'amida', 'polimero', 'plastico', 'isomer', 'petroleo', 'etanol', 'biodiesel', 'sabao', 'gordura', 'cadeia carbonica', 'grupo funcional', 'benzeno', 'combustivel', 'gasolina', 'glicerina', 'tensoativo', 'detergente', 'borracha', 'nylon', 'pet '],
    'fisico-quimica': ['equilibrio quimico', 'cinetica', 'velocidade da reacao', 'catalisador', 'entalpia', 'termoquimica', 'calor de combustao', 'eletroquimica', 'pilha', 'eletrolise', 'oxidacao', 'oxirreducao', 'corrosao', 'radioativ', 'meia-vida', 'decaimento', 'fissao', 'fusao nuclear', 'pressao de vapor', 'coligativ', 'cinetica quimica', 'potencial padrao', 'energia de ligacao', 'nuclear', 'isotopo'],
    'ecologia-ambiente': ['ecossistema', 'cadeia alimentar', 'teia alimentar', 'bioma', 'cerrado', 'amazonia', 'caatinga', 'desmatamento', 'poluicao', 'efeito estufa', 'aquecimento global', 'ciclo do carbono', 'ciclo do nitrogenio', 'biodiversidade', 'sustentab', 'residuo', 'lixo', 'reciclagem', 'eutrofiza', 'chuva acida', 'ozonio', 'impacto ambiental', 'predacao', 'simbiose', 'nicho', 'sucessao ecologica', 'agrotoxico', 'energia renovavel', 'recursos naturais', 'especies nativas', 'ecologic'],
    'genetica-evolucao': ['gene', 'dna', 'rna', 'cromossom', 'heranca', 'alelo', 'dominante', 'recessivo', 'mendel', 'mutacao', 'evolucao', 'selecao natural', 'darwin', 'adaptacao', 'transgenic', 'biotecnologia', 'clonagem', 'engenharia genetica', 'melhoramento', 'fossil', 'ancestral', 'filogen', 'genotipo', 'fenotipo', 'genom', 'hibrido', 'heredit', 'evolutiv'],
    'citologia-bioquimica': ['celula', 'membrana', 'organela', 'mitocondria', 'fotossintese', 'respiracao celular', 'metabolismo', 'enzima', 'proteina', 'lipidio', 'carboidrato', 'atp', 'fermentacao', 'cloroplasto', 'osmose', 'divisao celular', 'mitose', 'meiose', 'ribossomo', 'glicose'],
    'saude-corpo-humano': ['hormonio', 'sistema digest', 'sistema respirat', 'sistema circul', 'sangue', 'vacina', 'imun', 'doenca', 'virus', 'bacteria', 'parasita', 'verminose', 'protozoario', 'vitamina', 'nutri', 'sistema nervoso', 'neuronio', 'fecundacao', 'reproducao', 'gravidez', 'anticoncepcional', 'antibiotico', 'dengue', 'malaria', 'tuberculose', 'cancer', 'insulina', 'diabetes', 'epidemia', 'pandemia', 'infeccao', 'sintoma', 'medicamento', 'higiene', 'saneamento', 'organismo humano'],
    'botanica-zoologia': ['planta', 'angiosperma', 'gimnosperma', 'briofita', 'pteridofita', 'inseto', 'anfibio', 'repteis', 'mamifero', 'artropode', 'molusco', 'polinizacao', 'estoma', 'seiva', 'invertebrado', 'vertebrado'],
  },
  humanas: {
    'historia-brasil-colonia-imperio': ['colonia', 'colonial', 'escravid', 'escravo', 'bandeirante', 'capitania', 'engenho', 'jesuita', 'dom pedro', 'abolicao', 'inconfidencia', 'independencia do brasil', 'regencia', 'quilombo', 'cabanagem', 'sesmaria', 'tratado de tordesilhas', 'pau-brasil', 'lei aurea'],
    'historia-brasil-republica': ['republica velha', 'vargas', 'estado novo', 'ditadura militar', '1964', 'coronelismo', 'tenentismo', 'getulio', 'juscelino', 'diretas', 'ai-5', 'populismo', 'canudos', 'revolta da vacina', 'integralismo', 'voto de cabresto', 'cafe com leite', 'redemocratizacao', 'constituicao de 1988', 'governo militar', 'regime militar', 'anistia', 'trabalhismo', 'clt', 'plano real'],
    'historia-geral': ['idade media', 'feudal', 'renascimento', 'reforma', 'revolucao francesa', 'revolucao industrial', 'iluminismo', 'guerra mundial', 'guerra fria', 'nazismo', 'fascismo', 'imperialismo', 'neocolonialismo', 'grecia', 'antiguidade', 'egito', 'mesopotamia', 'absolutismo', 'mercantilismo', 'revolucao russa', 'socialismo', 'crise de 1929', 'descoloniza', 'holocausto', 'napoleao', 'cruzadas', 'urss'],
    'geografia-fisica-ambiental': ['clima', 'relevo', 'solo', 'bioma', 'vegetacao', 'hidrografia', 'bacia', 'desertificacao', 'erosao', 'degradacao', 'el nino', 'cartografia', 'mapa', 'coordenadas', 'fuso horario', 'geomorfolog', 'placas tectonicas', 'recursos hidricos', 'aquifero', 'dominios morfoclimaticos', 'paisagem', 'amazonia', 'cerrado', 'caatinga', 'mata atlantica', 'chuva', 'seca', 'desmatamento', 'meio ambiente', 'litoral', 'planicie', 'planalto'],
    'geografia-humana-urbana': ['urbaniza', 'cidade', 'metropole', 'periferia', 'migra', 'demograf', 'favela', 'moradia', 'mobilidade', 'agricultura', 'agronegocio', 'reforma agraria', 'latifundio', 'campones', 'mst', 'espaco urbano', 'espaco rural', 'habitacao', 'transito', 'segregacao', 'camponeses', 'idh', 'saneamento', 'territorio', 'comunidades tradicionais'],
    'geografia-economia-geopolitica': ['industria', 'industrializacao', 'globaliza', 'geopolitic', 'fronteira', 'blocos economicos', 'desemprego', 'energia', 'petroleo', 'desigualdade', 'exportac', 'importac', 'multinacional', 'ordem mundial', 'terceirizacao', 'mercosul', 'uniao europeia', 'onu', 'recursos energeticos', 'mineracao', 'transporte'],
    'filosofia': ['filosof', 'platao', 'aristoteles', 'socrates', 'kant', 'descartes', 'nietzsche', 'hobbes', 'locke', 'rousseau', 'etica', 'epistemolog', 'metafisica', 'existencialis', 'sartre', 'foucault', 'arendt', 'maquiavel', 'virtude', 'pensador', 'contrato social', 'dialetica', 'logica', 'sofista', 'estoic', 'epicur', 'razao instrumental', 'adorno', 'habermas', 'bauman'],
    'sociologia-cidadania': ['sociedade', 'sociolog', 'durkheim', 'weber', 'marx', 'identidade', 'preconceito', 'racismo', 'desigualdade social', 'movimentos sociais', 'cidadania', 'direitos humanos', 'constituicao', 'democracia', 'consumo', 'religi', 'etnia', 'quilombola', 'participacao', 'sindicato', 'minorias', 'discrimin', 'lgbt', 'tolerancia'],
  },
  linguagens: {
    'interpretacao-generos': ['genero textual', 'charge', 'tirinha', 'cartum', 'cronica', 'noticia', 'reportagem', 'propaganda', 'publicidade', 'anuncio', 'texto argumentativo', 'tese', 'argumento', 'interlocutor', 'finalidade', 'intencao', 'tema do texto', 'ideia central', 'objetivo do texto', 'campanha', 'cartaz', 'entrevista', 'artigo de opiniao', 'resenha', 'bula', 'manual'],
    'gramatica-variacao': ['funcao da linguagem', 'linguagem figurada', 'metafora', 'ironia', 'coesao', 'coerencia', 'conjuncao', 'pronome', 'verbo', 'tempo verbal', 'sintax', 'virgula', 'concordancia', 'regencia', 'variacao linguistica', 'registro', 'norma padrao', 'coloquial', 'giria', 'dialeto', 'oralidade', 'polissemia', 'denotativ', 'conotativ', 'fonolog', 'neologismo', 'estrangeirismo', 'vocabulo', 'linguistic', 'adjetivo', 'substantivo', 'adverbio', 'marcas de oralidade'],
    'literatura': ['literatura', 'literario', 'romantismo', 'realismo', 'naturalismo', 'modernismo', 'barroco', 'arcadismo', 'parnasian', 'simbolismo', 'vanguarda', 'poeta', 'poesia', 'poema', 'verso', 'estrofe', 'soneto', 'narrador', 'personagem', 'conto', 'machado de assis', 'drummond', 'guimaraes rosa', 'cecilia meireles', 'graciliano', 'fernando pessoa', 'camoes', 'intertextualidade', 'eu lirico', 'sujeito lirico', 'lirico', 'manuel bandeira', 'oswald', 'mario de andrade', 'joao cabral', 'clarice', 'jorge amado', 'trovadorismo', 'classicismo', 'escritor'],
    'artes-corpo-cultura': ['pintura', 'escultura', 'museu', 'musica', 'cancao', 'danca', 'teatro', 'cinema', 'fotografia', 'artes visuais', 'cubismo', 'impressionismo', 'grafite', 'esporte', 'educacao fisica', 'capoeira', 'ginastica', 'atletismo', 'olimpiada', 'futebol', 'patrimonio', 'folclore', 'festa', 'cultura popular', 'instalacao', 'samba', 'rap', 'hip hop', 'arquitetura', 'ballet', 'coreograf', 'esportiv', 'atividade fisica'],
    'tecnologia-comunicacao': ['internet', 'redes sociais', 'rede social', 'computador', 'whatsapp', 'comunicacao', 'aplicativo', 'blog', 'hipertexto', 'meme', 'emoji', 'smartphone', 'e-mail', 'televisao', 'eletronic'],
  },
};

const EN = /\b(the|of|and|is|are|to|in|that|for|with|you|your|was|has|have|this|from|they|their|not|be)\b/g;
const ES = /\b(el|los|las|una|y|pero|muy|usted|tambien|mas|que|porque|del|para|con|por|su|sus|este|esta|se)\b/g;
const PT = /\b(o|os|as|uma|um|e|mas|muito|que|porque|do|da|dos|das|para|com|por|seu|sua|este|esta|se|de)\b/g;

function idioma(texto) {
  const t = norm(texto);
  const pal = t.split(/\s+/).length;
  if (pal < 25) return null;
  const en = (t.match(EN) ?? []).length, es = (t.match(ES) ?? []).length, pt = (t.match(PT) ?? []).length;
  if (en > pal * 0.18 && en > pt) return 'ingles';
  if (es > pal * 0.22 && pt < pal * 0.18 && /\b(el|los|una|usted|tambien|pero|muy)\b/.test(t)) return 'espanhol';
  return null;
}

function conta(texto, k) {
  let n = 0, i = 0;
  while ((i = texto.indexOf(k, i)) !== -1) { n++; i += k.length; }
  return n;
}

export function classifica(q) {
  const area = q.topic;
  const regras = R[area];
  if (!regras) return null;
  if (area === 'linguagens') {
    const l = idioma(`${q.statement} ${q.options.map((o) => o.text).join(' ')}`);
    if (l) return l === 'ingles' ? 'lingua-ingles' : 'lingua-espanhol';
  }
  const full = norm(q.options.map((o) => o.text).join(' '));
  const stem = norm(q.statement).slice(-450);
  const scores = Object.entries(regras).map(([key, kws]) => {
    let s = 0;
    for (const k of kws) s += conta(full, k) + 3 * conta(stem, k);
    return [key, s];
  }).sort((a, b) => b[1] - a[1]);
  const [top, second] = scores;
  if (top[1] < 4 || top[1] < second[1] * 1.6) return null;
  return top[0];
}

if (process.argv[1].endsWith('classifica-assuntos.mjs')) {
  const dir = 'content/questions/enem';
  const out = {}, stats = {}, amostras = {};
  let total = 0, sem = 0;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    for (const q of JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'))) {
      total++;
      const a = classifica(q);
      if (!a) { sem++; continue; }
      out[q.id] = a;
      stats[a] = (stats[a] ?? 0) + 1;
      (amostras[a] ??= []).push(q);
    }
  }
  const ordenado = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync('src/lib/enem-assuntos.json', JSON.stringify(ordenado));
  console.log(`classificadas ${total - sem}/${total} (${Math.round(((total - sem) / total) * 100)}%)`);
  console.log(stats);
  const n = Number(process.argv[process.argv.indexOf('--amostra') + 1]);
  if (n) for (const [a, qs] of Object.entries(amostras)) {
    console.log(`\n== ${a}`);
    for (let i = 0; i < n; i++) { const q = qs[(i * 37 + 5) % qs.length]; console.log(`- ${q.id}: …${q.statement.slice(-170).replace(/\s+/g, ' ')}`); }
  }
}
