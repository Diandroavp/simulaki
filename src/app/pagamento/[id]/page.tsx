import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { and, eq } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { canSimulatePayments } from '@/lib/billing';
import { legal } from '@/lib/legal';
import { simulatePaymentAction } from '../../actions';
import { PageHero } from '../../page-hero';
import Poller, { CopyPix, Countdown } from './poller';

export const dynamic = 'force-dynamic';
const brl = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function Steps({ at }: { at: 1 | 2 | 3 }) {
  const items = ['Escolher o plano', 'Pagar com Pix', 'Acesso liberado'];
  return (
    <ol className="cksteps" aria-label="Etapas">
      {items.map((t, i) => {
        const n = i + 1;
        const state = n < at ? 'done' : n === at ? 'now' : '';
        return (
          <li key={t} className={state} aria-current={n === at ? 'step' : undefined}>
            <span className="sn">{n < at ? '✓' : n}</span>
            <span>{t}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default async function Pagamento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) notFound();
  const db = await getDb();
  const [row] = await db
    .select({ pay: schema.payments, plan: schema.plans })
    .from(schema.payments)
    .innerJoin(schema.plans, eq(schema.plans.id, schema.payments.planId))
    .where(and(eq(schema.payments.id, id), eq(schema.payments.userId, user.id)))
    .limit(1);
  if (!row) notFound();
  const { pay, plan } = row;

  if (pay.status === 'paid') {
    return (
      <>
        <PageHero compact title={<>Pagamento <em>confirmado</em></>} lead="Seu acesso ilimitado já está liberado." />
        <div className="payok">
          <Steps at={3} />
          <div className="card center">
            <div className="check" aria-hidden>✓</div>
            <h2>Tudo certo, bons estudos!</h2>
            <p className="muted">{plan.name} ativo. Você já pode fazer simulados sem limite.</p>
            <a className="btn" href="/app">Ir para minha área</a>
          </div>
        </div>
      </>
    );
  }

  const expired = !!pay.pixExpiresAt && pay.pixExpiresAt < new Date();
  const qr = pay.pixCopyPaste ? await QRCode.toDataURL(pay.pixCopyPaste, { margin: 1, width: 280 }) : null;
  const mock = canSimulatePayments();
  return (
    <>
      <PageHero compact title={<>Falta só o <em>Pix</em></>} lead="Pague e o acesso é liberado na hora, sem precisar enviar comprovante." />
      <div className="checkout">
        <Steps at={2} />
        <div className="co-grid">
          <section className="card co-pay" aria-labelledby="pix-t">
            {expired || !pay.pixCopyPaste ? (
              <div className="center">
                <h2 id="pix-t">Este Pix expirou</h2>
                <p className="muted">Por segurança, o código vale por pouco tempo. Gere um novo e pague em seguida.</p>
                <a className="btn" href="/planos">Gerar novo Pix</a>
              </div>
            ) : (
              <>
                <h2 id="pix-t">Escaneie ou copie</h2>
                {qr && <img className="qr" src={qr} alt="QR Code do Pix" width={240} height={240} />}
                {pay.pixExpiresAt && <p className="muted center" style={{ margin: '4px 0 14px' }}><Countdown until={pay.pixExpiresAt.toISOString()} /></p>}
                <CopyPix code={pay.pixCopyPaste} />
                <details className="codebox">
                  <summary>Ver código</summary>
                  <div className="code" id="pix-code">{pay.pixCopyPaste}</div>
                </details>
                <Poller paymentId={pay.id} suporte={legal().suporte} />
              </>
            )}
            {mock && (
              <form action={simulatePaymentAction} className="note" style={{ marginTop: 16 }}>
                <strong>Ambiente de teste.</strong> Nenhum dinheiro de verdade é movido.
                <input type="hidden" name="paymentId" value={pay.id} />
                <div className="row"><button className="btn ghost">Simular pagamento</button></div>
              </form>
            )}
          </section>
          <aside className="co-side">
            <div className="card">
              <p className="eyebrow-s">Seu pedido</p>
              <div className="sumrow"><span>{plan.name}</span><strong>{brl(pay.amountCents)}</strong></div>
              {plan.periodDays && <p className="muted" style={{ margin: '4px 0 0' }}>Acesso por {plan.periodDays} dias, sem renovação automática.</p>}
              <hr />
              <div className="sumrow total"><span>Total no Pix</span><strong>{brl(pay.amountCents)}</strong></div>
            </div>
            <div className="card how">
              <p className="eyebrow-s">Como pagar</p>
              <ol>
                <li>Abra o app do seu banco e escolha <b>Pix</b>.</li>
                <li>Leia o QR Code ou use <b>Pix copia e cola</b>.</li>
                <li>Confira o valor e confirme. Pronto, seu acesso é liberado aqui.</li>
              </ol>
              <p className="muted" style={{ margin: '10px 0 0' }}>Recebedor: Canvi Intermediação e Agenciamento. Pagamento seguro pelo Banco Central.</p>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
