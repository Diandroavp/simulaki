import type { MetadataRoute } from 'next';

import { siteUrl } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [{ userAgent: '*', allow: ['/', '/planos', '/guia', '/conquistas', '/detran', '/prova', '/termos', '/privacidade', '/reembolso'], disallow: ['/app', '/admin', '/parceiro', '/api', '/pagamento', '/assinar', '/simulado'] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
