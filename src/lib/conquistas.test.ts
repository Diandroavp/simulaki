import { describe, expect, it } from 'vitest';
import { calcularConquistas, NIVEIS, sequencias, type Estatisticas } from './conquistas';

const zero: Estatisticas = { respondidas: 0, certas: 0, simulados: 0, treinos: 0, melhorPct: 0, aprovouDetran: false, mundos: 0, melhorSequencia: 0, sequenciaAtual: 0, areasEnem: 0, indicados: 0 };

describe('conquistas', () => {
  it('quem não fez nada começa no Calouro, sem troféus', () => {
    const c = calcularConquistas(zero);
    expect(c.xp).toBe(0);
    expect(c.nivel.nome).toBe('Calouro');
    expect(c.ganhos).toBe(0);
    expect(c.progresso).toBe(0);
  });
  it('um simulado de 30 questões com 24 acertos rende XP e o primeiro troféu', () => {
    const c = calcularConquistas({ ...zero, respondidas: 30, certas: 24, simulados: 1, melhorPct: 80 });
    // 24*2 + 6*1 + 20 + troféus (primeiro-passo, aquecendo, mandou-bem) * 25
    expect(c.trofeus.filter((t) => t.ganho).map((t) => t.id).sort()).toEqual(['aquecendo', 'mandou-bem', 'primeiro-passo']);
    expect(c.xp).toBe(48 + 6 + 20 + 75);
    expect(c.nivel.nome).toBe('Esperto');
    expect(c.proximo?.nome).toBe('Cabeça');
  });
  it('o progresso é proporcional ao caminho até o próximo nível', () => {
    // meio caminho entre Esforçado (40) e Esperto (120) = 80 XP
    const c = calcularConquistas({ ...zero, respondidas: 55, certas: 0 });
    expect(c.xp).toBe(80); // 55 erradas * 1 + 25 do troféu "Aquecendo"
    expect(c.nivel.nome).toBe('Esforçado');
    expect(c.progresso).toBe(50);
  });
  it('no último nível o progresso é 100 e não há próximo', () => {
    const c = calcularConquistas({ ...zero, respondidas: 3000, certas: 3000 });
    expect(c.nivel.nome).toBe(NIVEIS[NIVEIS.length - 1]!.nome);
    expect(c.proximo).toBeNull();
    expect(c.progresso).toBe(100);
  });
  it('o progresso do troféu não passa da meta', () => {
    const c = calcularConquistas({ ...zero, respondidas: 500 });
    const centena = c.trofeus.find((t) => t.id === 'centena')!;
    expect(centena.ganho).toBe(true);
    expect(centena.atual).toBe(100);
    expect(c.trofeus.find((t) => t.id === 'milhar')!.atual).toBe(500);
  });
});

describe('sequências de dias', () => {
  it('conta dias seguidos e ignora repetidos', () => {
    expect(sequencias(['2026-11-01', '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-10'], '2026-11-10')).toEqual({ melhor: 3, atual: 1 });
  });
  it('a sequência atual vale se a última atividade foi ontem, e zera se foi antes', () => {
    expect(sequencias(['2026-11-04', '2026-11-05'], '2026-11-06').atual).toBe(2);
    expect(sequencias(['2026-11-04', '2026-11-05'], '2026-11-07').atual).toBe(0);
  });
  it('sem atividade', () => {
    expect(sequencias([], '2026-11-06')).toEqual({ melhor: 0, atual: 0 });
  });
});
