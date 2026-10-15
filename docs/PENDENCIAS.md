# Pendências do Simulaki (atualizado em 13/10/2026)

## No ar
Domínio https://www.simulaki.com, e-mails (Resend, com cópia oculta para diandroavp@gmail.com), Pix pela Canvi, painel admin, treino por tema, simulado personalizado (plano pago), banco do Detran e banco do ENEM (2009 a 2025, em rascunho).

## Planos (13/10/2026)
Grátis, Mensal R$ 12,90, Passe 60 dias R$ 19,90, Semestral R$ 49,90 e Anual R$ 79,90 (os dois últimos funcionam como âncora). Preços mudam no banco (tabela `plans`); o seed só cria planos novos.

## Provas: o que falta

### Mundos (Detran x ENEM)
- Cada prova é um "mundo" (`src/lib/mundos.ts`): área própria em `/app/detran` e `/app/enem`, com desempenho, caderno de erros, treino e histórico separados (nada se mistura). Novos mundos (PSC, SIS, OAB) entram em `MUNDOS` quando tiverem banco.
- **Treino rápido** (`/treino?mundo=`): 5/10/20 questões, aleatório ou por matéria (ENEM: por área ou assunto), correção na hora. Grátis: 2 treinos/dia. Os botões "Treinar" do radar e do plano abrem direto o assunto.

### ENEM
- **Plano da semana** (`/plano`): 5 dias de foco nos assuntos mais fracos/novos, sábado mini-simulado, domingo leve; ritmo 10/15/20 questões por dia conforme a data da prova (≤45 e ≤14 dias). Botões "Treinar" levam ao simulado personalizado (ainda sem pré-selecionar o assunto).
- **Radar de aptidão e checklist de estudos** (`/desempenho`, `/checklist`): o assunto de cada questão vem de `src/lib/enem-assuntos.json`, gerado por `node scripts/monta-assuntos.mjs` a partir da classificação manual em `scripts/assuntos-revisados/*.txt` (uma letra por questão; `-` = sem assunto). Feita pelo Claude, pode ter erros: revise/ajuste o `.txt` e rode o script. ~120 questões de 2021 (e algumas sem texto) ficam sem assunto e contam só na área. Espanhol não aparece no banco atual.
- **Revisão humana** das ~2.760 questões: tela pronta em `/admin/enem` (por caderno: publicar/rejeitar marcadas, filtros, e "publicar todas as pendentes" com confirmação). Produção só mostra as publicadas; a decisão fica na tabela `question_reviews`. Falta o Diandro revisar por amostragem e publicar (sugestão: 2022 a 2025 primeiro). As 75 "rejeitadas" iniciais são as variantes de idioma (inglês/espanhol) arquivadas pelo importador.
- **Faltam:** gabaritos de 2010 e do 2º dia de 2017 (baixar no site do INEP); ano 2010 inteiro; 1998 a 2008 (importador próprio, um dia só).
- 2020 e 2021: PDFs sem texto, cada questão é uma imagem inteira.
- Questões anuladas ficaram de fora (sem gabarito oficial).
- Explicações da resolução: nenhuma ainda (o ENEM oficial só traz enunciado e gabarito).

### PSC (UFAM)
- Fonte oficial: repositório `edoc.ufam.edu.br` (coleção "Documentos Compec", handle 123456789/552). Mapeadas **14 provas com gabarito definitivo**: PSC 1 e 2 de 2019 a 2023, PSC 3 de 2020 a 2023.
- **Pendente do Diandro:** apertar Salvar nos 28 PDFs (14,7 MB) quando o Claude refizer a fila de downloads. Os arquivos vão para `Downloads/simulaki-enem` com nome `psc_<ano>_et<etapa>_prova|gab.pdf`.
- 2024 a 2026: só gabarito preliminar no repositório; conferir contra "Respostas aos Recursos" antes de usar.
- Depois: adaptar `scripts/import-enem.py` ao formato das provas do PSC (etapas 1, 2 e 3; categoria "PSC 1/2/3").

### SIS (UEA)
- A prova é aplicada e publicada pela **Vunesp**. A "Área do candidato" da Vunesp (Provas e Gabaritos, Vista de prova) **exige login**: não entramos lá. Os PDFs públicos estão espelhados no portal Estratégia Vestibulares (mesma prova, mesmo gabarito).
- **SIS 2025** (Prova de Acompanhamento I, II e III), 6 PDFs, padrão de URL: `vestibulares.estrategia.com/portal/wp-content/uploads/2025/10/SIS-Caderno-de-Questoes-Prova-de-Acompanhamento-{I|II|III}.pdf` e `SIS-Gabarito-Prova-de-Acompanhamento-{I|II|III}.pdf`. A página não diz qual série é cada etapa (conferir no edital).
- **Vestibular UEA 2025** (Conhecimentos Gerais + Específicos Grupos I, II, III): mesmo padrão com prefixo `Vestibular-`. Não é prioridade (o SIS é o foco).
- **SIS 2024, 2023, 2020** têm páginas equivalentes no Estratégia e no Vestibulando Web (a conferir).
- **SIS 2026**: provas aplicadas; gabaritos previstos para 14/10/2026 às 20h (Manaus). Ainda sem PDF público.
- **Direitos:** pedir autorização à Vunesp e à UEA antes de publicar questões do SIS, ou ter parecer jurídico. Mesmo cuidado com o PSC (UFAM) e a OAB (FGV).
- **Pendente do Diandro:** liberar o download dos 6 PDFs do SIS 2025 (e depois dos outros anos) quando puder salvar.

