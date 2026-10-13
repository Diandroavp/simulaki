import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { userHasAccess } from '@/lib/billing';
import { catalogo, PERSONALIZADO_MAX, PERSONALIZADO_MAX_MINUTOS, PERSONALIZADO_MIN_MINUTOS } from '@/lib/personalizado';
import { ensureOverrides } from '@/lib/question-overrides';
import PersonalizadoClient from './personalizado-client';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Simulado personalizado' };

export default async function Page({ searchParams }: { searchParams: Promise<{ retomar?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?erro=${encodeURIComponent('Entre para montar seu simulado.')}`);
  await ensureOverrides();
  const [{ full }, sp] = await Promise.all([userHasAccess(user.id), searchParams]);
  return (
    <PersonalizadoClient
      bancos={catalogo()} liberado={full} retomar={sp.retomar === '1'}
      limites={{ maxQuestoes: PERSONALIZADO_MAX, minMinutos: PERSONALIZADO_MIN_MINUTOS, maxMinutos: PERSONALIZADO_MAX_MINUTOS }}
    />
  );
}
