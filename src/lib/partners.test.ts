import { describe, expect, it } from 'vitest';

process.env.PGLITE_DIR = 'memory://';
const { getDb, schema } = await import('@/db');
const { userHasAccess } = await import('./billing');
const { outbox } = await import('./email');
const P = await import('./partners');

let n = 0;
async function mkUser(email = `u${++n}@t.com`) {
  const db = await getDb();
  const [u] = await db.insert(schema.users).values({ emailVerifiedAt: new Date(), name: 'Fulano ' + n, email }).returning();
  return u!;
}
async function mkPartner(planSlug?: string) {
  const owner = await mkUser();
  const r = await P.createPartner({ name: 'CFC Centro', type: 'cfc', ownerEmail: owner.email, stateCode: 'am' });
  if (!r.ok) throw new Error(r.reason);
  if (planSlug) await P.grantOrgPlan(r.orgId, planSlug, 30);
  return { owner, orgId: r.orgId };
}

describe('parceiros', () => {
  it('criar parceiro exige que o responsável já tenha conta e o torna gestor', async () => {
    expect((await P.createPartner({ name: 'X Y', type: 'cfc', ownerEmail: 'naoexiste@t.com' })).ok).toBe(false);
    const { owner, orgId } = await mkPartner();
    expect(await P.isManager(owner.id, orgId)).toBe(true);
    expect((await P.managedOrg(owner.id))?.id).toBe(orgId);
    const db = await getDb();
    const [u] = await db.select().from(schema.users);
    expect(u).toBeDefined();
  });

  it('convite -> aluno aceita -> acesso completo pelo plano do parceiro; sai -> perde', async () => {
    const { owner, orgId } = await mkPartner('parceiro-start');
    const aluno = await mkUser();
    expect((await userHasAccess(aluno.id)).full).toBe(false);
    expect((await P.inviteStudent(owner.id, orgId, aluno.email.toUpperCase())).ok).toBe(true);
    expect(outbox.at(-1)!.to).toBe(aluno.email);
    expect((await userHasAccess(aluno.id)).full).toBe(false); // convidado ainda não conta: precisa aceitar
    const [inv] = await P.pendingInvitesFor(aluno.email);
    expect(inv!.orgName).toBe('CFC Centro');
    expect(await P.acceptInvite(aluno.id, aluno.email, inv!.id)).toBe('ok');
    const acc = await userHasAccess(aluno.id);
    expect(acc.full).toBe(true);
    expect(acc.viaPartner).toBe('CFC Centro');
    expect((await P.listStudents(orgId)).map((s) => s.email)).toEqual([aluno.email]);
    await P.leavePartner(aluno.id, orgId);
    expect((await userHasAccess(aluno.id)).full).toBe(false);
  });

  it('só aceita o convite quem tem aquele e-mail', async () => {
    const { owner, orgId } = await mkPartner('parceiro-start');
    const alvo = await mkUser();
    const intruso = await mkUser();
    await P.inviteStudent(owner.id, orgId, alvo.email);
    const [inv] = await P.pendingInvitesFor(alvo.email);
    expect(await P.acceptInvite(intruso.id, intruso.email, inv!.id)).toBe('not_found');
    expect((await userHasAccess(intruso.id)).full).toBe(false);
  });

  it('parceiro sem plano ativo não convida; plano vencido corta o acesso dos alunos', async () => {
    const { owner, orgId } = await mkPartner();
    const aluno = await mkUser();
    expect((await P.inviteStudent(owner.id, orgId, aluno.email)).ok).toBe(false);
    await P.grantOrgPlan(orgId, 'parceiro-start', 30);
    await P.inviteStudent(owner.id, orgId, aluno.email);
    const [inv] = await P.pendingInvitesFor(aluno.email);
    await P.acceptInvite(aluno.id, aluno.email, inv!.id);
    expect((await userHasAccess(aluno.id)).full).toBe(true);
    const db = await getDb();
    await db.update(schema.subscriptions).set({ endsAt: new Date(Date.now() - 1000) });
    expect((await userHasAccess(aluno.id)).full).toBe(false);
  });

  it('respeita o limite de alunos do plano (convites pendentes reservam vaga)', async () => {
    const { owner, orgId } = await mkPartner('parceiro-start'); // limite 50
    const db = await getDb();
    await db.insert(schema.orgInvites).values(Array.from({ length: 50 }, (_, i) => ({ organizationId: orgId, email: `fila${i}@t.com` })));
    const r = await P.inviteStudent(owner.id, orgId, 'mais1@t.com');
    expect(r).toEqual({ ok: false, reason: 'Limite de 50 alunos do plano atingido.' });
  });

  it('quem não é gestor do parceiro não convida, remove nem cancela', async () => {
    const { orgId } = await mkPartner('parceiro-start');
    const outro = await mkUser();
    expect((await P.inviteStudent(outro.id, orgId, 'x@t.com')).ok).toBe(false);
    expect(await P.removeStudent(outro.id, orgId, outro.id)).toBe(false);
    expect(await P.cancelInvite(outro.id, orgId, '00000000-0000-0000-0000-000000000000')).toBe(false);
  });

  it('gestor remove aluno e ele perde o acesso; estender plano soma dias', async () => {
    const { owner, orgId } = await mkPartner('parceiro-start');
    const aluno = await mkUser();
    await P.inviteStudent(owner.id, orgId, aluno.email);
    const [inv] = await P.pendingInvitesFor(aluno.email);
    await P.acceptInvite(aluno.id, aluno.email, inv!.id);
    expect(await P.removeStudent(owner.id, orgId, aluno.id)).toBe(true);
    expect((await userHasAccess(aluno.id)).full).toBe(false);
    await P.grantOrgPlan(orgId, 'parceiro-start', 30);
    const plan = await P.orgPlan(orgId);
    expect(Math.round((plan.endsAt!.getTime() - Date.now()) / 86_400_000)).toBe(60);
  });
});
