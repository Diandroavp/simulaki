/**
 * Regra única de acesso ao conteúdo completo.
 * Calculada sempre no servidor; o webhook do gateway é a única fonte de verdade de pagamento.
 */

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';

export type SubscriptionLike = {
  status: SubscriptionStatus;
  endsAt: Date | null;
  pastDueSince?: Date | null;
};

/** Dias de tolerância depois que uma cobrança recorrente falha. */
export const PAST_DUE_GRACE_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

export function isSubscriptionActive(sub: SubscriptionLike, now: Date): boolean {
  switch (sub.status) {
    case 'active':
    case 'trialing':
      return sub.endsAt === null || sub.endsAt.getTime() > now.getTime();
    case 'past_due': {
      if (!sub.pastDueSince) return false;
      const graceEnd = sub.pastDueSince.getTime() + PAST_DUE_GRACE_DAYS * DAY_MS;
      return graceEnd > now.getTime();
    }
    case 'canceled':
      // Cancelar mantém o acesso até o fim do período já pago.
      return sub.endsAt !== null && sub.endsAt.getTime() > now.getTime();
    case 'expired':
      return false;
  }
}

export type AccessInput = {
  now: Date;
  /** Assinaturas e passes do próprio aluno. */
  own: SubscriptionLike[];
  /** Vínculos ativos do aluno com parceiros, cada um com a assinatura do parceiro. */
  partners?: Array<{
    membershipActive: boolean;
    subscriptions: SubscriptionLike[];
  }>;
};

export function hasFullAccess(input: AccessInput): boolean {
  const { now, own, partners = [] } = input;
  if (own.some((s) => isSubscriptionActive(s, now))) return true;
  return partners.some(
    (p) => p.membershipActive && p.subscriptions.some((s) => isSubscriptionActive(s, now)),
  );
}

/** Um parceiro pode convidar novos alunos? Quem já está dentro do limite continua com acesso. */
export function canInviteStudent(args: {
  studentLimit: number | null;
  activeStudents: number;
}): boolean {
  if (args.studentLimit === null) return true;
  return args.activeStudents < args.studentLimit;
}
