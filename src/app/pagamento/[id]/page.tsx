import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { and, eq } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { canSimulatePayments } from '@/lib/billing';
import { simulatePaymentAction } from '../../actions';
import Poller from './poller';

export const dynamic = 'force-dynamic';
const brl = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default async function Pagamento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) notFound();
  const db = await getDb();
  const [pay] = await db.select().from(schema.payments).where(and(eq(schema.payments.id, id), eq(schema.payments.userId, user.id))).limit(1);
  if (!pay) notFound();

  if (pay.status === 'paid') {
    return (
      <div className="card" style={{ maxWidth: 480, margin: '24px auto' }}>
        <h1 style={{ marginTop: 0 }}>Pagamento confirmado</h1>
        <p>Seu acesso ilimitado já está liberado.</p>
        <a className="btn" href="/app">Ir para minha área</a>
      </div>
    );
  }
  const expired = !!pay.pixExpiresAt && pay.pixExpiresAt < new Date();
  const qr = pay.pixCopyPaste ? await QRCode.toDataURL(pay.pixCopyPaste, { margin: 1, width: 240 }) : null;
  const mock = canSimulatePayments();
  return (
    <div className="card" style={{ maxWidth: 480, margin: '24px auto' }}>
      <h1 style={{ marginTop: 0 }}>Pague com Pix</h1>
      <p className="price">{brl(pay.amountCents)}</p>
      {expired ? (
        <p className="err">Este Pix expirou. <a href="/planos">Gerar um novo</a></p>
      ) : (
        <>
          {qr && <img src={qr} alt="QR Code do Pix" width={240} height={240} />}
          <p className="muted">Abra o app do seu banco, escolha Pix e leia o QR Code ou use o Pix copia e cola:</p>
          <div className="code">{pay.pixCopyPaste}</div>
          <p className="muted">Assim que o pagamento for confirmado, esta página libera seu acesso sozinha.</p>
          <Poller paymentId={pay.id} />
        </>
      )}
      {mock && (
        <form action={simulatePaymentAction} className="note" style={{ marginTop: 16 }}>
          <strong>Ambiente de teste.</strong> Nenhum dinheiro de verdade é movido.
          <input type="hidden" name="paymentId" value={pay.id} />
          <div className="row"><button className="btn ghost">Simular pagamento</button></div>
        </form>
      )}
    </div>
  );
}