### OAB (FGV)
- Plano mais alto (premium). Precisa de autorização da FGV/análise jurídica antes de qualquer questão.

## O que depende do Diandro (do documento anterior, ainda abertas)
1. **Revisão das questões do Detran** (planilhas de revisão e `scripts/review.mjs publish`).
2. **Direito de uso do Banco Nacional de Questões** (Senatran): pedir parecer e autorização.
3. **Dados legais (`LEGAL_*` na Vercel):** razão social, CNPJ, endereço, foro, encarregado; revisão jurídica dos Termos/Privacidade/Reembolso e `LEGAL_REVIEWED=1`.
4. **86 imagens de placas** (`npm run placas:faltando`).
5. **Confirmar com o Detran-AM** a distribuição de questões por tema.
6. **Google Search Console:** propriedade de domínio simulaki.com, sitemap https://www.simulaki.com/sitemap.xml.
7. **Segurança:** trocar a chave privada de produção da Canvi e o segredo do webhook (foram expostos em conversa), atualizar a Vercel e a URL de callback na Canvi e refazer um pagamento de teste.
8. **Login com Google:** credenciais OAuth e URL de retorno no domínio www.
9. **Reembolso:** definir o processo.
10. Aplicar o visual novo aos painéis admin e parceiro.

## Novidades de produto (14/10/2026)
- **Refazer prova do ENEM** (ano + dia, ordem real, tempo oficial) em /personalizado: aparece quando houver caderno publicado.
- **/desempenho**: meta diária (10), dias seguidos, 14 dias, temas mais fracos.
- **Lembretes por e-mail** (saudade aos 3 dias, só para quem aceitou novidades; fim do plano 3 dias antes): prontos e **desligados**. Para ligar, na Vercel: `REMINDERS_ENABLED=1` e `CRON_SECRET` (16+ caracteres aleatórios). O cron diário está em `vercel.json` (12h UTC = 8h de Manaus). Todo e-mail leva link para sair da lista.
- **Deixado para depois (decisão do Diandro, 14/10):** correção de redação com IA (precisa de chave de API em produção e definição de preço/plano).
- **Caderno de erros com revisão espaçada** (volta logo, em 3 e em 7 dias; 3 acertos seguidos = dominada) e **data da prova** com contagem regressiva em /desempenho.
- **/admin/metricas**: funil (cadastro → e-mail confirmado → 1º simulado → 1º pagamento), receita por plano, ticket médio, renovação.
- **Avisos de erro de alunos** aparecem na revisão do ENEM (filtro "Com aviso de aluno").
- **Compartilhar resultado** (WhatsApp / compartilhar do celular) na tela de resultado do simulado.
- **Indique e ganhe**: quem indica ganha 15 dias quando o indicado faz o 1º pagamento (máx. 12 recompensas por pessoa). Link `/cadastro?ref=CÓDIGO`, card em /app para e-mail confirmado. Só o cadastro por e-mail carrega o código; cadastro via Google ainda não.
- **Ainda não feito:** explicações das questões do ENEM (gerar rascunhos e passar pela revisão), correção de redação com IA.

## E-mail oficial
`simulakioficial@gmail.com` é o e-mail de suporte e do encarregado (LGPD).

## Nota estimada (ENEM)
- `/nota`: estimativa linear grosseira (350 + 5×%acerto por área, ±40; redação digitada pelo aluno, padrão 600). NÃO é TRI e está avisado na tela.
- Nota de corte do curso é digitada pelo aluno (link para o Sisu); nenhum corte do SISU embutido por não termos fonte verificada.
- Opcional: lista curada de cortes por curso/UFAM se o Diandro fornecer/aprovar a fonte.

## Reta final (ENEM)
- Card "🏁 Reta final" no topo de /app/enem quando faltam ≤30 dias para a data informada em Meu desempenho: contagem regressiva, 3 assuntos prioritários (do plano) com atalho de treino, revisão de erros. Nos últimos 7 dias sugere revisar, sem assunto novo.

## Explicações do ENEM (2018–2025)
- Arquivo `content/explicacoes/enem.json` (id -> texto), mesclado em `loadAllRaw` quando a questão não tem explicação; aparece no treino e no gabarito do simulado com aviso de que foi preparada com IA.
- Geradas 940 explicações (2015 a 2017, 2018 dia 1 e 2019 a 2025; 2020 e 2021 não têm questões só em texto no banco), só questões em texto. Puladas: as que dependem de texto-base/figura ausente e contas não verificáveis. 1.425 das 2.852 questões têm figura (não tratadas: precisam de leitura das imagens).
- Pendente: o Diandro conferir uma amostra da qualidade; só depois fazer 2011–2014 e as questões com imagem.
- Scripts: `scripts/dump-sem-explicacao.mjs` e `scripts/merge-explicacoes.mjs`.

## ATENÇÃO: gabarito do ENEM 2018 dia 2 parece errado
- Em `content/questions/enem/2018-d2.json` várias respostas marcadas não batem com a resolução (ex.: enem-2018-d2-107, som de sonorizador a 108 km/h e 8 cm = 375 Hz, mas o gabarito aponta 8,6 Hz; d2-138, 66 postes x R$ 8.000 = R$ 528.000, gabarito aponta R$ 512.000; d2-098, canudinho, gabarito aponta alternativa que não é a correta). Provável mistura de gabaritos de cadernos de cores diferentes. Conferir contra o gabarito oficial do INEP antes de publicar; não geradas explicações para 2018-d2 até corrigir.
