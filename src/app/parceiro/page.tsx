import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { listInvites, listStudents, managedOrg, orgPlan } from '@/lib/partners';
import { cancelInviteAction, inviteAction, removeStudentAction } from './actions';

export const dynamic = 'force-dynamic';
const when = (d: Date | null) => (d ? d.toLocaleDateString('pt-BR', { timeZone: 'America/Manaus' }) : '-');

export default async function Parceiro({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/entrar');
  const org = await managedOrg(user!.id);
  if (!org) redirect('/');
  const { erro, ok } = await searchParams;
  const [plan, students, invites] = await Promise.all([orgPlan(org!.id), listStudents(org!.id), listInvites(org!.id)]);
  const limit = plan.plan?.studentLimit ?? 0;
  const used = students.length + invites.length;
  return (
    <>
      <h1>{org!.name}</h1>
      {plan.active ? (
        <p className="note">Plano <strong>{plan.plan?.name}</strong> ativo até {when(plan.endsAt)}. Vagas usadas: {used} de {limit} (convites pendentes reservam vaga).</p>
      ) : (
        <p className="note err">Plano inativo{plan.plan ? ` (${plan.plan.name} venceu em ${when(plan.endsAt)})` : ''}. Seus alunos ficam sem acesso completo até a renovação. Fale com o Simulaki.</p>
      )}

      <div className="card" style={{ marginBlock: 16 }}>
        <h2 style={{ marginTop: 0 }}>Convidar alunos</h2>
        {erro && <p className="err" role="alert">{erro}</p>}
        {ok && <p className="okmsg">{ok}</p>}
        <form action={inviteAction}>
          <label>E-mails (separe por vírgula, espaço ou linha)
            <textarea name="emails" rows={3} style={{ width: '100%', font: 'inherit', padding: 10, borderRadius: 10, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--fg)' }} />
          </label>
          <p className="muted">O aluno recebe um e-mail e só passa a contar (e a ter o desempenho visível para você) depois de aceitar o convite.</p>
          <div className="row"><button className="btn" disabled={!plan.active}>Enviar convites</button></div>
        </form>
      </div>

      <h2>Alunos ({students.length})</h2>
      <div className="card scroll">
        <table>
          <thead><tr><th>Nome</th><th>E-mail</th><th>Simulados</th><th>Acertos</th><th>Último</th><th></th></tr></thead>
          <tbody>
            {students.length === 0 && <tr><td colSpan={6} className="muted">Nenhum aluno ainda.</td></tr>}
            {students.map((s) => (
              <tr key={s.userId}>
                <td>{s.name}</td><td>{s.email}</td><td>{s.attempts}</td>
                <td>{s.accuracy === null ? '-' : `${s.accuracy}%`}</td><td>{when(s.last)}</td>
                <td><form action={removeStudentAction}><input type="hidden" name="userId" value={s.userId} /><button className="btn ghost" style={{ padding: '4px 10px' }}>Remover</button></form></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {invites.length > 0 && (
        <>
          <h2>Convites pendentes ({invites.length})</h2>
          <div className="card scroll">
            <table>
              <tbody>
                {invites.map((i) => (
                  <tr key={i.id}><td>{i.email}</td><td>{when(i.createdAt)}</td>
                    <td><form action={cancelInviteAction}><input type="hidden" name="inviteId" value={i.id} /><button className="btn ghost" style={{ padding: '4px 10px' }}>Cancelar</button></form></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
