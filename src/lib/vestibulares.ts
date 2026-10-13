/** Textos das páginas públicas de ENEM, PSC e SIS. Só afirma o que está nas fontes oficiais. */
export type Vestibular = {
  slug: 'enem' | 'psc' | 'sis';
  nome: string;
  titulo: string;
  lead: string;
  quem: string;
  formato: string[];
  fonte: { nome: string; url: string };
  aviso: string;
};

export const VESTIBULARES: Vestibular[] = [
  {
    slug: 'enem', nome: 'ENEM', titulo: 'Simulado ENEM com provas anteriores',
    lead: 'Treine com questões das provas oficiais do ENEM, com correção na hora e acompanhamento por área.',
    quem: 'O Exame Nacional do Ensino Médio, aplicado pelo INEP, é a porta de entrada para o Sisu, o Prouni e muitas universidades.',
    formato: [
      'Quatro áreas: Linguagens, Ciências Humanas, Ciências da Natureza e Matemática.',
      'Duas provas objetivas de cinco alternativas, em dois dias, mais a redação.',
      'No Simulaki você escolhe o ano, a área e a quantidade de questões no simulado personalizado.',
    ],
    fonte: { nome: 'Provas e gabaritos do INEP', url: 'https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos' },
    aviso: 'O Simulaki é uma plataforma independente e não é um serviço oficial do INEP.',
  },
  {
    slug: 'psc', nome: 'PSC', titulo: 'Simulado PSC da UFAM',
    lead: 'Questões no estilo do Processo Seletivo Contínuo da UFAM, para treinar etapa por etapa.',
    quem: 'O PSC é o processo seletivo da Universidade Federal do Amazonas, organizado em etapas ao longo do ensino médio (PSC 1, PSC 2 e PSC 3).',
    formato: [
      'Provas e gabaritos oficiais publicados pela COMPEC/UFAM.',
      'Treino por etapa e por matéria, com correção na hora.',
    ],
    fonte: { nome: 'Documentos COMPEC no repositório da UFAM', url: 'https://edoc.ufam.edu.br' },
    aviso: 'O Simulaki é uma plataforma independente e não é um serviço oficial da UFAM.',
  },
  {
    slug: 'sis', nome: 'SIS', titulo: 'Simulado SIS da UEA',
    lead: 'Treine para o Sistema de Ingresso Seriado da UEA com questões das provas de acompanhamento.',
    quem: 'O SIS é o sistema de ingresso da Universidade do Estado do Amazonas, feito em três etapas de acompanhamento ao longo do ensino médio. A prova é aplicada pela Vunesp.',
    formato: [
      'Provas de Acompanhamento I, II e III.',
      'Treino por matéria, com correção na hora.',
    ],
    fonte: { nome: 'Vunesp, vestibulares da UEA', url: 'https://www.vunesp.com.br/?b=UEA' },
    aviso: 'O Simulaki é uma plataforma independente e não é um serviço oficial da UEA nem da Vunesp.',
  },
];

export const vestibular = (slug: string) => VESTIBULARES.find((v) => v.slug === slug);
