# Pendências do Simulaki (atualizado em 13/10/2026)

## No ar
Domínio https://www.simulaki.com, e-mails (Resend, com cópia oculta para diandroavp@gmail.com), Pix pela Canvi, painel admin, treino por tema, simulado personalizado (plano pago), banco do Detran e banco do ENEM (2009 a 2025, em rascunho).

## Planos (13/10/2026)
Grátis, Mensal R$ 12,90, Passe 60 dias R$ 19,90, Semestral R$ 49,90 e Anual R$ 79,90 (os dois últimos funcionam como âncora). Preços mudam no banco (tabela `plans`); o seed só cria planos novos.

## Provas: o que falta

### ENEM
- **Revisão humana** das ~2.760 questões (tudo está `draft`; produção só mostra `published`). Falta decidir o fluxo (tela em /admin/questoes em lote, ou publicar só 2022 a 2025 depois de amostragem).
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
- A prova é aplicada e publicada pela **Vunesp** (páginas `vunesp.com.br/UEAM25xx` e `UEAM26xx`). Ainda não abri essas páginas nem baixei nada.
- **Direitos:** pedir autorização à Vunesp e à UEA antes de publicar questões do SIS, ou ter parecer jurídico. Mesmo cuidado com o PSC (UFAM) e a OAB (FGV).

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

## E-mail oficial
`simulakioficial@gmail.com` é o e-mail de suporte e do encarregado (LGPD).
