/** Dados da empresa nos textos legais. Vêm de variáveis de ambiente; sem elas, aparece o campo [entre colchetes]. */
const v = (k: string, fallback: string) => process.env[k]?.trim() || fallback;

export const legal = () => ({
  razao: v('LEGAL_RAZAO_SOCIAL', '[RAZÃO SOCIAL]'),
  cnpj: v('LEGAL_CNPJ', '[CNPJ]'),
  endereco: v('LEGAL_ENDERECO', '[ENDEREÇO]'),
  suporte: v('LEGAL_EMAIL_SUPORTE', '[E-MAIL DE SUPORTE]'),
  encarregado: v('LEGAL_EMAIL_ENCARREGADO', '[E-MAIL DO ENCARREGADO]'),
  foro: v('LEGAL_FORO', '[CIDADE/UF]'),
  /** Marque LEGAL_REVIEWED=1 depois que os advogados aprovarem os textos: some o aviso. */
  reviewed: process.env.LEGAL_REVIEWED === '1',
});
