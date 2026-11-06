import { loadAllRaw, type Question } from './questions';

/** Acha uma questão pelo id (ENEM: "enem-…"; Detran: prefixo do estado, ex.: "am-…"). */
export function questaoPorId(id: string): Question | null {
  if (!/^[a-z0-9-]{3,80}$/i.test(id)) return null;
  const prefixo = id.split('-')[0]!.toUpperCase();
  const bancos = id.startsWith('enem-') ? ['ENEM'] : [prefixo, 'AM'];
  for (const b of new Set(bancos)) {
    try { const q = loadAllRaw(b).find((x) => x.id === id); if (q) return q; } catch { /* banco inexistente */ }
  }
  return null;
}
