import { legal } from '@/lib/legal';
import { ReviewNotice } from '../legal-notice';

export const metadata = { title: 'Termos de uso' };
export const dynamic = 'force-dynamic';

export default function Termos() {
  const l = legal();
  return (
    <article className="legal">
      <h1>Termos de uso</h1>
      <ReviewNotice reviewed={l.reviewed} />
      <p><strong>1. Quem somos.</strong> O Simulaki (simulaki.com) é uma plataforma de simulados para a prova teórica de habilitação, operada por {l.razao}, CNPJ {l.cnpj}, com sede em {l.endereco}.</p>
      <p><strong>2. Aceitação e cadastro.</strong> Ao criar uma conta ou usar o Simulaki, você concorda com estes termos. O cadastro exige informações verdadeiras e é pessoal e intransferível. O uso é destinado a maiores de 18 anos; menores só podem usar com autorização de um responsável legal.</p>
      <p><strong>3. Natureza do serviço.</strong> O Simulaki é uma ferramenta de estudo independente. Não temos vínculo com o Detran nem com qualquer órgão público e não garantimos aprovação em nenhuma prova. As questões são elaboradas por nós a partir da legislação de trânsito e de materiais oficiais, e não reproduzem provas reais.</p>
      <p><strong>4. Planos e pagamentos.</strong> O Simulaki oferece um acesso gratuito limitado e planos pagos, em formato de passe por período. Preço, duração e forma de cobrança aparecem antes da contratação. Os pagamentos por Pix são processados por um provedor de pagamentos; não armazenamos dados bancários.</p>
      <p><strong>5. Cancelamento e reembolso.</strong> Valem as regras da <a href="/reembolso">Política de reembolso e cancelamento</a>.</p>
      <p><strong>6. Uso permitido.</strong> É proibido compartilhar sua conta, copiar, revender ou extrair automaticamente o conteúdo, tentar burlar limites do plano ou usar a plataforma para fins ilegais.</p>
      <p><strong>7. Propriedade intelectual.</strong> Questões, textos, explicações, marca e software do Simulaki pertencem a {l.razao} ou a seus licenciantes. Você recebe apenas o direito de uso pessoal enquanto seu acesso estiver ativo.</p>
      <p><strong>8. Autoescolas e instrutores parceiros.</strong> Se você se vincular a uma autoescola ou instrutor parceiro, ele poderá ver seu desempenho de estudo no Simulaki (nº de simulados feitos e percentual de acertos). O vínculo depende do seu aceite e pode ser desfeito por você a qualquer momento.</p>
      <p><strong>9. Limitação de responsabilidade.</strong> Empregamos esforço para manter o conteúdo correto e atualizado, mas ele pode conter erros ou ficar desatualizado. Consulte sempre as fontes oficiais. Nos limites da lei, não respondemos por reprovação em provas nem por decisões tomadas com base no conteúdo.</p>
      <p><strong>10. Alterações.</strong> Podemos atualizar estes termos. Mudanças relevantes serão avisadas por e-mail ou na plataforma.</p>
      <p><strong>11. Lei aplicável e foro.</strong> Estes termos seguem a lei brasileira. Fica eleito o foro de {l.foro}, sem prejuízo do direito do consumidor de ajuizar ação no foro de seu domicílio.</p>
      <p className="muted">Dúvidas: {l.suporte}</p>
    </article>
  );
}
