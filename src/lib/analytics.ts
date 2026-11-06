/** ID de medição do Google Analytics 4 (G-XXXXXXXXXX). Sem ele, nada é carregado. Pode ser definido na Vercel como GA_ID. */
const raw = process.env.GA_ID ?? process.env.NEXT_PUBLIC_GA_ID ?? '';
export const GA_ID = /^G-[A-Z0-9]{6,}$/.test(raw.trim()) ? raw.trim() : '';
