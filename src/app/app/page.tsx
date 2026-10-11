import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { FREE_PER_DAY, getOpenAttempt, getStats } from '@/lib/attempts';
import { userHasAccess } from '@/lib/billing';
import { resendVerificationAction } from '../actions';
import { acceptInviteAction, declineInviteAction, leavePartnerAction } from '../parceiro/actions';
import { partnersOf, pendingInvitesFor } from '@/lib/partners';
import { getSimulation, isAvailable, SIMULATIONS } from '@/lib/simulations';

export const dynamic = 'force-dynamic';
const TOPICS: Record<string, string> = {
  legislacao: 'Legislação', sinalizacao: 'Sinalização', direcao_defensiva: 'Direção defensiva',
  mecanica: 'Mecânica', primeiros_socorros: 'Primeiros socorros', meio_ambiente_cidadania: 'Meio ambiente e cidadania',
};
const fmtDate = (d: Date | null) => (d ? d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Manaus' }) : '');

export default async function Area({ searchParams }: { searchParams: Promise<{ cupom?: string; verifique?: string; verificado?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/entrar');
  const { cupom, verifique, verificado } = await searchParams;
  const [{ stats, history }, access, open, invites, myPartners] = await Promise.all([getStats(user.id), userHasAccess(user.id), getOpenAttempt(user.id), user.emailVerified ? pendingInvitesFor(user.email) : Promise.resolve([]), partnersOf(user.id)]);
  const totalAnswered = [...stats.values()].reduce((a, s) => a + s.answered, 0);
  const totalCorrect = [...stats.values()].reduce((a, s) => a + s.correct, 0);
  const overall = totalAnswered ? Math.round((totalCorrect / totalAnswered) * 100) : null;

  return (
    <>
      <h1>Olá, {user.name.split(' ')[0]}</h1>
      {verificado === '1' && <p className="okmsg">E-mail confirmado. Obrigado!</p>}
      {!user.emailVerified && (
        <div className="card" style={{ marginBottom: 12 }}>
          <p style={{ marginTop: 0 }}>
            <strong>Confirme seu e-mail.</strong> Enviamos um link para {user.email}. Sem a confirmação você pode fazer o simulado grátis do dia, mas não pode assinar, usar cupom nem aceitar convites.
            {verifique === 'limite' && ' Você pediu muitos envios; tente de novo em uma hora.'}
          </p>
          <form action={resendVerificationAction}><button className="btn ghost">Reenviar e-mail de confirmação</button></form>
        </div>
      )}
      {cupom === 'ok' && <p className="okmsg">Cupom aplicado! Seu acesso foi liberado.</p>}
      {invites.map((i) => (
        <div className="card" key={i.id} style={{ marginBottom: 12 }}>
          <p style={{ marginTop: 0 }}><strong>{i.orgName}</strong> convidou você para estudar com acesso completo, sem custo para você. Ao aceitar, a autoescola poderá ver seu desempenho (nº de simulados e % de acertos). Você pode sair quando quiser.</p>
          <div className="row">
            <form action={acceptInviteAction}><input type="hidden" name="inviteId" value={i.id} /><button className="btn">Aceitar convite</button></form>
            <form action={declineInviteAction}><input type="hidden" name="inviteId" value={i.id} /><button className="btn ghost">Recusar</button></form>
          </div>
        </div>
      ))}
      {open && <p className="note">Você tem um simulado em andamento. <Link href={`/simulado/${open.simulationType}`}>Continuar</Link></p>}
      {access.full ? (
        access.viaPartner ? (
          <p className="note">Acesso completo por meio de <strong>{access.viaPartner}</strong>.</p>
        ) : (
          <p className="note">Assinatura ativa até {access.endsAt?.toLocaleDateString('pt-BR', { timeZone: 'America/Manaus' })}. <Link href="/planos">Estender</Link></p>
        )
      ) : (
        <p className="note">Plano grátis: {FREE_PER_DAY} simulado por dia. <Link href="/planos">Assinar para fazer ilimitados</Link></p>
      )}

      {myPartners.map((p) => (
        <form action={leavePartnerAction} key={p.orgId} className="muted">
          <input type="hidden" name="orgId" value={p.orgId} />Você é aluno(a) de {p.name}. <button className="btn ghost" style={{ padding: '2px 10px' }}>Sair deste vínculo</button>
        </form>
      ))}
      <div className="grid" style={{ marginBlock: 16 }}>
        <div className="card"><div className="muted">Questões resolvidas</div><div className="price">{totalAnswered}</div></div>
        <div className="card"><div className="muted">Percentual de acertos</div><div className="price">{overall === null ? '-' : `${overall}%`}</div></div>
        <div className="card"><div className="muted">Simulados feitos</div><div className="price">{[...stats.values()].reduce((a, s) => a + s.attempts, 0)}</div></div>
      </div>

      <h2>Por simulado</h2>
      <div className="grid">
        {SIMULATIONS.map((sim) => {
          const s = stats.get(sim.slug);
          const on = isAvailable(sim);
          return (
            <div className="card" key={sim.slug}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <h3 style={{ margin: 0 }}>{sim.name}</h3>
                <span className={`badge ${on ? 'on' : ''}`}>{on ? 'Disponível' : 'Em breve'}</span>
              </div>
              {s ? (
                <>
                  <p style={{ margin: '12px 0 4px' }}><strong>{s.accuracy}%</strong> de acertos <span className="muted">({s.correct}/{s.answered} questões em {s.attempts} {s.attempts === 1 ? 'simulado' : 'simulados'})</span></p>
                  <div className="meter" aria-hidden><i style={{ width: `${s.accuracy}%` }} /></div>
                  <p className="muted" style={{ marginBottom: 4 }}>Aprovações: {s.passes} de {s.attempts}</p>
                  {s.byTopic.length > 0 && (
                    <details><summary className="muted">Por tema</summary>
                      <ul>{s.byTopic.map((t) => <li key={t.topic}>{TOPICS[t.topic] ?? t.topic}: {Math.round((t.correct / t.answered) * 100)}% ({t.correct}/{t.answered})</li>)}</ul>
                    </details>
                  )}
                </>
              ) : (
                <p className="muted">Você ainda não fez este simulado.</p>
              )}
              {on && <div className="row"><Link className="btn" href={`/simulado/${sim.slug}`}>Fazer simulado</Link></div>}
            </div>
          );
        })}
      </div>

      <h2>Histórico</h2>
      {history.length === 0 ? (
        <p className="muted">Quando você finalizar um simulado, ele aparece aqui.</p>
      ) : (
        <div className="card scroll">
          <table>
            <thead><tr><th>Data</th><th>Simulado</th><th>Acertos</th><th>%</th><th>Resultado</th></tr></thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td>{fmtDate(h.finishedAt)}</td>
                  <td>{getSimulation(h.simulationType)?.name ?? h.simulationType}</td>
                  <td>{h.correctCount}/{h.totalCount}</td>
                  <td>{h.totalCount ? Math.round(((h.correctCount ?? 0) / h.totalCount) * 100) : 0}%</td>
                  <td>{h.passed ? 'Aprovado' : 'Reprovado'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
