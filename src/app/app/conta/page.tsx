import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { deleteAccountAction } from '../../actions';
import { MOTIVOS_EXCLUSAO } from '@/lib/motivos-exclusao';

export const dynamic = 'force-dynamic';

export default async function Conta({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/entrar');
  const { erro } = await searchParams;
  return (
    <div style={{ maxWidth: 560 }}>
      <h1>Minha conta</h1>
      <p className="muted">{user.name} · {user.email}</p>
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Baixar meus dados</h2>
        <p>Receba uma cópia dos seus dados (cadastro, simulados, respostas e pagamentos) em um arquivo.</p>
        <a className="btn ghost" href="/api/conta/exportar">Baixar arquivo</a>
      </div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Excluir minha conta</h2>
        <p>Seu nome, e-mail e acesso são apagados e não podem ser recuperados. Registros de pagamento ficam guardados sem identificação pessoal, como exige a lei fiscal. Assinaturas ativas não são reembolsadas automaticamente: veja a <Link href="/reembolso">política de reembolso</Link> antes.</p>
        {erro && <p className="err" role="alert">{erro}</p>}
        <form action={deleteAccountAction}>
          <label>Por que você está saindo? (opcional, anônimo)
            <select name="motivo" defaultValue="">
              <option value="">Prefiro não dizer</option>
              {MOTIVOS_EXCLUSAO.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </label>
          <label>Quer contar mais? (opcional)<textarea name="detalhe" maxLength={500} rows={3} placeholder="Não coloque dados pessoais" /></label>
          <label>Digite EXCLUIR para confirmar<input name="confirm" autoComplete="off" required /></label>
          <div className="row"><button className="btn ghost">Excluir minha conta</button></div>
        </form>
      </div>
    </div>
  );
}
