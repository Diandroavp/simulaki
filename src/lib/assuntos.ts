import mapa from './enem-assuntos.json';

/** Áreas do ENEM e seus assuntos. As chaves dos assuntos são as gravadas em enem-assuntos.json. */
export type AreaKey = 'linguagens' | 'humanas' | 'natureza' | 'matematica';

export const AREAS: { key: AreaKey; label: string; curto: string; assuntos: { key: string; label: string }[] }[] = [
  { key: 'linguagens', label: 'Linguagens', curto: 'Linguagens', assuntos: [
    { key: 'interpretacao-generos', label: 'Interpretação e gêneros textuais' },
    { key: 'gramatica-variacao', label: 'Gramática e variação linguística' },
    { key: 'literatura', label: 'Literatura' },
    { key: 'artes-corpo-cultura', label: 'Artes, corpo e cultura' },
    { key: 'tecnologia-comunicacao', label: 'Tecnologia e comunicação' },
    { key: 'lingua-ingles', label: 'Inglês' },
    { key: 'lingua-espanhol', label: 'Espanhol' },
  ] },
  { key: 'humanas', label: 'Ciências Humanas', curto: 'Humanas', assuntos: [
    { key: 'historia-brasil-colonia-imperio', label: 'História do Brasil: Colônia e Império' },
    { key: 'historia-brasil-republica', label: 'História do Brasil: República' },
    { key: 'historia-geral', label: 'História geral' },
    { key: 'geografia-fisica-ambiental', label: 'Geografia física e ambiental' },
    { key: 'geografia-humana-urbana', label: 'Geografia humana e urbana' },
    { key: 'geografia-economia-geopolitica', label: 'Economia e geopolítica' },
    { key: 'filosofia', label: 'Filosofia' },
    { key: 'sociologia-cidadania', label: 'Sociologia e cidadania' },
  ] },
  { key: 'natureza', label: 'Ciências da Natureza', curto: 'Natureza', assuntos: [
    { key: 'fisica-mecanica', label: 'Física: mecânica' },
    { key: 'fisica-eletricidade', label: 'Física: eletricidade e magnetismo' },
    { key: 'fisica-termo-ondas-optica', label: 'Física: calor, ondas e óptica' },
    { key: 'quimica-geral', label: 'Química geral e inorgânica' },
    { key: 'quimica-organica', label: 'Química orgânica' },
    { key: 'fisico-quimica', label: 'Físico-química' },
    { key: 'ecologia-ambiente', label: 'Ecologia e meio ambiente' },
    { key: 'genetica-evolucao', label: 'Genética e evolução' },
    { key: 'citologia-bioquimica', label: 'Citologia e bioquímica' },
    { key: 'saude-corpo-humano', label: 'Saúde e corpo humano' },
    { key: 'botanica-zoologia', label: 'Botânica e zoologia' },
  ] },
  { key: 'matematica', label: 'Matemática', curto: 'Matemática', assuntos: [
    { key: 'razao-proporcao', label: 'Razão, proporção e grandezas' },
    { key: 'porcentagem-juros', label: 'Porcentagem e juros' },
    { key: 'funcoes-algebra', label: 'Funções e álgebra' },
    { key: 'geometria-plana', label: 'Geometria plana' },
    { key: 'geometria-espacial', label: 'Geometria espacial' },
    { key: 'estatistica', label: 'Estatística' },
    { key: 'probabilidade-combinatoria', label: 'Probabilidade e combinatória' },
    { key: 'trigonometria-analitica', label: 'Trigonometria e geometria analítica' },
  ] },
];

export const AREA_POR_CHAVE = Object.fromEntries(AREAS.map((a) => [a.key, a])) as Record<AreaKey, (typeof AREAS)[number]>;
export const ASSUNTO_LABEL: Record<string, string> = Object.fromEntries(AREAS.flatMap((a) => a.assuntos.map((s) => [s.key, s.label])));
export const ASSUNTO_AREA: Record<string, AreaKey> = Object.fromEntries(AREAS.flatMap((a) => a.assuntos.map((s) => [s.key, a.key])));

/** Assunto da questão do ENEM, quando classificado (senão só a área vale). */
export function assuntoDe(questionId: string): string | null {
  return (mapa as Record<string, string>)[questionId] ?? null;
}

/** Quantas questões do banco têm cada assunto (para o checklist e para quem ainda não respondeu nada). */
export function contagemPorAssunto(): Record<string, number> {
  const c: Record<string, number> = {};
  for (const v of Object.values(mapa as Record<string, string>)) c[v] = (c[v] ?? 0) + 1;
  return c;
}
