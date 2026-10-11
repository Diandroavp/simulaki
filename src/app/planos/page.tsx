import Link from 'next/link';
import { and, asc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/db';

export const dynamic = 'force-dynamic';
const brl = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default async function Planos() {
  const db = await getDb();
  const plans = await db.select().from(schema.plans).where(and(eq(schema.plans.active, true), eq(schema.plans.audience, 'student'))).orderBy(asc(schema.plans.priceCents));
  const best = [...plans].sort((a, b) => a.priceCents / (a.periodDays ?? 1) - b.priceCents / (b.periodDays ?? 1))[0];
  const bestId = plans.length > 1 ? best?.id : undefined;
  return (
    <>
      <h1>Planos</h1>
      <p>Pague por Pix. Acesso liberado assim que o pagamento é confirmado.</p>
      <div className="grid">
        <div className="card plan">
          <h3>Grátis</h3>
          <div className="price">R$ 0</div>
          <p className="perday">para começar</p>
          <ul className="checks"><li>1 simulado por dia</li><li>Correção com explicação</li><li>Histórico</li></ul>
          <Link className="btn ghost" href="/cadastro">Criar conta</Link>
        </div>
        {plans.map((p) => (
          <div className={`card plan ${p.id === bestId ? 'best' : ''}`} key={p.id}>
            <h3 style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>{p.name}{p.id === bestId && <span className="badge on">Menor preço por dia</span>}</h3>
            <div className="price">{brl(p.priceCents)}</div>
            <p className="perday">{p.periodDays} dias de acesso{p.billing === 'recurring' ? ' (renove quando quiser)' : ''} · {brl(Math.round(p.priceCents / (p.periodDays ?? 1)))} por dia</p>
            <ul className="checks"><li>Simulados ilimitados</li><li>Todos os tipos disponíveis</li><li>Estatísticas completas</li></ul>
            <Link className="btn" href={`/assinar/${p.slug}`}>Assinar com Pix</Link>
          </div>
        ))}
      </div>
      <p className="muted">Cartão de crédito em breve. Tem um cupom? Você informa na próxima tela.</p>
    </>
  );
}
