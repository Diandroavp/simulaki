import { describe, expect, it } from 'vitest';
import { montarPerfil } from './enem-perfil';
import { montarPlano } from './enem-plano';

describe('plano semanal ENEM', () => {
  const perfil = montarPerfil([], () => null);
  it('gera 7 dias, 5 de foco, e ajusta o ritmo pela data da prova', () => {
    const p = montarPlano(perfil, {}, null);
    expect(p.dias).toHaveLength(7);
    expect(p.dias.slice(0, 5).every((d) => d.assunto)).toBe(true);
    expect(p.ritmo).toBe(10);
    expect(montarPlano(perfil, {}, 30).ritmo).toBe(15);
    const rf = montarPlano(perfil, {}, 5);
    expect(rf.retaFinal).toBe(true);
    expect(rf.ritmo).toBe(20);
  });
  it('não repete assunto e não escolhe dominado', () => {
    const manuais = Object.fromEntries(Object.values(perfil.assuntos).flat().slice(0, 30).map((a) => [a.key, 'dominado' as const]));
    const p = montarPlano(perfil, manuais, null);
    const ks = p.dias.filter((d) => d.assunto).map((d) => d.assunto);
    expect(new Set(ks).size).toBe(ks.length);
    expect(ks.every((k) => manuais[k!] !== 'dominado')).toBe(true);
  });
});
