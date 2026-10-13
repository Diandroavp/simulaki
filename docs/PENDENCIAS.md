# Pendências do Simulaki (atualizado em 11/10/2026)

## O que depende do Diandro

### Antes de abrir para o público
1. **Revisão das questões.** Planilhas `simulaki-revisao-sem-placas.csv` (1.340) e `simulaki-revisao-com-placas.csv` (226). O revisor marca ok / corrigir / descartar e confere o tema de cada questão. Depois: `node scripts/review.mjs publish "Nome" ids...`. Sem isso, nada vai para produção quando `ALLOW_DRAFT_QUESTIONS` for desligado.
2. **Direito de uso do Banco Nacional de Questões.** A Resolução CONTRAN 1.020/2025 (art. 33 §6º) diz que o banco é público, mas não há termo de reuso explícito. Pedir parecer aos advogados e escrever à Senatran (Fale Conosco do Ministério dos Transportes): link oficial do PDF e autorização para uso comercial.
3. **Dados legais (`LEGAL_*` na Vercel):** razão social, CNPJ, endereço, e-mail do encarregado de dados. Depois de revisão jurídica dos Termos/Privacidade/Reembolso, definir `LEGAL_REVIEWED=1`.
4. **Imagens das placas.** 86 placas faltam (R-1 e R-2 já existem). Baixar do Wikimedia Commons ("Road signs of Brazil", arquivos "Brasil R-37.svg") ou do Manual Brasileiro de Sinalização de Trânsito (CONTRAN), colocar numa pasta do Google Drive e passar o link. Lista: `npm run placas:faltando`.
5. **Confirmar com o Detran-AM** a distribuição de questões por tema (hoje: 12 legislação, 10 direção defensiva, 3 primeiros socorros, 3 meio ambiente, 2 mecânica, não confirmada) e se o estado já usa o banco nacional.

### Domínio e e-mail
6. **Domínio (GoDaddy):** apontar simulaki.com para a Vercel (adicionar o domínio no projeto e criar os registros DNS).
7. **Resend:** criar conta, verificar o domínio, gerar `RESEND_API_KEY` e `EMAIL_FROM`. Sem isso não saem e-mails de verificação nem de recuperação de senha, e o checkout exige e-mail verificado.
8. **Depois de o domínio ir ao ar:** cadastrar simulaki.com no Google Search Console e enviar o sitemap (https://simulaki.com/sitemap.xml). Definir `APP_URL=https://simulaki.com` na Vercel.
9. **Vercel:** conferir que a Deployment Protection está desligada e que `APP_URL` aponta para o domínio final.

### Financeiro (por último)
9. **Canvi/Pix:** credenciais (você mesmo cadastra na Vercel), `PAYMENT_WEBHOOK_SECRET` e teste no sandbox. Até lá o site mostra "Pix abre em breve".
10. **Login com Google:** criar credenciais OAuth, cadastrar a URL de retorno e testar.

## O que está feito
- Treino por tema e caderno de erros (/treino). Guias e páginas por estado para o Google (/guia, /detran/am|sp|ba), com sitemap.
- Banco Nacional de Questões da Senatran importado: 1.500 questões como rascunho, com fonte, ano, parte/módulo, nível e base legal exibidos ao aluno.
- Banco nacional compartilhado por todos os estados (`content/questions/br`); questões de placa só entram na prova se a imagem existir.
- Regras da prova: 30 questões, 60 min, 20 acertos (Res. CONTRAN 1.020/2025).
- Design: faixa de pista como marca, botões e cartões menos uniformes.
- Verificação de e-mail, LGPD (exportar/excluir conta), cupons, planos, painel admin, 65 testes automatizados.

## Limitações conhecidas
- Não consegui testar o cadastro e o simulado no site publicado (o ambiente não abre a Vercel e o acesso da ferramenta à conta foi negado). Testei tudo em ambiente local.
- Temas das questões do banco nacional atribuídos por palavras-chave; sujeitos a conferência.
- Questões de placa: 226 fora das provas até as imagens entrarem.


## E-mail oficial
- `simulakioficial@gmail.com` é o e-mail de suporte e do encarregado (LGPD) enquanto não houver e-mail no domínio. Os advogados devem confirmar quem consta como encarregado nos textos. Usar também como dono do Google Search Console, da conta Resend e do projeto Google (login).
