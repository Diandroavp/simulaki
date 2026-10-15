import { describe, expect, it } from 'vitest';

process.env.PGLITE_DIR = 'memory://';
const { getDb, schema } = await import('@/db');
const { answerTreino, questoesErradas, startTreino, FREE_TREINOS_POR_DIA } = await import('./treino');
const { getStats, startAttempt } = await import('./attempts');
const { loadQuestions } = await import('./questions');

async function user() {
  const db = await getDb();
  const [u] = await db.insert(schema.users).values({ emailVerifiedAt: new Date(), name: 'A', email: `t${Math.random()}@t.com` }).returning();
  return u!.id;
}
const gabarito = (id: string) => loadQuestions('AM').find((q) => q.id === id)!;

describe('treino por tema', () => {
  it('sorteia 10 questões do tema, sem gabarito, e corrige na hora', async () => {
    const uid = await user();
    const r = await startTreino(uid, 'legislacao');
    if (!r.ok) throw new Error(r.reason);
    expect(r.questions).toHaveLength(10);
    expect(r.questions.every((q) => q.topic === 'legislacao')).toBe(true);
    expect(JSON.stringify(r.questions)).not.toContain('correctOptionId');
    const q = r.questions[0]!;
    const certa = gabarito(q.id).correctOptionId;
    const errada = q.options.find((o) => o.id !== certa)!.id;
    const a = await answerTreino(uid, r.attemptId, q.id, errada);
    if (!a.ok) throw new Error(a.reason);
    expect(a.correct).toBe(false);
    expect(a.correctOptionId).toBe(certa);
    expect(a.sourceLine).toContain('Fonte:');
    // reenviar outra resposta não muda o resultado já registrado
    const b = await answerTreino(uid, r.attemptId, q.id, certa);
    if (!b.ok) throw new Error(b.reason);
    expect(b.correct).toBe(false);
  });

  it('rejeita questão de fora do treino e opção inexistente', async () => {
    const uid = await user();
    const r = await startTreino(uid, 'mecanica');
    if (!r.ok) throw new Error(r.reason);
    const q = r.questions[0]!;
    expect((await answerTreino(uid, r.attemptId, 'nao-existe', 'a')).ok).toBe(false);
    expect((await answerTreino(uid, r.attemptId, q.id, 'z')).ok).toBe(false);
    const outro = await user();
    expect((await answerTreino(outro, r.attemptId, q.id, 'a')).ok).toBe(false); // treino de outra pessoa
  });

  it('caderno de erros reúne o que foi errado e some quando o aluno acerta depois', async () => {
    const uid = await user();
    const r = await startTreino(uid, 'primeiros_socorros');
    if (!r.ok) throw new Error(r.reason);
    const q = r.questions[0]!;
    const certa = gabarito(q.id).correctOptionId;
    await answerTreino(uid, r.attemptId, q.id, q.options.find((o) => o.id !== certa)!.id);
    expect(await questoesErradas(uid)).toContain(q.id);
    const e = await startTreino(uid, 'erros');
    if (!e.ok) throw new Error(e.reason);
    expect(e.questions.map((x) => x.id)).toContain(q.id);
    await answerTreino(uid, e.attemptId, q.id, certa);
    expect(await questoesErradas(uid)).not.toContain(q.id);
  });

  it('sem erros devolve aviso e conclui a sessão ao responder tudo', async () => {
    const uid = await user();
    const vazio = await startTreino(uid, 'erros');
    expect(vazio.ok).toBe(false);
    const r = await startTreino(uid, 'meio_ambiente_cidadania');
    if (!r.ok) throw new Error(r.reason);
    let last;
    for (const q of r.questions) last = await answerTreino(uid, r.attemptId, q.id, gabarito(q.id).correctOptionId);
    if (!last?.ok) throw new Error('fim');
    expect(last.done).toBe(true);
    expect(last.score).toEqual({ correct: r.questions.length, total: r.questions.length });
  });

  it('plano grátis tem limite diário de treinos, que não consome o simulado grátis nem entra nas estatísticas', async () => {
    const uid = await user();
    for (let i = 0; i < FREE_TREINOS_POR_DIA; i++) expect((await startTreino(uid, 'legislacao')).ok).toBe(true);
    const barrado = await startTreino(uid, 'legislacao');
    expect(barrado.ok).toBe(false);
    if (!barrado.ok) expect(barrado.code).toBe('limit');
    expect((await startAttempt(uid, 'detran-am')).ok).toBe(true); // simulado grátis do dia segue livre
    const { history, stats } = await getStats(uid);
    expect(history).toHaveLength(0);
    expect([...stats.keys()].some((k) => k.startsWith('treino:'))).toBe(false);
  });

  it('tema inexistente é recusado', async () => {
    const r = await startTreino(await user(), 'xyz');
    expect(r.ok).toBe(false);
  });
});

