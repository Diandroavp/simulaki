import { notFound, redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { checkoutAction } from '../../actions';
import { paymentsEnabled } from '@/lib/payments/provider';

export const dynamic = 'force-dynamic';
const brl = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default async function Assinar({ params, searchParams }: { params: Promise<{ plan: string }>; searchParams: Promise<{ erro?: string }> }) {
  const { plan: slug } = await params;
  const { erro } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect(`/cadastro?erro=${encodeURIComponent('Crie sua conta para assinar.')}`);
  const db = await getDb();
  const [plan] = await db.select().from(schema.plans).where(eq(schema.plans.slug, slug)).limit(1);
  if (!plan || !plan.active) notFound();
  return (
    <div className="card" style={{ maxWidth: 480, margin: '24px auto' }}>
      <h1 style={{ marginTop: 0 }}>{plan.name}</h1>
      <p className="price">{brl(plan.priceCents)}</p>
      <p className="muted">{plan.periodDays} dias de acesso ilimitado. {paymentsEnabled() ? 'Pagamento por Pix.' : 'O pagamento por Pix abre em breve; se você tem um cupom, use abaixo.'}</p>
      {erro && <p className="err" role="alert">{erro}</p>}
      <form action={checkoutAction}>
        <input type="hidden" name="plan" value={plan.slug} />
        <label>Cupom (opcional)<input name="coupon" autoCapitalize="characters" autoComplete="off" /></label>
        <div className="row"><button className="btn">Continuar</button></div>
      </form>
    </div>
  );
}
