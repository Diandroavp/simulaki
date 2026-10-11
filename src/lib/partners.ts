import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { getDb, schema, type Db } from '@/db';
import { canInviteStudent, isSubscriptionActive } from './access';
import { sendEmail } from './email';

const DAY = 86_400_000;
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function isManager(userId: string, orgId: string): Promise<boolean> {
  const db = await getDb();
  const [m] = await db
    .select({ id: schema.memberships.id })
    .from(schema.memberships)
    .where(and(eq(schema.memberships.userId, userId), eq(schema.memberships.organizationId, orgId), eq(schema.memberships.role, 'manager'), eq(schema.memberships.status, 'active')))
    .limit(1);
  return !!m;
}

export async function managedOrg(userId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ org: schema.organizations })
    .from(schema.memberships)
    .innerJoin(schema.organizations, eq(schema.organizations.id, schema.memberships.organizationId))
    .where(and(eq(schema.memberships.userId, userId), eq(schema.memberships.role, 'manager'), eq(schema.memberships.status, 'active')))
    .limit(1);
  return row?.org ?? null;
}

/** Plano vigente do parceiro (a assinatura ativa mais longa) e o limite de alunos dele. */
export async function orgPlan(orgId: string) {
  const db = await getDb();
  const rows = await db
    .select({ sub: schema.subscriptions, plan: schema.plans })
    .from(schema.subscriptions)
    .innerJoin(schema.plans, eq(schema.plans.id, schema.subscriptions.planId))
    .where(eq(schema.subscriptions.ownerOrgId, orgId))
    .orderBy(desc(schema.subscriptions.endsAt));
  const now = new Date();
  const active = rows.find((r) => isSubscriptionActive({ status: r.sub.status, endsAt: r.sub.endsAt, pastDueSince: r.sub.pastDueSince }, now));
  return active ? { active: true as const, plan: active.plan, endsAt: active.sub.endsAt } : { active: false as const, plan: rows[0]?.plan ?? null, endsAt: rows[0]?.sub.endsAt ?? null };
}

async function seatsUsed(db: Db | Tx, orgId: string): Promise<number> {
  const [a] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.memberships)
    .where(and(eq(schema.memberships.organizationId, orgId), eq(schema.memberships.role, 'student'), eq(schema.memberships.status, 'active')));
  const [b] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.orgInvites).where(eq(schema.orgInvites.organizationId, orgId));
  return (a?.n ?? 0) + (b?.n ?? 0); // convites pendentes também reservam vaga
}

// ---------- administração (staff) ----------

export async function createPartner(input: { name: string; type: 'cfc' | 'instructor'; ownerEmail: string; stateCode?: string }) {
  const name = input.name.trim();
  const email = input.ownerEmail.trim().toLowerCase();
  if (name.length < 2) return { ok: false as const, reason: 'Informe o nome do parceiro.' };
  if (!EMAIL.test(email)) return { ok: false as const, reason: 'E-mail do responsável inválido.' };
  const db = await getDb();
  const [owner] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (!owner) return { ok: false as const, reason: 'O responsável precisa criar a conta no Simulaki primeiro.' };
  return db.transaction(async (tx) => {
    const [org] = await tx.insert(schema.organizations).values({ name, type: input.type, stateCode: input.stateCode?.toUpperCase() || null }).returning();
    await tx.insert(schema.memberships).values({ userId: owner.id, organizationId: org!.id, role: 'manager', status: 'active' });
    if (owner.role === 'student') await tx.update(schema.users).set({ role: 'partner_admin' }).where(eq(schema.users.id, owner.id));
    return { ok: true as const, orgId: org!.id };
  });
}

/** Libera (ou estende) o plano de um parceiro por N dias. A cobrança do parceiro ainda é manual. */
export async function grantOrgPlan(orgId: string, planSlug: string, days: number) {
  const db = await getDb();
  const [plan] = await db.select().from(schema.plans).where(and(eq(schema.plans.slug, planSlug), eq(schema.plans.audience, 'organization'))).limit(1);
  if (!plan) return { ok: false as const, reason: 'Plano de parceiro não encontrado.' };
  if (!Number.isInteger(days) || days < 1 || days > 366) return { ok: false as const, reason: 'Dias: de 1 a 366.' };
  const now = new Date();
  const cur = await orgPlan(orgId);
  const startsAt = cur.active && cur.endsAt && cur.endsAt > now ? cur.endsAt : now;
  await db.insert(schema.subscriptions).values({ ownerOrgId: orgId, planId: plan.id, status: 'active', startsAt, endsAt: new Date(startsAt.getTime() + days * DAY) });
  return { ok: true as const };
}

// ---------- painel do parceiro ----------

