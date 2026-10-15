import { describe, expect, it } from 'vitest';
import { montarPerfil } from './enem-perfil';
import mapa from './enem-assuntos.json';
import { ASSUNTO_LABEL } from './assuntos';

const ass = (id: string) => ({ 'enem-a': 'literatura', 'enem-b': 'literatura', 'enem-c': 'estatistica', 'enem-d': 'geometria-plana' } as Record<string, string>)[id] ?? null;

describe('perfil do ENEM', () => {
  it('agrega por área e assunto, ignora Detran e esconde nota com poucos dados', () => {
    const p = montarPerfil([
      { questionId: 'enem-a', topic: 'linguagens', respondidas: 4, acertos: 4 },
      { questionId: 'enem-b', topic: 'linguagens', respondidas: 2, acertos: 1 },
      { questionId: 'enem-c', topic: 'matematica', respondidas: 5, acertos: 1 },
      { questionId: 'enem-d', topic: 'matematica', respondidas: 2, acertos: 2 },
      { questionId: 'am-001', topic: 'legislacao', respondidas: 9, acertos: 9 },
    ], ass);
    expect(p.areas.find((a) => a.key === 'linguagens')).toMatchObject({ respondidas: 6, acertos: 5, pct: 83 });
    expect(p.areas.find((a) => a.key === 'humanas')?.pct).toBeNull();
    expect(p.assuntos.linguagens.find((a) => a.key === 'literatura')?.pct).toBe(83);
    expect(p.assuntos.matematica.find((a) => a.key === 'geometria-plana')?.pct).toBeNull();
    expect(p.fortes.map((x) => x.key)).toEqual(['literatura']);
    expect(p.fracos.map((x) => x.key)).toEqual(['estatistica']);
  });
  it('todo assunto do mapa existe na taxonomia', () => {
    for (const v of new Set(Object.values(mapa))) expect(ASSUNTO_LABEL[v], v).toBeTruthy();
  });
});
