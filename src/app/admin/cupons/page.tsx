import { redirect } from 'next/navigation';
import { desc } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { requireAdmin } from '@/lib/auth';
import { createCouponAction, toggleCouponAction } from '../actions';

export const dynamic = 'force-dynamic';
const brl = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function describe(c: typeof schema.coupons.$inferSelect) {
  if (c.freeDays) return `${c.freeDays} dias grátis`;
  if (c.percentOff) return `${c.percentOff}% de desconto`;
  return `${brl(c.amountOffCents ?? 0)} de desconto`;
}

export default async function Cupons({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  if (!(await requireAdmin())) redirect('/');
  const { erro, ok } = await searchParams;
  const db = await getDb();
  const coupons = await db.select().from(schema.coupons).orderBy(desc(schema.coupons.createdAt));
  return (
    <>
      <h1>Cupons</h1>
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Novo cupom</h2>
        {erro && <p className="err" role="alert">{erro}</p>}
        {ok && <p className="okmsg">{ok}</p>}
        <form action={createCouponAction}>
          <div className="grid">
            <label>Código<input name="code" required placeholder="BEMVINDO30" autoCapitalize="characters" /></label>
            <label>Tipo
              <select name="type" defaultValue="free_days">
                <option value="free_days">Dias grátis de assinatura</option>
                <option value="percent">Desconto em %</option>
                <option value="amount">Desconto em R$</option>
              </select>
            </label>
            <label>Valor (dias, % ou R$)<input name="value" type="number" step="0.01" min="0.01" required defaultValue={30} /></label>
            <label>Limite de usos (vazio = ilimitado)<input name="maxUses" type="number" min="1" /></label>
            <label>Válido até (opcional)<input name="validUntil" type="date" /></label>
            <label>Descrição interna<input name="description" placeholder="Ex.: parceria CFC Centro" /></label>
          </div>
          <p className="muted">Cupom de dias grátis libera o acesso na hora, sem cobrança. Cada pessoa usa cada cupom uma vez.</p>
          <div className="row"><button className="btn">Criar cupom</button></div>
        </form>
      </div>

      <div className="card scroll">
        <table>
          <thead><tr><th>Código</th><th>Benefício</th><th>Usos</th><th>Validade</th><th>Situação</th><th></th></tr></thead>
          <tbody>
            {coupons.length === 0 && <tr><td colSpan={6} className="muted">Nenhum cupom ainda.</td></tr>}
            {coupons.map((c) => (
              <tr key={c.id}>
                <td><strong>{c.code}</strong>{c.description && <div className="muted">{c.description}</div>}</td>
                <td>{describe(c)}</td>
                <td>{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ''}</td>
                <td>{c.validUntil ? c.validUntil.toLocaleDateString('pt-BR', { timeZone: 'America/Manaus' }) : 'Sem prazo'}</td>
                <td>{c.active ? 'Ativo' : 'Desativado'}</td>
                <td>
                  <form action={toggleCouponAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="active" value={c.active ? '0' : '1'} />
                    <button className="btn ghost" style={{ padding: '4px 10px' }}>{c.active ? 'Desativar' : 'Ativar'}</button>
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
