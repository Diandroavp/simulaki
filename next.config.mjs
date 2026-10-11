/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@electric-sql/pglite', 'postgres'],
  outputFileTracingIncludes: { '/**': ['./content/questions/**/*.json', './drizzle/**/*'] },
  // PRELAUNCH=1: a raiz mostra a página de pré-lançamento (lista de espera) em vez do app.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ];
  },
  async rewrites() {
    return process.env.PRELAUNCH === '1' ? [{ source: '/', destination: '/pre-lancamento.html' }] : [];
  },
};
export default nextConfig;
