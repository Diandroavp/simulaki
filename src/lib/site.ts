/** URL pública do site para SEO (sitemap, robots, canonical, JSON-LD). Em produção nunca cai em localhost. */
export const siteUrl = () =>
  (process.env.APP_URL ?? (process.env.NODE_ENV === 'production' ? 'https://www.simulaki.com' : 'http://localhost:3000')).replace(/\/$/, '');

export const SITE_TITLE = 'Simulaki | Simulados para a prova do Detran e o ENEM';
export const SITE_DESC =
  'Simulados com cronômetro, correção na hora e explicação de cada questão: prova teórica do Detran (CNH) e ENEM com provas anteriores. Comece grátis.';
