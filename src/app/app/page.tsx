import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { FREE_PER_DAY, getOpenAttempt } from '@/lib/attempts';
import { desempenho } from '@/lib/desempenho';
import { userHasAccess } from '@/lib/billing';
import { resendVerificationAction } from '../actions';
import { acceptInviteAction, declineInviteAction, leavePartnerAction } from '../parceiro/actions';
import { partnersOf, pendingInvitesFor } from '@/lib/partners';
import { MUNDOS, mundoDeTipo } from '@/lib/mundos';
import { ensureOverrides } from '@/lib/question-overrides';
import { PageHero } from '../page-hero';
import { CopiarLink } from '../copiar-link';
import { codigoDe, resumoIndicacoes, REWARD_DAYS } from '@/lib/indicacao';

export const dynamic = 'force-dynamic';

export default async function Area({ searchParams }: { searchParams: Promise<{ cupom?: string; verifique?: string; verificado?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/entrar');
  await ensureOverrides();
  const { cupom, verifique, verificado } = await searchParams;
  const [access, open, invites, myPartners] = await Promise.all([userHasAccess(user.id), getOpenAttempt(user.id), user.emailVerified ? pendingInvitesFor(user.email) : Promise.resolve([]), partnersOf(user.id)]);
  const resumos = await Promise.all(MUNDOS.map((m) => desempenho(user.id, m.slug)));
  const [indic, codigoIndicacao] = await Promise.all([resumoIndicacoes(user.id), user.emailVerified ? codigoDe(user.id) : Promise.resolve('')]);

  return (
    <>
      <PageHero compact title={<>Olá, <em>{user.name.split(' ')[0]}</em></>} />
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
      {open && <p className="note">Você tem um simulado em andamento. <Link href={open.simulationType.startsWith('custom:') ? `/personalizado?mundo=${mundoDeTipo(open.simulationType)}&retomar=1` : `/simulado/${open.simulationType}`}>Continuar</Link></p>}
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
      <h2 style={{ marginTop: 20 }}>O que você vai estudar hoje?</h2>
      <div className="grid" style={{ marginBottom: 16 }}>
        {MUNDOS.map((m, i) => (
          <div className="card" key={m.slug}>
            <h3 style={{ marginTop: 0 }}>{m.emoji} {m.nome}</h3>
            <p className="muted" style={{ marginTop: 0 }}>{m.descricao}</p>
            {resumos[i]!.total > 0 && <p style={{ margin: '0 0 10px' }}><strong>{resumos[i]!.pct}%</strong> de acertos <span className="muted">· {resumos[i]!.total} questões</span></p>}
            <Link className="btn" href={`/app/${m.slug}`}>Entrar</Link>
          </div>
        ))}
      </div>
      <p className="soon muted">Em breve: PSC, SIS, OAB e outros.</p>

      {user.emailVerified && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Indique e ganhe {REWARD_DAYS} dias</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            Quando um amigo criar a conta pelo seu link e fizer o primeiro pagamento, você ganha {REWARD_DAYS} dias de acesso.
            {indic.amigos > 0 ? ` Até agora: ${indic.amigos} ${indic.amigos === 1 ? 'amigo entrou' : 'amigos entraram'}, ${indic.premiados} já ${indic.premiados === 1 ? 'rendeu' : 'renderam'} dias (${indic.dias} no total).` : ''}
            {indic.restantes === 0 ? ' Você já atingiu o limite de recompensas.' : ''}
          </p>
          <CopiarLink link={`${process.env.APP_URL ?? 'https://www.simulaki.com'}/cadastro?ref=${codigoIndicacao}`} />
        </div>
      )}

          <p className="muted"><Link href="/app/conta">Minha conta: baixar meus dados ou excluir</Link></p>
    </>
  );
}
