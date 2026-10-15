import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { userHasAccess } from '@/lib/billing';
import { AREAS, contagemPorAssunto } from '@/lib/assuntos';
import { FREE_TREINOS_POR_DIA, filtrarPorTema, poolDoMundo, revisaoDoDia, TREINO_TAMANHO, TREINO_TAMANHOS, TREINO_TEMAS } from '@/lib/treino';
import { mundoPorSlug } from '@/lib/mundos';
import { ensureOverrides } from '@/lib/question-overrides';
import TreinoClient from './treino-client';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Treino rápido' };

export default async function Page({ searchParams }: { searchParams: Promise<{ mundo?: string; tema?: string }> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?erro=${encodeURIComponent('Entre para treinar.')}`);
  const m = mundoPorSlug(sp.mundo);
  if (!m) redirect('/app');
  await ensureOverrides();
  const [revisao, access] = await Promise.all([revisaoDoDia(user.id, m.slug), userHasAccess(user.id)]);
  const pool = poolDoMundo(m.slug);
  let grupos;
  if (m.slug === 'enem') {
    const qtd = contagemPorAssunto();
    grupos = AREAS.map((a) => ({
      titulo: a.label,
      temaTodos: { id: a.key, nome: a.label, total: filtrarPorTema(pool, 'enem', a.key).length },
      temas: a.assuntos.map((s) => ({ id: s.key, nome: s.label, total: qtd[s.key] ?? 0 })).filter((t) => t.total > 0),
    })).filter((g) => g.temaTodos.total > 0);
  } else {
    grupos = [{ temas: Object.entries(TREINO_TEMAS).map(([id, nome]) => ({ id, nome, total: pool.filter((q) => q.topic === id).length })).filter((t) => t.total > 0) }];
  }
  return (
    <TreinoClient
      mundo={m.slug} mundoNome={m.nome} grupos={grupos} erros={revisao.devidas.length} agendadas={revisao.agendadas}
      tamanhos={TREINO_TAMANHOS} tamanhoPadrao={TREINO_TAMANHO} minutosPorQuestao={m.slug === 'enem' ? 2 : 1}
      gratis={access.full ? null : FREE_TREINOS_POR_DIA} temaInicial={sp.tema}
    />
  );
}
