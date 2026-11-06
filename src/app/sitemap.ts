import type { MetadataRoute } from 'next';
import { ESTADOS, GUIAS } from '@/lib/guias';
import { siteUrl } from '@/lib/site';
import { VESTIBULARES } from '@/lib/vestibulares';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const fixas = ['/', '/planos', '/cadastro', '/guia', '/conquistas', '/termos', '/privacidade', '/reembolso'];
  const paginas = [
    ...fixas.map((p) => ({ url: `${base}${p}` })),
    ...ESTADOS.map((e) => ({ url: `${base}/detran/${e.uf}` })),
    ...VESTIBULARES.map((v) => ({ url: `${base}/prova/${v.slug}` })),
    ...GUIAS.map((g) => ({ url: `${base}/guia/${g.slug}`, lastModified: new Date(g.atualizado + 'T12:00:00') })),
  ];
  return paginas;
}
