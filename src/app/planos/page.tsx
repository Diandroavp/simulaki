import Link from 'next/link';
import { and, asc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/db';

export const dynamic = 'force-dynamic';
const brl = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default async function Planos() {
  const db = await getDb();
  const plans = await db.select().from(schema.plans).where(and(eq(schema.plans.active, true), eq(schema.plans.audience, 'student'))).orderBy(asc(schema.plans.priceCents));
  return (
    <>
      <h1>Planos</h1>
      <p>Pague por Pix. Acesso liberado assim que o pagamento é confirmado.</p>
      <div className="grid">
        <div className="card">
          <h3>Grátis</h3>
          <div className="price">R$ 0</div>
          <ul><li>1 simulado por dia</li><li>Correção com explicação</li><li>Histórico</li></ul>
          <Link className="btn ghost" href="/cadastro">Criar conta</Link>
        </div>
        {plans.map((p) => (
          <div className="card" key={p.id}>
            <h3>{p.name}</h3>
            <div className="price">{brl(p.priceCents)}</div>
            <p className="muted" style={{ marginTop: 0 }}>{p.periodDays} dias de acesso{p.billing === 'recurring' ? ' (renove quando quiser)' : ''}</p>
            <ul><li>Simulados ilimitados</li><li>Todos os tipos disponíveis</li><li>Estatísticas completas</li></ul>
            <Link className="btn" href={`/assinar/${p.slug}`}>Assinar com Pix</Link>
          </div>
        ))}
      </div>
      <p className="muted">Cartão de crédito em breve. Tem um cupom? Você informa na próxima tela.</p>
    </>
  );
}
