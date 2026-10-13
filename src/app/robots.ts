import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL ?? 'http://localhost:3000';
  return {
    rules: [{ userAgent: '*', allow: ['/', '/planos', '/guia', '/detran', '/termos', '/privacidade', '/reembolso'], disallow: ['/app', '/admin', '/parceiro', '/api', '/pagamento', '/assinar', '/simulado'] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
