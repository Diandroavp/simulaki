import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { requireAdmin } from '@/lib/auth';
import { orgPlan } from '@/lib/partners';
import { createPartnerAction, grantPlanAction } from './actions';

export const dynamic = 'force-dynamic';
const when = (d: Date | null) => (d ? d.toLocaleDateString('pt-BR', { timeZone: 'America/Manaus' }) : '-');

export default async function Parceiros({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  if (!(await requireAdmin())) redirect('/');
  const { erro, ok } = await searchParams;
  const db = await getDb();
  const orgs = await db.select().from(schema.organizations).orderBy(schema.organizations.name);
  const plans = await db.select().from(schema.plans).where(eq(schema.plans.audience, 'organization'));
  const rows = await Promise.all(orgs.map(async (o) => ({ o, p: await orgPlan(o.id) })));
  return (
    <>
      <h1>Parceiros</h1>
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Novo parceiro</h2>
        {erro && <p className="err" role="alert">{erro}</p>}
        {ok && <p className="okmsg">{ok}</p>}
        <form action={createPartnerAction}>
          <div className="grid">
            <label>Nome<input name="name" required placeholder="CFC Centro de Manaus" /></label>
            <label>Tipo<select name="type"><option value="cfc">Autoescola (CFC)</option><option value="instructor">Instrutor autônomo</option></select></label>
            <label>E-mail do responsável (já com conta)<input name="ownerEmail" type="email" required /></label>
            <label>UF<input name="state" maxLength={2} placeholder="AM" /></label>
          </div>
          <div className="row"><button className="btn">Criar parceiro</button></div>
        </form>
      </div>
      <div className="card scroll">
        <table>
          <thead><tr><th>Parceiro</th><th>Plano</th><th>Liberar plano</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={3} className="muted">Nenhum parceiro ainda.</td></tr>}
            {rows.map(({ o, p }) => (
              <tr key={o.id}>
                <td><strong>{o.name}</strong><div className="muted">{o.type === 'cfc' ? 'CFC' : 'Instrutor'} {o.stateCode ?? ''}</div></td>
                <td>{p.active ? `${p.plan?.name} até ${when(p.endsAt)}` : 'Sem plano ativo'}</td>
                <td>
                  <form action={grantPlanAction} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <input type="hidden" name="orgId" value={o.id} />
                    <select name="plan" style={{ width: 'auto' }}>{plans.map((pl) => <option key={pl.id} value={pl.slug}>{pl.name}</option>)}</select>
                    <input name="days" type="number" defaultValue={30} min={1} max={366} style={{ width: 80 }} aria-label="Dias" />
                    <button className="btn ghost" style={{ padding: '6px 12px' }}>Liberar</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
