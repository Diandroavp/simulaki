import Link from 'next/link';
import { redirect } from 'next/navigation';
import { desc, eq, sql } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';
const brl = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const when = (d: Date | null) => (d ? d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Manaus' }) : '-');

export default async function Admin() {
  if (!(await requireAdmin())) redirect('/');
  const db = await getDb();
  const day = new Date(Date.now() - 86_400_000);
  const month = new Date(Date.now() - 30 * 86_400_000);

  const [users] = await db.select({ total: sql<number>`count(*)::int`, novos: sql<number>`count(*) filter (where ${schema.users.createdAt} > ${month})::int` }).from(schema.users);
  const [subs] = await db.select({ ativas: sql<number>`count(distinct ${schema.subscriptions.ownerUserId}) filter (where ${schema.subscriptions.status} = 'active' and ${schema.subscriptions.endsAt} > now())::int` }).from(schema.subscriptions);
  const [rev] = await db
    .select({
      total: sql<number>`coalesce(sum(${schema.payments.amountCents}) filter (where ${schema.payments.status} = 'paid'),0)::int`,
      mes: sql<number>`coalesce(sum(${schema.payments.amountCents}) filter (where ${schema.payments.status} = 'paid' and ${schema.payments.paidAt} > ${month}),0)::int`,
      pendentes: sql<number>`count(*) filter (where ${schema.payments.status} = 'pending')::int`,
    })
    .from(schema.payments);
  const [att] = await db.select({ hoje: sql<number>`count(*) filter (where ${schema.attempts.startedAt} > ${day})::int`, total: sql<number>`count(*)::int` }).from(schema.attempts);
  const [wl] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.waitlist);
  const recent = await db
    .select({ id: schema.payments.id, amount: schema.payments.amountCents, status: schema.payments.status, at: schema.payments.createdAt, email: schema.users.email, plan: schema.plans.name })
    .from(schema.payments)
    .innerJoin(schema.users, eq(schema.users.id, schema.payments.userId))
    .innerJoin(schema.plans, eq(schema.plans.id, schema.payments.planId))
    .orderBy(desc(schema.payments.createdAt))
    .limit(15);

  return (
    <>
      <h1>Gestão</h1>
      <p><Link href="/admin/cupons">Cupons</Link> · <Link href="/admin/parceiros">Parceiros</Link> · <Link href="/admin/questoes">Questões</Link></p>
      <div className="grid">
        <div className="card"><div className="muted">Usuários</div><div className="price">{users?.total}</div><div className="muted">{users?.novos} nos últimos 30 dias</div></div>
        <div className="card"><div className="muted">Assinantes ativos</div><div className="price">{subs?.ativas}</div></div>
        <div className="card"><div className="muted">Receita (30 dias)</div><div className="price">{brl(rev?.mes ?? 0)}</div><div className="muted">Total: {brl(rev?.total ?? 0)}</div></div>
        <div className="card"><div className="muted">Lista de espera</div><div className="price">{wl?.n}</div></div>
        <div className="card"><div className="muted">Simulados</div><div className="price">{att?.total}</div><div className="muted">{att?.hoje} nas últimas 24 h</div></div>
      </div>
      <h2>Pagamentos recentes</h2>
      <div className="card scroll">
        <table>
          <thead><tr><th>Data</th><th>Usuário</th><th>Plano</th><th>Valor</th><th>Situação</th></tr></thead>
          <tbody>
            {recent.length === 0 && <tr><td colSpan={5} className="muted">Nenhum pagamento ainda.</td></tr>}
            {recent.map((r) => (
              <tr key={r.id}><td>{when(r.at)}</td><td>{r.email}</td><td>{r.plan}</td><td>{brl(r.amount)}</td><td>{{ paid: 'Pago', pending: 'Pendente', failed: 'Falhou', refunded: 'Estornado' }[r.status]}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      {(rev?.pendentes ?? 0) > 0 && <p className="muted">{rev?.pendentes} cobrança(s) Pix aguardando pagamento.</p>}
    </>
  );
}
