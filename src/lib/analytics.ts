/** ID de medição do Google Analytics 4 (G-XXXXXXXXXX). Sem ele, nada é carregado. Pode ser definido na Vercel como GA_ID. */
/** ID público da propriedade "Simulaki" (aparece no HTML de qualquer site com Analytics). A variável GA_ID, se existir, tem prioridade; GA_ID="" desliga. */
const PADRAO = 'G-PCZFJVXXVG';
const raw = process.env.GA_ID ?? process.env.NEXT_PUBLIC_GA_ID ?? PADRAO;
export const GA_ID = /^G-[A-Z0-9]{6,}$/.test(raw.trim()) ? raw.trim() : '';
