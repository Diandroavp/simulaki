import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Patrocínio direto ("oferecido por"): banner simples só para quem não paga, fora de simulado e treino.
 * Sem rastreamento nem cookies de terceiros. Os patrocinadores ficam em content/patrocinio.json.
 */
export type Tela = 'app' | 'hub' | 'desempenho';
export type Patrocinador = {
  id: string;
  nome: string;
  texto: string;
  /** Sempre https. */
  url: string;
  ativo: boolean;
  /** Em quais telas aparece (padrão: todas). */
  telas?: Tela[];
  /** Mundos (detran, enem…) em que aparece (padrão: todos). */
  mundos?: string[];
  /** Datas ISO opcionais (AAAA-MM-DD), inclusive. */
  de?: string;
  ate?: string;
};

export function valido(p: Partial<Patrocinador>): p is Patrocinador {
  if (!p.id || !p.nome || !p.texto || !p.url) return false;
  if (p.nome.length > 60 || p.texto.length > 140) return false;
  try { return new URL(p.url).protocol === 'https:'; } catch { return false; }
}

export function carregarPatrocinadores(): Patrocinador[] {
  const f = path.join(process.cwd(), 'content', 'patrocinio.json');
  if (!existsSync(f)) return [];
  try {
    const raw = JSON.parse(readFileSync(f, 'utf8')) as Partial<Patrocinador>[];
    return Array.isArray(raw) ? raw.filter(valido) : [];
  } catch { return []; }
}

/** Escolhe o patrocinador da vez (rodízio por dia, estável durante o dia). Nada para quem tem acesso completo. */
export function escolherPatrocinador(lista: Patrocinador[], o: { tela: Tela; mundo?: string; pago: boolean; hoje?: Date }): Patrocinador | null {
  if (o.pago) return null;
  const hoje = o.hoje ?? new Date();
  const dia = hoje.toISOString().slice(0, 10);
  const ok = lista.filter((p) =>
    p.ativo &&
    (!p.telas || p.telas.includes(o.tela)) &&
    (!p.mundos || !o.mundo || p.mundos.includes(o.mundo)) &&
    (!p.de || p.de <= dia) && (!p.ate || p.ate >= dia));
  if (!ok.length) return null;
  const n = Math.floor(hoje.getTime() / 86_400_000);
  return ok[n % ok.length] ?? null;
}
