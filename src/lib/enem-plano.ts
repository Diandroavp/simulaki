import { ASSUNTO_AREA, AREA_POR_CHAVE } from './assuntos';
import type { Perfil, Ponto } from './enem-perfil';
import { statusFinal, type StatusEstudo } from './enem-checklist';

export type DiaPlano = { dia: string; titulo: string; detalhe: string; questoes: number; assunto?: string };
export type Plano = { dias: DiaPlano[]; ritmo: number; retaFinal: boolean; foco: string[] };

const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

/** Prioridade: o que você já tentou e está fraco, depois o que ainda não viu, depois o que está razoável. */
function prioridade(p: Ponto, st: StatusEstudo): number {
  if (st === 'dominado') return 99;
  if (p.pct !== null && p.pct < 60) return p.pct / 100;       // 0..0.6
  if (st === 'nao_vi' || p.respondidas === 0) return 1;
  return 2 + (p.pct ?? 0) / 100;                                // razoável
}

/** Monta um plano de 7 dias: 5 dias de foco em assuntos, 1 mini-simulado e 1 dia leve de revisão. */
export function montarPlano(perfil: Perfil, manuais: Record<string, StatusEstudo>, diasProva: number | null): Plano {
  const retaFinal = diasProva !== null && diasProva >= 0 && diasProva <= 14;
  const ritmo = retaFinal ? 20 : diasProva !== null && diasProva <= 45 ? 15 : 10;
  const todos = Object.values(perfil.assuntos).flat()
    .map((p) => ({ p, st: statusFinal(manuais[p.key], p).status }))
    .filter((x) => x.st !== 'dominado')
    .sort((a, b) => prioridade(a.p, a.st) - prioridade(b.p, b.st));
  // evita 5 dias seguidos da mesma área: intercala quando possível
  const foco: typeof todos = [];
  const pool = [...todos];
  while (foco.length < 5 && pool.length) {
    const ultima = foco.length ? ASSUNTO_AREA[foco[foco.length - 1]!.p.key] : null;
    const i = pool.findIndex((x) => ASSUNTO_AREA[x.p.key] !== ultima);
    foco.push(pool.splice(i === -1 ? 0 : i, 1)[0]!);
  }
  const dias: DiaPlano[] = [];
  for (let i = 0; i < 5; i++) {
    const f = foco[i];
    if (!f) { dias.push({ dia: DIAS[i]!, titulo: 'Revisão livre', detalhe: 'Você já domina os assuntos! Escolha o que quiser rever e faça questões de anos anteriores.', questoes: ritmo }); continue; }
    const area = AREA_POR_CHAVE[ASSUNTO_AREA[f.p.key]!].curto;
    const detalhe = f.p.respondidas === 0 ? `${area}: assunto novo. Comece com uma boa leitura e depois resolva ${ritmo} questões.`
      : f.p.pct !== null && f.p.pct < 60 ? `${area}: aqui está sua maior chance de subir a nota. Reveja a teoria e resolva ${ritmo} questões.`
      : `${area}: você está indo bem, falta consolidar. Resolva ${ritmo} questões.`;
    dias.push({ dia: DIAS[i]!, titulo: f.p.label, detalhe, questoes: ritmo, assunto: f.p.key });
  }
  dias.push({ dia: 'Sábado', titulo: 'Mini-simulado', detalhe: `Monte um simulado personalizado com ${ritmo * 2} questões misturando os assuntos da semana.`, questoes: ritmo * 2 });
  dias.push({ dia: 'Domingo', titulo: 'Dia leve', detalhe: 'Reveja os erros da semana, descanse e comemore o que avançou. 🌿', questoes: 5 });
  return { dias, ritmo, retaFinal, foco: foco.map((f) => f.p.label) };
}
