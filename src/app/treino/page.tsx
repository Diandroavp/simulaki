import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { userHasAccess } from '@/lib/billing';
import { FREE_TREINOS_POR_DIA, revisaoDoDia, TREINO_TAMANHO, TREINO_TEMAS } from '@/lib/treino';
import { loadQuestions } from '@/lib/questions';
import { ensureOverrides } from '@/lib/question-overrides';
import TreinoClient from './treino-client';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Treino por tema' };

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?erro=${encodeURIComponent('Entre para treinar.')}`);
  await ensureOverrides();
  const [revisao, access] = await Promise.all([revisaoDoDia(user.id), userHasAccess(user.id)]);
  const pool = loadQuestions('AM');
  const temas = Object.entries(TREINO_TEMAS)
    .map(([id, nome]) => ({ id, nome, total: pool.filter((q) => q.topic === id).length }))
    .filter((t) => t.total > 0);
  return <TreinoClient temas={temas} erros={revisao.devidas.length} agendadas={revisao.agendadas} tamanho={TREINO_TAMANHO} gratis={access.full ? null : FREE_TREINOS_POR_DIA} />;
}