describe('revisão espaçada', async () => {
  const { calcularRevisao } = await import('./treino');
  const DIA = 86_400_000;
  const t0 = new Date('2026-10-01T12:00:00Z');
  const h = (id: string, ok: boolean, dias: number) => ({ id, ok, quando: new Date(t0.getTime() + dias * DIA) });

  it('erro: volta já; 1 acerto: em 3 dias; 2 acertos: em 7 dias; 3 acertos: dominada', () => {
    const agora = (d: number) => new Date(t0.getTime() + d * DIA);
    expect(calcularRevisao([h('a', false, 0)], agora(0)).devidas).toEqual(['a']);
    const um = [h('a', false, 0), h('a', true, 1)];
    expect(calcularRevisao(um, agora(3)).devidas).toEqual([]);
    expect(calcularRevisao(um, agora(3)).agendadas[0]?.em).toEqual(agora(4));
    expect(calcularRevisao(um, agora(4)).devidas).toEqual(['a']);
    const dois = [...um, h('a', true, 4)];
    expect(calcularRevisao(dois, agora(10)).devidas).toEqual([]);
    expect(calcularRevisao(dois, agora(11)).devidas).toEqual(['a']);
    const tres = [...dois, h('a', true, 11)];
    const r = calcularRevisao(tres, agora(100));
    expect(r.dominadas).toEqual(['a']);
    expect(r.devidas).toEqual([]);
  });
  it('errar de novo reinicia o ciclo e quem nunca errou não entra', () => {
    const hist = [h('a', false, 0), h('a', true, 1), h('a', true, 4), h('a', false, 11)];
    expect(calcularRevisao(hist, new Date(t0.getTime() + 11 * DIA)).devidas).toEqual(['a']);
    expect(calcularRevisao([h('b', true, 0)], new Date(t0.getTime() + 50 * DIA))).toEqual({ devidas: [], agendadas: [], dominadas: [] });
  });
});

describe('treino rápido por mundo', () => {
  it('ENEM: aleatório, por área e por assunto, com tamanho escolhido; Detran não mistura', async () => {
    const uid = await user();
    const a = await startTreino(await user(), 'aleatorio', { mundo: 'enem', tamanho: 5 });
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    expect(a.questions).toHaveLength(5);
    expect(a.questions.every((q) => q.id.startsWith('enem-'))).toBe(true);

    const m = await startTreino(await user(), 'matematica', { mundo: 'enem', tamanho: 5 });
    expect(m.ok && m.questions.every((q) => q.topic === 'matematica')).toBe(true);

    const g = await startTreino(await user(), 'geometria-plana', { mundo: 'enem', tamanho: 5 });
    expect(g.ok).toBe(true);

    const d = await startTreino(await user(), 'aleatorio', { mundo: 'detran', tamanho: 5 });
    expect(d.ok && d.questions.every((q) => !q.id.startsWith('enem-'))).toBe(true);
    // tema do Detran não vale no ENEM e vice-versa
    expect((await startTreino(uid, 'legislacao', { mundo: 'enem' })).ok).toBe(false);
    expect((await startTreino(uid, 'geometria-plana', { mundo: 'detran' })).ok).toBe(false);
  });

  it('responde questão do ENEM e o caderno de erros fica só no mundo certo', async () => {
    const uid = await user();
    const r = await startTreino(uid, 'aleatorio', { mundo: 'enem', tamanho: 3 });
    if (!r.ok) throw new Error('não iniciou');
    const q = r.questions[0]!;
    const errada = q.options.find((o) => o.id !== 'a') ?? q.options[0]!;
    const res = await answerTreino(uid, r.attemptId, q.id, errada.id);
    expect(res.ok).toBe(true);
    const { revisaoDoDia } = await import('./treino');
    const enem = await revisaoDoDia(uid, 'enem');
    const detran = await revisaoDoDia(uid, 'detran');
    expect(detran.devidas).not.toContain(q.id);
    if (!res.ok || !res.correct) expect(enem.devidas).toContain(q.id);
  });
});
