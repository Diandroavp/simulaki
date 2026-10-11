/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@electric-sql/pglite', 'postgres'],
  outputFileTracingIncludes: { '/**': ['./content/questions/**/*.json', './drizzle/**/*'] },
  // PRELAUNCH=1: a raiz mostra a página de pré-lançamento (lista de espera) em vez do app.
  async rewrites() {
    return process.env.PRELAUNCH === '1' ? [{ source: '/', destination: '/pre-lancamento.html' }] : [];
  },
};
export default nextConfig;
