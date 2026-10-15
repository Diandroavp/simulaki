/**
 * Conteúdo das páginas informativas (guias e páginas por estado).
 * Só entram fatos conferidos: a Resolução CONTRAN 1.020/2025 (art. 33 e 34) e o Banco Nacional de Questões da Senatran.
 * Não inclua preços de taxas, prazos de Detran nem números que não tenham fonte.
 */

export type Bloco = { h?: string; p?: string[]; ul?: string[] };
export type Guia = {
  slug: string;
  titulo: string;
  resumo: string; // meta description
  intro: string;
  blocos: Bloco[];
  faq: { q: string; a: string }[];
  atualizado: string; // AAAA-MM-DD
  /** Padrão: detran. */
  tema?: 'detran' | 'enem';
  /** Fonte mostrada no rodapé; padrão: a Resolução do CONTRAN. */
  fonte?: { nome: string; url: string };
};

export const FONTE_RESOLUCAO = {
  nome: 'Resolução CONTRAN nº 1.020/2025',
  url: 'https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao10202025.pdf',
};

import { GUIAS_ENEM } from './guias-enem';

export const GUIAS: Guia[] = [
  {
    slug: 'prova-teorica-detran',
    titulo: 'Como é a prova teórica do Detran',
    resumo: 'Quantas questões tem a prova teórica da CNH, quanto tempo dura, quantos acertos são necessários e quais assuntos caem.',
    intro: 'A prova teórica é a etapa de conhecimento da primeira habilitação. Aqui estão as regras vigentes, com a fonte, e o que estudar.',
    atualizado: '2026-10-13',
    blocos: [
      {
        h: 'Formato da prova',
        ul: [
          'São 30 questões de múltipla escolha.',
          'A duração mínima é de 1 hora. Candidatos com dislexia, TDAH ou transtorno do espectro autista têm o dobro do tempo.',
          'Para ser aprovado é preciso acertar 20 das 30 questões.',
        ],
        p: ['Essas regras vêm dos artigos 33 e 34 da Resolução CONTRAN nº 1.020/2025. Cada Detran aplica a prova no seu sistema, então confirme no órgão do seu estado como será o dia do exame.'],
      },
      {
        h: 'De onde vêm as questões',
        p: ['As questões saem do Banco Nacional de Questões, organizado e mantido pela Secretaria Nacional de Trânsito (Senatran). A resolução define que o banco é público e fica disponível para a sociedade. Veja como ele funciona em "Banco Nacional de Questões: o que é".'],
      },
      {
        h: 'O que costuma ser cobrado',
        ul: [
          'Legislação de trânsito: o Código de Trânsito Brasileiro (CTB), infrações, penalidades e documentos.',
          'Sinalização: placas de regulamentação, advertência e indicação, além da sinalização horizontal e dos gestos.',
          'Direção defensiva: como reduzir riscos no trânsito.',
          'Primeiros socorros.',
          'Meio ambiente e cidadania.',
          'Noções de mecânica.',
        ],
      },
      {
        h: 'Como se preparar',
        p: ['Resolver questões no formato da prova, com tempo e correção comentada, é o jeito mais direto de ver o que ainda falta. No Simulaki você faz simulados de 30 questões e treina por tema, e cada questão mostra a explicação e a fonte.'],
      },
    ],
    faq: [
      { q: 'Quantas questões tem a prova teórica da CNH?', a: 'Trinta questões, conforme o art. 33 da Resolução CONTRAN 1.020/2025.' },
      { q: 'Quantos acertos preciso para passar?', a: 'Vinte acertos em 30 questões, conforme o art. 34 da mesma resolução.' },
      { q: 'Quanto tempo dura a prova?', a: 'No mínimo uma hora. Para candidatos com dislexia, TDAH ou autismo, o tempo é dobrado.' },
    ],
  },
  {
    slug: 'o-que-mudou-na-prova-teorica',
    titulo: 'O que mudou na prova teórica da CNH',
    resumo: 'As mudanças da Resolução CONTRAN 1.020/2025 na prova teórica: tempo, nota mínima e o novo Banco Nacional de Questões.',
    intro: 'A Resolução CONTRAN nº 1.020/2025 mudou regras da habilitação. Estas são as mudanças que afetam a prova teórica.',
    atualizado: '2026-10-13',
    blocos: [
      {
        h: 'Nota mínima: 20 acertos',
        p: ['A aprovação passou a exigir 20 acertos em 30 questões. Antes, em alguns estados, como o Paraná, eram necessários 21 acertos.'],
      },
      {
        h: 'Mais tempo',
        p: ['O tempo mínimo da prova passou de 50 para 60 minutos em estados que aplicavam 50, e é dobrado para candidatos com dislexia, TDAH ou transtorno do espectro autista.'],
      },
      {
        h: 'Banco Nacional de Questões',
        p: ['As questões passam a sair de um banco nacional mantido pela Senatran, de acesso público. Os Detrans estão se adaptando em ritmos diferentes: o Detran-RJ começou a usá-lo em fevereiro de 2026, e o Detran-PR informou que a sincronização com o banco nacional ainda seria feita. Por isso, o conteúdo da prova do seu estado pode variar até a transição terminar.'],
      },
      { h: 'O que fazer', p: ['Estude pelo conteúdo oficial e treine com questões do banco nacional. Confirme sempre no Detran do seu estado as regras vigentes.'] },
    ],
    faq: [
      { q: 'A nota mínima mudou?', a: 'Sim. São 20 acertos em 30 questões; em alguns estados, como o Paraná, eram 21.' },
      { q: 'Todos os Detrans já usam o banco nacional?', a: 'Não. A adoção vem acontecendo em ritmos diferentes entre os estados. Confirme no Detran do seu estado.' },
    ],
  },
  {
    slug: 'banco-nacional-de-questoes',
    titulo: 'Banco Nacional de Questões: o que é',
    resumo: 'O que é o Banco Nacional de Questões da Senatran, quem o mantém, como é organizado e como usá-lo para estudar.',
    intro: 'O Banco Nacional de Questões reúne as questões da prova teórica da CNH. Ele é organizado e mantido pela Secretaria Nacional de Trânsito.',
    atualizado: '2026-10-13',
    blocos: [
      {
        h: 'O que é',
        p: ['É o conjunto de questões do qual saem as provas teóricas. O art. 33 da Resolução CONTRAN 1.020/2025 diz que o banco é público e deve estar disponível para a sociedade nos canais da Senatran. A versão 1.0 foi divulgada pelo programa CNH do Brasil, do Ministério dos Transportes.'],
      },
      {
        h: 'Como é organizado',
        ul: [
          'As questões são divididas em módulos, como "Placas, Cores e Caminhos" e "Na Direção da Segurança".',
          'Cada questão tem um nível: fácil, intermediário ou difícil.',
          'Cada uma traz a alternativa correta e, em geral, um comentário que explica a resposta, muitas vezes citando artigos do CTB.',
        ],
      },
      {
        h: 'Como o Simulaki usa o banco',
        p: ['Usamos as questões do banco nacional em treinos e simulados. Em cada questão mostramos a fonte, o ano da versão e o local de origem no banco. O Simulaki é uma plataforma independente e não é um serviço oficial do governo.'],
      },
    ],
    faq: [
      { q: 'Quem mantém o Banco Nacional de Questões?', a: 'A Secretaria Nacional de Trânsito (Senatran), do Ministério dos Transportes.' },
      { q: 'O banco é público?', a: 'Sim. O art. 33, §6º da Resolução CONTRAN 1.020/2025 estabelece que ele estará disponível para a sociedade.' },
    ],
  },
  {
    slug: 'como-estudar-para-a-prova-teorica',
    titulo: 'Como estudar para a prova teórica da CNH',
    resumo: 'Um método simples para estudar para a prova teórica: simulados, treino por tema e revisão dos erros.',
    intro: 'Estudar com método rende mais do que ler tudo de uma vez. Este é um roteiro curto, que você pode seguir em poucas semanas.',
    atualizado: '2026-10-13',
    blocos: [
      {
        h: '1. Descubra onde você está',
        p: ['Faça um simulado completo, de 30 questões e com relógio, antes de estudar. O resultado mostra os temas em que você mais erra.'],
      },
      {
        h: '2. Treine por tema',
        p: ['Escolha o tema mais fraco e resolva sessões curtas, lendo a explicação de cada questão logo depois de responder. Sinalização costuma exigir memória visual, e legislação pede leitura dos artigos do CTB.'],
      },
      {
        h: '3. Refaça os erros',
        p: ['Volte às questões que você errou até acertar. Esse é o passo que mais evita repetir o mesmo erro no dia da prova.'],
      },
      {
        h: '4. Simule de novo',
        p: ['Repita o simulado completo uma ou duas vezes por semana. Quando passar de 20 acertos com folga nos últimos simulados, você está perto da nota exigida.'],
      },
    ],
    faq: [
      { q: 'Quantos simulados devo fazer antes da prova?', a: 'Não há número mágico. Um bom sinal é acertar bem mais de 20 questões em simulados seguidos, de 30 questões.' },
      { q: 'Vale a pena decorar as respostas?', a: 'Não. As questões variam. Entender a regra e a explicação de cada resposta funciona melhor.' },
    ],
  },
  ...GUIAS_ENEM,
];

export function getGuia(slug: string): Guia | undefined {
  return GUIAS.find((g) => g.slug === slug);
}

export type PaginaEstado = { uf: string; sigla: string; nome: string; slug: string };
export const ESTADOS: PaginaEstado[] = [
  { uf: 'am', sigla: 'AM', nome: 'Amazonas', slug: 'detran-am' },
  { uf: 'sp', sigla: 'SP', nome: 'São Paulo', slug: 'detran-sp' },
  { uf: 'ba', sigla: 'BA', nome: 'Bahia', slug: 'detran-ba' },
];
