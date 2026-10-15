/** Código do publicador do AdSense (público, aparece no HTML). A variável de ambiente pode sobrescrever. */
export const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || 'ca-pub-2481993700725989';
/** Bloco de anúncio (criado no AdSense depois da aprovação). Sem ele, nenhum anúncio é exibido. */
export const ADSENSE_SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT || '';
