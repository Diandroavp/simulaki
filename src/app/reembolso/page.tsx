import { legal } from '@/lib/legal';
import { ReviewNotice } from '../legal-notice';

export const metadata = { title: 'Reembolso e cancelamento' };
export const dynamic = 'force-dynamic';

export default function Reembolso() {
  const l = legal();
  return (
    <article className="legal">
      <h1>Política de reembolso e cancelamento</h1>
      <ReviewNotice reviewed={l.reviewed} />
      <div className="tablewrap">
        <table>
          <thead><tr><th>Situação</th><th>Regra</th></tr></thead>
          <tbody>
            <tr><td>Passe por período (por exemplo, 60 dias)</td><td>Reembolso integral se pedido em até 7 dias corridos da compra, como direito de arrependimento em compra online. Depois disso, sem reembolso proporcional, salvo falha do serviço.</td></tr>
            <tr><td>Plano de autoescola ou instrutor</td><td>Combinado no contrato com o parceiro.</td></tr>
            <tr><td>Cobrança indevida ou em duplicidade</td><td>Estorno integral após conferência.</td></tr>
          </tbody>
        </table>
      </div>
      <p><strong>Como pedir.</strong> Escreva para {l.suporte} com o e-mail da conta e o motivo. Respondemos em até 5 dias úteis.</p>
      <p><strong>Como devolvemos.</strong> Pelo mesmo meio de pagamento usado na compra. No Pix, por transferência para a conta de origem.</p>
    </article>
  );
}
