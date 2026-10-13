import type { MetadataRoute } from 'next';
import { ESTADOS, GUIAS } from '@/lib/guias';
import { VESTIBULARES } from '@/lib/vestibulares';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.APP_URL ?? 'http://localhost:3000';
  const fixas = ['/', '/planos', '/cadastro', '/guia', '/termos', '/privacidade', '/reembolso'];
  const paginas = [
    ...fixas.map((p) => ({ url: `${base}${p}` })),
    ...ESTADOS.map((e) => ({ url: `${base}/detran/${e.uf}` })),
    ...VESTIBULARES.map((v) => ({ url: `${base}/prova/${v.slug}` })),
    ...GUIAS.map((g) => ({ url: `${base}/guia/${g.slug}`, lastModified: new Date(g.atualizado + 'T12:00:00') })),
  ];
  return paginas;
}
