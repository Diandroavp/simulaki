import { legal } from '@/lib/legal';
import { ReviewNotice } from '../legal-notice';

export const metadata = { title: 'Política de privacidade | Simulaki' };
export const dynamic = 'force-dynamic';

export default function Privacidade() {
  const l = legal();
  return (
    <article className="legal">
      <h1>Política de privacidade</h1>
      <ReviewNotice reviewed={l.reviewed} />
      <p><strong>Quem é responsável.</strong> {l.razao}, CNPJ {l.cnpj}, é a controladora dos dados pessoais tratados pelo Simulaki. Contato do encarregado: {l.encarregado}.</p>
      <div className="tablewrap">
        <table>
          <thead><tr><th>Dados</th><th>Para que usamos</th><th>Base legal</th></tr></thead>
          <tbody>
            <tr><td>Nome, e-mail, estado, data da prova</td><td>Criar a conta, entregar o serviço, montar seu plano de estudo</td><td>Execução de contrato</td></tr>
            <tr><td>Respostas, notas, tempo de resposta</td><td>Mostrar seu desempenho e estatísticas</td><td>Execução de contrato</td></tr>
            <tr><td>Dados de pagamento (valor, método, status)</td><td>Cobrar, emitir recibo e cumprir obrigações fiscais</td><td>Execução de contrato e obrigação legal</td></tr>
            <tr><td>E-mail para avisos e novidades</td><td>Enviar comunicações sobre o lançamento e o produto</td><td>Consentimento (você pode retirar a qualquer momento)</td></tr>
            <tr><td>IP, dispositivo, registros de acesso</td><td>Segurança, prevenção a fraude e limite de tentativas de login</td><td>Legítimo interesse</td></tr>
          </tbody>
        </table>
      </div>
      <p><strong>Com quem compartilhamos.</strong> Provedor de pagamentos (Pix), hospedagem e banco de dados, envio de e-mail, sempre para operar o serviço. Se você aceitar o convite de uma autoescola ou instrutor, ele vê seu desempenho de estudo (nº de simulados e percentual de acertos). Não vendemos dados pessoais.</p>
      <p><strong>Por quanto tempo guardamos.</strong> Enquanto sua conta estiver ativa e, depois, pelo prazo necessário para cumprir obrigações legais e defender direitos. Você pode pedir a exclusão da conta.</p>
      <p><strong>Seus direitos.</strong> Pela LGPD você pode pedir confirmação do tratamento, acesso, correção, anonimização ou eliminação de dados desnecessários, portabilidade, informação sobre compartilhamento e a revogação do consentimento. Escreva para {l.encarregado}.</p>
      <p><strong>Segurança.</strong> Usamos medidas técnicas e organizacionais para proteger os dados, como conexão criptografada, senhas armazenadas com hash e controle de acesso.</p>
      <p><strong>Cookies.</strong> Usamos apenas um cookie necessário para manter você conectado. Não usamos cookies de publicidade.</p>
      <p><strong>Menores de 18 anos.</strong> O serviço é voltado a maiores de 18 anos. O tratamento de dados de menores exige o consentimento de um responsável.</p>
      <p><strong>Mudanças.</strong> Esta política pode ser atualizada; avisaremos sobre mudanças relevantes.</p>
    </article>
  );
}
