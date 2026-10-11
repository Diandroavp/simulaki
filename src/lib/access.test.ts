import { describe, expect, it } from 'vitest';
import { canInviteStudent, hasFullAccess, isSubscriptionActive } from './access';
import { buildExam, getExamConfig, pickQuestions, scoreAttempt } from './exam';

const now = new Date('2026-10-10T12:00:00Z');
const days = (n: number) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000);

describe('isSubscriptionActive', () => {
  it('passe ativo com data de fim futura dá acesso', () => {
    expect(isSubscriptionActive({ status: 'active', endsAt: days(10) }, now)).toBe(true);
  });

  it('passe vencido não dá acesso', () => {
    expect(isSubscriptionActive({ status: 'active', endsAt: days(-1) }, now)).toBe(false);
  });

  it('recorrente sem data de fim dá acesso enquanto ativa', () => {
    expect(isSubscriptionActive({ status: 'active', endsAt: null }, now)).toBe(true);
  });

  it('past_due mantém acesso dentro dos 3 dias de tolerância', () => {
    expect(isSubscriptionActive({ status: 'past_due', endsAt: null, pastDueSince: days(-2) }, now)).toBe(true);
  });

  it('past_due perde acesso depois da tolerância', () => {
    expect(isSubscriptionActive({ status: 'past_due', endsAt: null, pastDueSince: days(-4) }, now)).toBe(false);
  });

  it('cancelada mantém acesso até o fim do período pago', () => {
    expect(isSubscriptionActive({ status: 'canceled', endsAt: days(5) }, now)).toBe(true);
    expect(isSubscriptionActive({ status: 'canceled', endsAt: days(-1) }, now)).toBe(false);
  });

  it('expirada nunca dá acesso', () => {
    expect(isSubscriptionActive({ status: 'expired', endsAt: days(10) }, now)).toBe(false);
  });
});

describe('hasFullAccess', () => {
  it('aluno sem nada não tem acesso', () => {
    expect(hasFullAccess({ now, own: [] })).toBe(false);
  });

  it('aluno vinculado a parceiro ativo tem acesso', () => {
    expect(
      hasFullAccess({
        now,
        own: [],
        partners: [{ membershipActive: true, subscriptions: [{ status: 'active', endsAt: null }] }],
      }),
    ).toBe(true);
  });

  it('vínculo removido não dá acesso, mesmo com parceiro ativo', () => {
    expect(
      hasFullAccess({
        now,
        own: [],
        partners: [{ membershipActive: false, subscriptions: [{ status: 'active', endsAt: null }] }],
      }),
    ).toBe(false);
  });
});

describe('canInviteStudent', () => {
  it('bloqueia convite quando atinge o limite do plano', () => {
    expect(canInviteStudent({ studentLimit: 50, activeStudents: 50 })).toBe(false);
    expect(canInviteStudent({ studentLimit: 50, activeStudents: 49 })).toBe(true);
  });

  it('plano ilimitado sempre permite', () => {
    expect(canInviteStudent({ studentLimit: null, activeStudents: 9999 })).toBe(true);
  });
});

describe('prova', () => {
  it('AM usa 30 questões, 60 minutos e 20 acertos (Res. CONTRAN 1.020/2025)', () => {
    const c = getExamConfig('am');
    expect([c.questionCount, c.durationMinutes, c.minCorrect]).toEqual([30, 60, 20]);
    expect(Object.values(c.topicDistribution ?? {}).reduce((a, b) => a + b, 0)).toBe(30);
  });

  it('SP usa 30 questões em 40 minutos e BA usa 60 minutos', () => {
    expect(getExamConfig('SP').durationMinutes).toBe(40);
    expect(getExamConfig('ba').durationMinutes).toBe(60);
  });

  it('SP sem distribuição por tema sorteia 30 questões do banco', () => {
    const pool = Array.from({ length: 80 }, (_, i) => ({ topic: i % 2 ? 'legislacao' : 'sinalizacao', id: i }));
    expect(buildExam(pool, getExamConfig('SP'))).toHaveLength(30);
  });

  it('estado desconhecido cai no padrão nacional', () => {
    expect(getExamConfig('XX').stateCode).toBe('BR');
  });

  it('monta prova respeitando a distribuição por tema', () => {
    const topics = ['legislacao', 'direcao_defensiva', 'primeiros_socorros', 'meio_ambiente_cidadania', 'mecanica'];
    const pool = topics.flatMap((t) => Array.from({ length: 40 }, (_, i) => ({ topic: t, id: `${t}-${i}` })));
    const exam = buildExam(pool, getExamConfig('AM'));
    expect(exam).toHaveLength(30);
    expect(exam.filter((q) => q.topic === 'legislacao')).toHaveLength(12);
    expect(exam.filter((q) => q.topic === 'direcao_defensiva')).toHaveLength(10);
    expect(exam.filter((q) => q.topic === 'mecanica')).toHaveLength(2);
  });

  it('19 acertos reprova e 20 aprova', () => {
    const config = getExamConfig('AM');
    const make = (ok: number) =>
      Array.from({ length: 30 }, (_, i) => ({
        selectedOptionId: i < ok ? 'a' : 'b',
        correctOptionId: 'a',
      }));
    expect(scoreAttempt(make(19), config).passed).toBe(false);
    expect(scoreAttempt(make(20), config).passed).toBe(true);
  });

  it('sorteio não repete e respeita o tamanho', () => {
    const pool = Array.from({ length: 100 }, (_, i) => i);
    const picked = pickQuestions(pool, 30);
    expect(picked).toHaveLength(30);
    expect(new Set(picked).size).toBe(30);
  });
});

import { sourceLine } from './questions';
describe('fonte da questão', () => {
  const base = { id: 'x', stateCode: 'AM', topic: 'legislacao', statement: 's', options: [], correctOptionId: 'a', status: 'draft' as const };
  it('mostra a fonte oficial quando existe', () => {
    expect(sourceLine({ ...base, source: 'Banco Nacional de Questões, v1.0 (2025)', sourceRef: 'Parte 1, q. 3' })).toBe('Fonte: Banco Nacional de Questões, v1.0 (2025) · Parte 1, q. 3');
  });
  it('questão própria cita a base legal e a lei', () => {
    expect(sourceLine({ ...base, legalRef: 'CTB, art. 65' })).toContain('Lei nº 9.503/1997');
  });
});

import { loadQuestions, examTopic } from './questions';
describe('prova com o banco nacional', () => {
  it('AM: sorteia 30 questões únicas, todas respondíveis sem imagem', () => {
    const pool = loadQuestions('AM');
    expect(pool.length).toBeGreaterThan(1000);
    expect(loadQuestions('SP').length).toBe(loadQuestions('BA').length);
    expect(pool.every((q) => !q.signCode)).toBe(true);
    const exam = buildExam(pool.map((q) => ({ ...q, topic: examTopic(q.topic) })), getExamConfig('AM'));
    expect(exam).toHaveLength(30);
    expect(new Set(exam.map((q) => q.id)).size).toBe(30);
  });
});
