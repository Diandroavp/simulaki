import Link from 'next/link';
import { and, asc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { PageHero } from '../page-hero';

export const dynamic = 'force-dynamic';
const brl = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default async function Planos() {
  const db = await getDb();
  const plans = await db.select().from(schema.plans).where(and(eq(schema.plans.active, true), eq(schema.plans.audience, 'student'))).orderBy(asc(schema.plans.priceCents));
  const best = [...plans].sort((a, b) => a.priceCents / (a.periodDays ?? 1) - b.priceCents / (b.periodDays ?? 1))[0];
  const bestId = plans.length > 1 ? best?.id : undefined;
  return (
    <>
      <PageHero title={<>Escolha o seu <em>plano</em></>} lead="Pague por Pix. Acesso liberado assim que o pagamento é confirmado." />
      <div className="grid">
        <div className="card plan">
          <h3>Grátis</h3>
          <div className="price">R$ 0</div>
          <p className="perday">para começar</p>
          <ul className="checks"><li>1 simulado por dia</li><li>Correção com explicação</li><li>Histórico</li></ul>
          <Link className="btn ghost" href="/cadastro">Criar conta</Link>
        </div>
        {plans.filter((p) => (p.periodDays ?? 0) < 180).map((p) => (
          <div className={`card plan ${p.slug === 'passe-60' ? 'best' : ''}`} key={p.id}>
            <h3 style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>{p.name}{p.id === bestId ? <span className="badge on">Menor preço por dia</span> : p.slug === 'passe-60' ? <span className="badge on">Mais escolhido</span> : null}</h3>
            <div className="price">{brl(p.priceCents)}</div>
            <p className="perday">{p.periodDays} dias de acesso{p.billing === 'recurring' ? ' (renove quando quiser)' : ''} · {brl(Math.round(p.priceCents / (p.periodDays ?? 1)))} por dia</p>
            <ul className="checks">
              <li>Simulados ilimitados</li><li>Todos os tipos disponíveis</li><li>Estatísticas completas</li><li>Simulado personalizado: você escolhe matérias e quantidades</li>
              {(p.periodDays ?? 0) >= 180 && <li>Provas novas que lançarmos durante o seu acesso</li>}
            </ul>
            <Link className="btn" href={`/assinar/${p.slug}`}>Assinar com Pix</Link>
          </div>
        ))}
      </div>
      {plans.some((p) => (p.periodDays ?? 0) >= 180) && (
        <>
          <h2 style={{ marginTop: 32 }}>Vai estudar por mais tempo?</h2>
          <p className="muted" style={{ marginTop: 0 }}>Pague uma vez e estude sem renovar. Quanto mais longo o plano, menor o preço por dia.</p>
          <div className="grid">
        {plans.filter((p) => (p.periodDays ?? 0) >= 180).map((p) => (
          <div className={`card plan ${p.slug === 'passe-60' ? 'best' : ''}`} key={p.id}>
            <h3 style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>{p.name}{p.id === bestId ? <span className="badge on">Menor preço por dia</span> : p.slug === 'passe-60' ? <span className="badge on">Mais escolhido</span> : null}</h3>
            <div className="price">{brl(p.priceCents)}</div>
            <p className="perday">{p.periodDays} dias de acesso{p.billing === 'recurring' ? ' (renove quando quiser)' : ''} · {brl(Math.round(p.priceCents / (p.periodDays ?? 1)))} por dia</p>
            <ul className="checks">
              <li>Simulados ilimitados</li><li>Todos os tipos disponíveis</li><li>Estatísticas completas</li><li>Simulado personalizado: você escolhe matérias e quantidades</li>
              {(p.periodDays ?? 0) >= 180 && <li>Provas novas que lançarmos durante o seu acesso</li>}
            </ul>
            <Link className="btn" href={`/assinar/${p.slug}`}>Assinar com Pix</Link>
          </div>
        ))}
          </div>
        </>
      )}
      <p className="muted">Cartão de crédito em breve. Tem um cupom? Você informa na próxima tela.</p>
    </>
  );
}
