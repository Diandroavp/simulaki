# Simulaki

Plataforma de simulados para a prova teórica do Detran. Domínio: simulaki.com.

Este repositório tem o **núcleo do projeto** (schema, regras de acesso e de prova, banco de questões) e o **primeiro app Next.js**: fluxo do simulado sem login, lendo as questões dos arquivos JSON.

## O que já existe

| Parte | Onde | Estado |
| --- | --- | --- |
| Schema do banco (usuários, organizações, planos, assinaturas, pagamentos, questões, provas, tentativas, auditoria) | `src/db/schema.ts` | Pronto; migração gerada em `drizzle/` |
| Regra de acesso (assinatura ativa, tolerância de 3 dias, cancelamento, vínculo com parceiro, limite de alunos) | `src/lib/access.ts` | Pronto, com testes |
| Configuração da prova por estado, sorteio e correção | `src/lib/exam.ts` | AM, BA e SP configurados (a confirmar) |
| Banco de questões e validador | `content/questions/` e `scripts/validate-questions.mjs` | 32 rascunhos do AM, todos `draft`, sem revisão humana |
| App Next.js: home, planos, cadastro/login (e-mail e senha; Google quando configurado), simulado com cronômetro e correção, área do aluno (histórico, % de acertos, questões resolvidas por tipo de simulado e por tema) | `src/app/` | Funciona e foi testado de ponta a ponta no navegador. Login com Google **não testado** (precisa de credenciais) |
| Assinatura via Pix (cobrança, página com QR Code e copia e cola, webhook assinado e idempotente, acesso liberado ao confirmar) | `src/lib/billing.ts`, `src/lib/payments/` | Funciona com provedor de **teste** (`PAYMENT_GATEWAY=mock`, bloqueado em produção). Falta ligar o gateway real |
| Cupons (dias grátis, % ou R$; limite de usos, validade, um uso por pessoa) e painel admin | `src/app/admin/cupons` | Funciona; admin = e-mails em `ADMIN_EMAILS` |
| Painel de gestão (usuários, assinantes ativos, receita, simulados, pagamentos recentes) e bloqueio de login após 8 senhas erradas em 15 min | `src/app/admin/`, `src/lib/ratelimit.ts` | Funciona |
| Integração Pix com a Canvi (token JWT em cache, cobrança Pix dinâmico em centavos, consulta, webhook em `/api/webhooks/canvi/<segredo>`, confirmação sempre pela API, consulta de reserva sem webhook) | `src/lib/payments/canvi.ts`, `src/lib/canvi-webhook.ts` | Implementada a partir da coleção pública da Canvi e testada contra um servidor **simulado**; **ainda não testada no sandbox real** (faltam credenciais). O formato do aviso do webhook não é público |
| Retomar prova (autosave das respostas, mesmas questões, tempo restante; prova vencida é corrigida sozinha) | `src/lib/attempts.ts` | Funciona |
| Recuperação de senha (link de 1 hora, uso único, encerra sessões, 3 pedidos/hora; e-mail via Resend) | `src/lib/password-reset.ts`, `src/lib/email.ts` | Funciona; sem `RESEND_API_KEY` o e-mail só aparece no console em desenvolvimento |
| Parceiros (autoescolas): admin cria o parceiro e libera plano (Start 50 alunos / Pro 200); gestor convida por e-mail, vê desempenho e remove; aluno aceita o convite (LGPD) e ganha acesso pelo plano do parceiro | `src/lib/partners.ts`, `/parceiro`, `/admin/parceiros` | Funciona; a **cobrança do parceiro é manual** (admin libera os dias) |
| Lista de espera (consentimento, limite por IP) e página de pré-lançamento (`PRELAUNCH=1` mostra na raiz) | `src/app/api/lista-espera`, `public/pre-lancamento.html` | Funciona |
| Tipos de simulado | `src/lib/simulations.ts` | Detran AM/SP/BA, ENEM, PSC e SIS cadastrados; só AM tem questões (rascunhos) |
| Landing page de pré-lançamento | `landing/index.html` (arquivo único) | Pronta; falta ligar o formulário (`FORM_ENDPOINT`) e publicar em simulaki.com |

## Estados

| Estado | Questões | Tempo | Mínimo | Situação |
| --- | --- | --- | --- | --- |
| AM (piloto) | 30 | 60 min | 21 | Fonte secundária; **confirmar no Detran-AM** |
| BA | 30 | 60 min | 21 | Fonte secundária, idêntica à de AM; **confirmar no Detran-BA** |
| SP | 30 | 40 min | 21 | Fontes secundárias; **confirmar no Detran-SP** |

Os valores de AM e BA vêm da mesma página de blog, com números idênticos, então a confiança é baixa. O tempo de prova (60 ou 40 minutos) é o ponto mais incerto. Confira com o Detran ou com um CFC de cada estado antes de lançar.

## Como rodar

```bash
npm install
npm test                    # regras de acesso e de prova
npm run typecheck
npm run dev                 # app em http://localhost:3000
npm run build
npm run validate:questions  # valida o banco de questões
cp .env.example .env        # sem DATABASE_URL o app usa um Postgres embutido (PGlite) só em desenvolvimento
npm run db:migrate          # com DATABASE_URL: aplica a migração no PostgreSQL
```

## Próximos passos

1. Testar a Canvi no sandbox: preencher `CANVI_*` no `.env`, `PAYMENT_GATEWAY=canvi`, rodar `node scripts/canvi-setup-webhook.mjs`, pagar com "Simular pagamento" e conferir o formato real do aviso. Depois cartão/recorrência.
2. Cartão de crédito (API de cartão da Canvi), cobrança do parceiro por Pix, e-mail de boas-vindas, termos e privacidade (revisão jurídica).
3. Painel do parceiro e painel de gestão.
4. Escrever e revisar as primeiras 200 questões de AM (ver `content/questions/README.md`).
5. Confirmar as regras da prova de cada estado nos Detrans.

## Decisões em aberto

- Gateway de pagamento: Pix pela API da Canvi (implementado); cartão ainda em aberto.
- Provedor de autenticação (Auth.js ou Clerk).
- Hospedagem (Vercel ou VPS).

## Antes de ir ao ar (beta)

- E-mail verificado: ADMIN_EMAILS só promove a administrador depois que o e-mail é confirmado; assinar, usar cupom e aceitar convite de parceiro também exigem e-mail confirmado.
- Pagamento: sem credenciais Canvi o site mostra "Pix em breve" (cupons seguem funcionando).
- Textos legais em /termos, /privacidade e /reembolso, preenchidos por variáveis LEGAL_*; trocam o aviso de revisão com LEGAL_REVIEWED=1.
- Perguntas: `node scripts/review.mjs export` gera o CSV para o revisor; `node scripts/review.mjs publish "Nome" id...` publica (exige explicação e base legal; bloqueia base marcada "conferir").
