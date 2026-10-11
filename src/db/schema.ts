import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

// ---------- Enums ----------

export const userRole = pgEnum('user_role', ['student', 'partner_admin', 'staff', 'admin']);
export const orgType = pgEnum('org_type', ['cfc', 'instructor']);
export const membershipStatus = pgEnum('membership_status', ['invited', 'active', 'removed']);
export const planAudience = pgEnum('plan_audience', ['student', 'organization']);
export const billingKind = pgEnum('billing_kind', ['one_time', 'recurring']);
export const subscriptionStatus = pgEnum('subscription_status', [
  'trialing',
  'active',
  'past_due',
  'canceled',
  'expired',
]);
export const paymentStatus = pgEnum('payment_status', ['pending', 'paid', 'failed', 'refunded']);
export const questionStatus = pgEnum('question_status', [
  'draft',
  'reviewed',
  'published',
  'archived',
]);
export const questionTopic = pgEnum('question_topic', [
  'legislacao',
  'sinalizacao',
  'direcao_defensiva',
  'mecanica',
  'primeiros_socorros',
  'meio_ambiente_cidadania',
]);
export const reportStatus = pgEnum('report_status', ['open', 'accepted', 'rejected']);

// ---------- Usuários e organizações ----------

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    passwordHash: text('password_hash'), // null para contas só com Google
    googleSub: text('google_sub'),
    role: userRole('role').notNull().default('student'),
    stateCode: text('state_code'), // sigla do estado, ex.: 'RR'
    examDate: timestamp('exam_date', { withTimezone: true }),
    marketingConsent: boolean('marketing_consent').notNull().default(false),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [uniqueIndex('users_email_uq').on(t.email)],
);

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: orgType('type').notNull(),
  stateCode: text('state_code'),
  brandLogoUrl: text('brand_logo_url'),
  brandColor: text('brand_color'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const memberships = pgTable(
  'memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    role: text('role').notNull().default('student'), // 'student' | 'manager' (gestor do parceiro)
    status: membershipStatus('status').notNull().default('invited'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('memberships_user_org_uq').on(t.userId, t.organizationId),
    index('memberships_org_idx').on(t.organizationId),
  ],
);

// ---------- Planos, assinaturas e pagamentos ----------

export const plans = pgTable('plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  audience: planAudience('audience').notNull(),
  billing: billingKind('billing').notNull(),
  priceCents: integer('price_cents').notNull(),
  periodDays: integer('period_days'), // passe: duração em dias; recorrente: ciclo (30)
  studentLimit: integer('student_limit'), // só para planos de organização; null = ilimitado
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerUserId: uuid('owner_user_id').references(() => users.id),
    ownerOrgId: uuid('owner_org_id').references(() => organizations.id),
    planId: uuid('plan_id')
      .notNull()
      .references(() => plans.id),
    status: subscriptionStatus('status').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    pastDueSince: timestamp('past_due_since', { withTimezone: true }),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    gatewayId: text('gateway_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // cada assinatura pertence a um usuário OU a uma organização, nunca aos dois
    check(
      'subscriptions_one_owner',
      sql`(${t.ownerUserId} is not null) <> (${t.ownerOrgId} is not null)`,
    ),
    index('subscriptions_user_idx').on(t.ownerUserId),
    index('subscriptions_org_idx').on(t.ownerOrgId),
  ],
);

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    planId: uuid('plan_id')
      .notNull()
      .references(() => plans.id),
    subscriptionId: uuid('subscription_id').references(() => subscriptions.id),
    couponId: uuid('coupon_id').references(() => coupons.id),
    amountCents: integer('amount_cents').notNull(),
    method: text('method').notNull(), // 'pix' | 'card'
    status: paymentStatus('status').notNull().default('pending'),
    gatewayId: text('gateway_id'),
    pixCopyPaste: text('pix_copy_paste'),
    pixExpiresAt: timestamp('pix_expires_at', { withTimezone: true }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('payments_gateway_uq').on(t.gatewayId)],
);

// Eventos de webhook já processados: garante idempotência.
export const webhookEvents = pgTable(
  'webhook_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    provider: text('provider').notNull(),
    eventId: text('event_id').notNull(),
    payload: jsonb('payload').notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('webhook_events_uq').on(t.provider, t.eventId)],
);

