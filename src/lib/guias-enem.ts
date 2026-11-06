import type { Guia } from './guias';

/**
 * Guias do ENEM. Só entram fatos que constam na página oficial do INEP ou no Edital: nada de datas, taxas
 * ou notas de corte, que mudam a cada ano.
 */
export const FONTE_ENEM = {
  nome: 'INEP, página do ENEM',
  url: 'https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem',
};

export const GUIAS_ENEM: Guia[] = [
  {
    slug: 'enem-2026-8-e-15-de-novembro',
    tipo: 'noticia',
    publicado: '2026-11-06',
    tema: 'enem',
    fonte: FONTE_ENEM,
    titulo: 'ENEM 2026: provas nos dias 8 e 15 de novembro',
    resumo: 'O ENEM 2026 acontece em dois domingos, 8 e 15 de novembro. Veja o que cai em cada dia e como usar a semana entre as provas.',
    intro: 'As provas do ENEM 2026 serão aplicadas em dois domingos, 8 e 15 de novembro. Veja o que cai em cada dia e o que fazer agora.',
    atualizado: '2026-11-06',
    blocos: [
      {
        h: 'O que cai em cada dia',
        ul: [
          'Domingo, 8 de novembro: Linguagens, Códigos e suas Tecnologias, Ciências Humanas e a redação.',
          'Domingo, 15 de novembro: Ciências da Natureza e Matemática.',
          'Cada área tem 45 questões objetivas de múltipla escolha.',
        ],
        p: ['Horários, portões e documentos aceitos estão no edital do INEP e no Cartão de Confirmação de Inscrição. Confira sempre esses dois antes de sair de casa.'],
      },
      {
        h: 'Quem faz o 1º dia ainda tem o 2º pela frente',
        p: ['A semana entre as provas é uma boa chance de ajustar o que falta para Ciências da Natureza e Matemática. Evite assunto novo: o melhor uso do tempo é revisar o que você erra com mais frequência e manter o descanso em dia.', 'Montamos uma trilha de 6 dias para isso, no guia Semana entre as provas do ENEM.'],
      },
      {
        h: 'Treine com provas anteriores',
        p: ['No Simulaki você treina com questões das provas oficiais do ENEM, por área e por assunto, com correção na hora e acompanhamento do seu desempenho.'],
      },
    ],
    faq: [
      { q: 'Quais são as datas do ENEM 2026?', a: 'As provas são nos domingos 8 e 15 de novembro de 2026.' },
      { q: 'O que cai no primeiro e no segundo dia?', a: 'No primeiro dia, Linguagens, Ciências Humanas e a redação. No segundo, Ciências da Natureza e Matemática.' },
      { q: 'Onde confiro horário e local da minha prova?', a: 'No Cartão de Confirmação de Inscrição e no edital do ENEM, no site do INEP.' },
    ],
  },
  {
    slug: 'semana-entre-as-provas-do-enem',
    tema: 'enem',
    fonte: FONTE_ENEM,
    titulo: 'Semana entre as provas do ENEM: trilha de 6 dias',
    resumo: 'Um roteiro leve de 6 dias, de 9 a 14 de novembro, para chegar bem ao 2º dia do ENEM: Ciências da Natureza e Matemática.',
    intro: 'Entre o 1º e o 2º dia do ENEM sobram seis dias. Este roteiro usa esse tempo sem cansar você: revisar o que mais rende, treinar com calma e descansar.',
    atualizado: '2026-11-06',
    blocos: [
      {
        h: 'Antes de começar',
        p: ['Esta trilha vale para o 2º dia da edição de 2026, que traz Ciências da Natureza e Matemática. Ajuste o tamanho de cada dia ao seu ritmo: se ficar cansado, faça menos. Dormir bem vale mais do que uma questão a mais.'],
      },
      {
        h: 'Segunda (9/11): diagnóstico',
        p: ['Respire depois do 1º dia. Faça um treino de 10 questões de Natureza e outro de 10 de Matemática e olhe seu radar para ver os dois assuntos em que você mais erra.'],
      },
      {
        h: 'Terça (10/11): Ciências da Natureza',
        p: ['Treine os dois assuntos mais fracos de Natureza. Depois de cada treino, leia a explicação dos erros e anote o que ficou confuso.'],
      },
      {
        h: 'Quarta (11/11): Matemática',
        p: ['Faça o mesmo com Matemática: dois assuntos mais fracos, treino curto, explicação dos erros.'],
      },
      {
        h: 'Quinta (12/11): treino cronometrado',
        p: ['Faça um treino maior de uma das duas áreas, escolhendo a quantidade de questões, e controle o tempo. O objetivo é treinar o ritmo, não bater recorde.'],
      },
      {
        h: 'Sexta (13/11): revisar os erros',
        p: ['Refaça só as questões que você errou nos dias anteriores, na área de revisão de erros. É a parte que mais rende na reta final.'],
      },
      {
        h: 'Sábado (14/11): véspera',
        ul: [
          'Não estude assunto novo.',
          'Separe o documento e o material exigidos no edital e confira o seu Cartão de Confirmação.',
          'Durma cedo.',
        ],
      },
      {
        h: 'Domingo (15/11): prova',
        p: ['Faça a prova com calma. Você já fez a sua parte: agora é confiar no que treinou.'],
      },
    ],
    faq: [
      { q: 'Preciso estudar todos os dias até o 2º dia do ENEM?', a: 'Não precisa estudar o dia todo. Treinos curtos e revisão dos seus erros funcionam melhor do que maratonas, principalmente perto da prova.' },
      { q: 'Posso aprender assunto novo na véspera?', a: 'Não é recomendado. Na véspera, descanse e confira o que o edital pede para o dia da prova.' },
      { q: 'O que cai no 2º dia do ENEM?', a: 'Ciências da Natureza e Matemática, com 45 questões objetivas em cada área.' },
    ],
  },
  {
    slug: 'como-funciona-o-enem',
    tema: 'enem',
    fonte: FONTE_ENEM,
    titulo: 'Como funciona a prova do ENEM',
    resumo: 'Áreas, dias de prova, número de questões, redação e como a nota das questões objetivas é calculada no ENEM.',
    intro: 'O Exame Nacional do Ensino Médio é aplicado pelo INEP e dá acesso ao Sisu, ao Prouni e a muitas instituições. Veja como a prova é organizada.',
    atualizado: '2026-10-15',
    blocos: [
      {
        h: 'Estrutura da prova',
        ul: [
          'São 180 questões objetivas de múltipla escolha, com cinco alternativas, divididas em quatro áreas de 45 questões cada.',
          'As áreas são Linguagens, Códigos e suas Tecnologias; Ciências Humanas; Ciências da Natureza; e Matemática.',
          'A prova é aplicada em dois dias. No primeiro, Linguagens, Ciências Humanas e a redação. No segundo, Ciências da Natureza e Matemática.',
        ],
        p: ['Datas, horários e regras de cada edição estão no edital do INEP. Confira sempre o edital do ano em que você vai fazer a prova.'],
      },
      {
        h: 'Como a nota das questões é calculada',
        p: ['As questões objetivas são corrigidas pela Teoria de Resposta ao Item (TRI). Na TRI a nota não depende só da quantidade de acertos: leva em conta também a dificuldade das questões que você acertou e a coerência das respostas. Por isso duas pessoas com o mesmo número de acertos podem ter notas diferentes.'],
      },
      {
        h: 'A redação',
        p: ['A redação é um texto dissertativo-argumentativo sobre um tema de ordem social, científica, cultural ou política. Ela vale de 0 a 1000 pontos. Veja o guia sobre as cinco competências da redação.'],
      },
      {
        h: 'Como se preparar',
        p: ['Resolver provas anteriores é a forma mais direta de conhecer o estilo das questões. No Simulaki você treina com questões das provas oficiais do INEP, por área e por assunto, e acompanha onde mais erra.'],
      },
    ],
    faq: [
      { q: 'Quantas questões tem o ENEM?', a: 'São 180 questões objetivas, 45 em cada uma das quatro áreas, mais a redação.' },
      { q: 'O ENEM é feito em quantos dias?', a: 'Em dois dias de prova.' },
      { q: 'A nota é só a soma dos acertos?', a: 'Não. As questões objetivas são corrigidas pela Teoria de Resposta ao Item (TRI), que considera também a dificuldade das questões.' },
    ],
  },
  {
    slug: 'redacao-do-enem-competencias',
    tema: 'enem',
    fonte: FONTE_ENEM,
    titulo: 'As 5 competências da redação do ENEM',
    resumo: 'O que cada uma das cinco competências avalia na redação do ENEM, de 0 a 200 pontos cada, e como isso forma a nota final.',
    intro: 'A redação do ENEM é avaliada em cinco competências. Entender o que cada uma cobra ajuda a revisar o próprio texto.',
    atualizado: '2026-10-15',
    blocos: [
      {
        h: 'Como a nota é formada',
        p: ['Cada competência vale de 0 a 200 pontos, e a soma das cinco dá a nota da redação, de 0 a 1000.'],
      },
      {
        h: 'As cinco competências',
        ul: [
          'Competência 1: domínio da modalidade escrita formal da língua portuguesa.',
          'Competência 2: compreender a proposta de redação e aplicar conceitos de várias áreas do conhecimento para desenvolver o tema, dentro da estrutura do texto dissertativo-argumentativo.',
          'Competência 3: selecionar, relacionar, organizar e interpretar informações, fatos, opiniões e argumentos em defesa de um ponto de vista.',
          'Competência 4: demonstrar conhecimento dos mecanismos linguísticos necessários para a construção da argumentação, como a coesão.',
          'Competência 5: elaborar proposta de intervenção para o problema abordado, respeitando os direitos humanos.',
        ],
      },
      {
        h: 'Dicas de revisão',
        p: ['Releia o texto uma vez para cada competência. Em uma passada, olhe só a gramática; em outra, só se a proposta de intervenção está completa. Revisar uma competência por vez costuma pegar mais erros do que uma leitura única.'],
      },
    ],
    faq: [
      { q: 'Quantas competências a redação do ENEM tem?', a: 'Cinco, cada uma valendo de 0 a 200 pontos.' },
      { q: 'Qual é a nota máxima da redação?', a: '1000 pontos.' },
      { q: 'A proposta de intervenção é obrigatória?', a: 'Ela é cobrada pela Competência 5, que exige uma proposta de intervenção que respeite os direitos humanos.' },
    ],
  },
  {
    slug: 'provas-e-gabaritos-do-enem',
    tema: 'enem',
    fonte: FONTE_ENEM,
    titulo: 'Provas e gabaritos do ENEM: como usar',
    resumo: 'Onde ficam as provas e os gabaritos oficiais do ENEM e por que o gabarito precisa ser o da cor do seu caderno.',
    intro: 'O INEP publica as provas e os gabaritos de cada edição. Para estudar com eles sem se confundir, vale conhecer um detalhe dos cadernos.',
    atualizado: '2026-10-15',
    blocos: [
      {
        h: 'Onde encontrar',
        p: ['As provas e os gabaritos oficiais ficam na página de provas e gabaritos do INEP, organizados por ano e por dia de aplicação.'],
      },
      {
        h: 'Atenção às cores dos cadernos',
        p: ['Cada dia de prova tem cadernos de cores diferentes, e a ordem das questões muda de um caderno para outro. Por isso o gabarito precisa ser o da mesma cor do caderno que você está usando. Conferir com o gabarito de outra cor faz parecer que você errou questões que acertou.'],
      },
      {
        h: 'Como usar para estudar',
        ul: [
          'Resolva uma prova inteira de um dia, com tempo, antes de olhar o gabarito.',
          'Corrija com o gabarito da cor correta e anote os assuntos dos erros.',
          'Refaça os erros dias depois, sem consultar a resposta.',
        ],
      },
    ],
    faq: [
      { q: 'Posso usar qualquer gabarito do mesmo ano?', a: 'Não. O gabarito deve ser o da mesma cor e do mesmo dia do caderno que você resolveu.' },
      { q: 'As provas anteriores são gratuitas?', a: 'O INEP disponibiliza as provas e os gabaritos em sua página oficial.' },
    ],
  },
  {
    slug: 'como-estudar-para-o-enem',
    tema: 'enem',
    fonte: FONTE_ENEM,
    titulo: 'Como estudar para o ENEM com provas anteriores',
    resumo: 'Um roteiro simples para estudar para o ENEM: diagnóstico por área, treino por assunto, revisão de erros e simulados.',
    intro: 'Estudar com método rende mais do que tentar ver todo o conteúdo. Este roteiro usa as provas anteriores como guia.',
    atualizado: '2026-10-15',
    blocos: [
      {
        h: '1. Faça um diagnóstico',
        p: ['Resolva questões das quatro áreas e veja em qual você mais erra. Isso diz onde investir o tempo primeiro.'],
      },
      {
        h: '2. Treine por assunto',
        p: ['Escolha um assunto fraco e resolva um bloco curto de questões, lendo a explicação logo depois de responder. Sessões curtas e diárias costumam render mais do que uma maratona por semana.'],
      },
      {
        h: '3. Refaça os erros',
        p: ['Volte às questões que errou até acertar. Anote o motivo do erro: faltou conteúdo, leitura ou atenção.'],
      },
      {
        h: '4. Simule o dia da prova',
        p: ['De tempos em tempos, resolva um bloco longo com cronômetro para treinar o ritmo e o cansaço. O ENEM cobra resistência, além de conteúdo.'],
      },
      {
        h: '5. Escreva redações',
        p: ['Escreva textos com regularidade e releia cada um à luz das cinco competências. Veja o guia da redação.'],
      },
    ],
    faq: [
      { q: 'Vale a pena resolver provas anteriores?', a: 'Sim. Elas mostram o estilo das questões e os assuntos que mais aparecem.' },
      { q: 'Quanto tempo estudar por dia?', a: 'Não há número único. Constância importa mais: sessões curtas todos os dias costumam funcionar melhor.' },
    ],
  },
];