export async function inviteStudent(managerId: string, orgId: string, rawEmail: string) {
  if (!(await isManager(managerId, orgId))) return { ok: false as const, reason: 'Sem permissão.' };
  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL.test(email)) return { ok: false as const, reason: 'E-mail inválido.' };
  const db = await getDb();
  const plan = await orgPlan(orgId);
  if (!plan.active) return { ok: false as const, reason: 'O plano do parceiro está inativo. Fale com o Simulaki.' };
  const [existing] = await db
    .select({ id: schema.memberships.id })
    .from(schema.memberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.memberships.userId))
    .where(and(eq(schema.users.email, email), eq(schema.memberships.organizationId, orgId), eq(schema.memberships.status, 'active')))
    .limit(1);
  if (existing) return { ok: false as const, reason: 'Esta pessoa já é aluna do parceiro.' };
  const used = await seatsUsed(db, orgId);
  if (!canInviteStudent({ studentLimit: plan.plan?.studentLimit ?? 0, activeStudents: used })) {
    return { ok: false as const, reason: `Limite de ${plan.plan?.studentLimit} alunos do plano atingido.` };
  }
  const ins = await db.insert(schema.orgInvites).values({ organizationId: orgId, email }).onConflictDoNothing().returning({ id: schema.orgInvites.id });
  if (ins.length === 0) return { ok: false as const, reason: 'Este e-mail já foi convidado.' };
  const [org] = await db.select().from(schema.organizations).where(eq(schema.organizations.id, orgId)).limit(1);
  await sendEmail({
    to: email,
    subject: `${org?.name} convidou você para o Simulaki`,
    text: `${org?.name} convidou você para estudar com acesso completo ao Simulaki, sem custo para você.\n\nEntre (ou crie sua conta grátis) com este e-mail e aceite o convite em "Minha área":\n${process.env.APP_URL ?? 'http://localhost:3000'}/app\n\nAo aceitar, a autoescola poderá ver seu desempenho nos simulados (quantidade de simulados e percentual de acertos). Você pode sair quando quiser.`,
  });
  return { ok: true as const };
}

export async function cancelInvite(managerId: string, orgId: string, inviteId: string) {
  if (!(await isManager(managerId, orgId))) return false;
  const db = await getDb();
  await db.delete(schema.orgInvites).where(and(eq(schema.orgInvites.id, inviteId), eq(schema.orgInvites.organizationId, orgId)));
  return true;
}

export async function removeStudent(managerId: string, orgId: string, studentId: string) {
  if (!(await isManager(managerId, orgId))) return false;
  const db = await getDb();
  await db
    .update(schema.memberships)
    .set({ status: 'removed' })
    .where(and(eq(schema.memberships.organizationId, orgId), eq(schema.memberships.userId, studentId), eq(schema.memberships.role, 'student')));
  return true;
}

export async function listStudents(orgId: string) {
  const db = await getDb();
  const rows = await db
    .select({
      userId: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      attempts: sql<number>`count(${schema.attempts.id}) filter (where ${schema.attempts.finishedAt} is not null)::int`,
      correct: sql<number>`coalesce(sum(${schema.attempts.correctCount}) filter (where ${schema.attempts.finishedAt} is not null),0)::int`,
      total: sql<number>`coalesce(sum(${schema.attempts.totalCount}) filter (where ${schema.attempts.finishedAt} is not null),0)::int`,
      last: sql<Date | null>`max(${schema.attempts.finishedAt})`,
    })
    .from(schema.memberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.memberships.userId))
    .leftJoin(schema.attempts, eq(schema.attempts.userId, schema.users.id))
    .where(and(eq(schema.memberships.organizationId, orgId), eq(schema.memberships.role, 'student'), eq(schema.memberships.status, 'active')))
    .groupBy(schema.users.id, schema.users.name, schema.users.email)
    .orderBy(schema.users.name);
  return rows.map((r) => ({ ...r, accuracy: r.total ? Math.round((r.correct / r.total) * 100) : null, last: r.last ? new Date(r.last) : null }));
}

export async function listInvites(orgId: string) {
  const db = await getDb();
  return db.select().from(schema.orgInvites).where(eq(schema.orgInvites.organizationId, orgId)).orderBy(desc(schema.orgInvites.createdAt));
}

// ---------- lado do aluno ----------

export async function pendingInvitesFor(email: string) {
  const db = await getDb();
  return db
    .select({ id: schema.orgInvites.id, orgName: schema.organizations.name })
    .from(schema.orgInvites)
    .innerJoin(schema.organizations, eq(schema.organizations.id, schema.orgInvites.organizationId))
    .where(eq(schema.orgInvites.email, email.toLowerCase()));
}

export async function acceptInvite(userId: string, userEmail: string, inviteId: string) {
  const db = await getDb();
  const [who] = await db.select({ v: schema.users.emailVerifiedAt }).from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  if (!who?.v) return 'unverified' as const; // o convite é por e-mail: só quem provou o e-mail pode aceitar
  return db.transaction(async (tx) => {
    const [inv] = await tx.select().from(schema.orgInvites).where(and(eq(schema.orgInvites.id, inviteId), eq(schema.orgInvites.email, userEmail.toLowerCase()))).limit(1);
    if (!inv) return 'not_found' as const;
    await tx.delete(schema.orgInvites).where(eq(schema.orgInvites.id, inv.id));
    await tx
      .insert(schema.memberships)
      .values({ userId, organizationId: inv.organizationId, role: 'student', status: 'active' })
      .onConflictDoUpdate({ target: [schema.memberships.userId, schema.memberships.organizationId], set: { status: 'active' } });
    return 'ok' as const;
  });
}

export async function declineInvite(userEmail: string, inviteId: string) {
  const db = await getDb();
  await db.delete(schema.orgInvites).where(and(eq(schema.orgInvites.id, inviteId), eq(schema.orgInvites.email, userEmail.toLowerCase())));
}

export async function leavePartner(userId: string, orgId: string) {
  const db = await getDb();
  await db
    .update(schema.memberships)
    .set({ status: 'removed' })
    .where(and(eq(schema.memberships.userId, userId), eq(schema.memberships.organizationId, orgId), eq(schema.memberships.role, 'student')));
}

export async function partnersOf(userId: string) {
  const db = await getDb();
  return db
    .select({ orgId: schema.organizations.id, name: schema.organizations.name })
    .from(schema.memberships)
    .innerJoin(schema.organizations, eq(schema.organizations.id, schema.memberships.organizationId))
    .where(and(eq(schema.memberships.userId, userId), eq(schema.memberships.role, 'student'), eq(schema.memberships.status, 'active')));
}