export const coupons = pgTable('coupons', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  percentOff: integer('percent_off'),
  amountOffCents: integer('amount_off_cents'),
  freeDays: integer('free_days'), // cupom que libera N dias de acesso sem pagamento
  active: boolean('active').notNull().default(true),
  description: text('description'),
  validUntil: timestamp('valid_until', { withTimezone: true }),
  maxUses: integer('max_uses'),
  usedCount: integer('used_count').notNull().default(0),
  organizationId: uuid('organization_id').references(() => organizations.id), // indicação de parceiro
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// um usuário só resgata cada cupom uma vez
export const couponRedemptions = pgTable(
  'coupon_redemptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    couponId: uuid('coupon_id')
      .notNull()
      .references(() => coupons.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('coupon_redemptions_uq').on(t.couponId, t.userId)],
);

// ---------- Conteúdo ----------

export type QuestionOption = { id: string; text: string };

export const questions = pgTable(
  'questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    stateCode: text('state_code').notNull().default('BR'), // 'BR' = vale para todos
    topic: questionTopic('topic').notNull(),
    statement: text('statement').notNull(),
    imageUrl: text('image_url'),
    options: jsonb('options').$type<QuestionOption[]>().notNull(),
    correctOptionId: text('correct_option_id').notNull(),
    explanation: text('explanation'),
    legalRef: text('legal_ref'), // ex.: 'CTB, art. 167'
    status: questionStatus('status').notNull().default('draft'),
    version: integer('version').notNull().default(1),
    reviewedBy: text('reviewed_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('questions_state_topic_status_idx').on(t.stateCode, t.topic, t.status)],
);

export const attempts = pgTable(
  'attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    simulationType: text('simulation_type').notNull(), // 'detran-am', 'detran-sp', 'enem', ...
    totalCount: integer('total_count').notNull(),
    minCorrect: integer('min_correct'),
    durationMinutes: integer('duration_minutes'),
    questionIds: jsonb('question_ids').$type<string[]>(), // para retomar a mesma prova
    draftAnswers: jsonb('draft_answers').$type<Record<string, string>>(), // autosave
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    correctCount: integer('correct_count'),
    passed: boolean('passed'),
  },
  (t) => [index('attempts_user_idx').on(t.userId, t.startedAt)],
);

// questionId é o id do conteúdo (ex.: 'am-sin-0002'); sem FK enquanto as questões vivem em arquivos.
export const attemptAnswers = pgTable(
  'attempt_answers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    attemptId: uuid('attempt_id')
      .notNull()
      .references(() => attempts.id),
    questionId: text('question_id').notNull(),
    topic: text('topic').notNull(),
    selectedOptionId: text('selected_option_id'),
    isCorrect: boolean('is_correct').notNull(),
  },
  (t) => [
    uniqueIndex('attempt_answers_uq').on(t.attemptId, t.questionId),
    index('attempt_answers_question_idx').on(t.questionId),
  ],
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    tokenHash: text('token_hash').notNull(), // SHA-256 do token do cookie; o token em si nunca é salvo
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('sessions_token_uq').on(t.tokenHash)],
);

export const questionReports = pgTable('question_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  questionId: uuid('question_id')
    .notNull()
    .references(() => questions.id),
  userId: uuid('user_id').references(() => users.id),
  reason: text('reason').notNull(),
  status: reportStatus('status').notNull().default('open'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id').references(() => users.id),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: text('entity_id'),
  before: jsonb('before'),
  after: jsonb('after'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Falhas de login recentes, para limitar tentativas por e-mail (chave = e-mail em minúsculas).
export const loginFailures = pgTable(
  'login_failures',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: text('key').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('login_failures_key_idx').on(t.key, t.createdAt)],
);

// Token de acesso do gateway (a Canvi invalida o token anterior a cada login, então um só token compartilhado).
export const gatewayTokens = pgTable('gateway_tokens', {
  provider: text('provider').primaryKey(),
  token: text('token').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Convite de parceiro por e-mail: o aluno só passa a contar como membro depois de aceitar (LGPD).
export const orgInvites = pgTable(
  'org_invites',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    email: text('email').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('org_invites_uq').on(t.organizationId, t.email)],
);

export const passwordResets = pgTable(
  'password_resets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    tokenHash: text('token_hash').notNull(), // SHA-256; o token só existe no e-mail
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('password_resets_token_uq').on(t.tokenHash)],
);

export const waitlist = pgTable(
  'waitlist',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    profile: text('profile'),
    consent: boolean('consent').notNull().default(false),
    source: text('source'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('waitlist_email_uq').on(t.email)],
);

export const emailVerifications = pgTable(
  'email_verifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    tokenHash: text('token_hash').notNull(), // SHA-256; o token só existe no e-mail
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('email_verifications_token_uq').on(t.tokenHash)],
);

// Avisos de erro em questões (as questões vêm dos arquivos JSON, por isso o id é texto).
export const questionFeedback = pgTable(
  'question_feedback',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    questionId: text('question_id').notNull(),
    userId: uuid('user_id').references(() => users.id),
    reason: text('reason').notNull(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('question_feedback_q_idx').on(t.questionId)],
);
