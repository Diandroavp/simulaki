import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getSimulation } from '@/lib/simulations';
import SimuladoClient from './simulado-client';

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sim = getSimulation(slug);
  if (!sim) notFound();
  if (!(await getCurrentUser())) redirect(`/entrar?erro=${encodeURIComponent('Entre para fazer o simulado.')}`);
  return <SimuladoClient slug={slug} name={sim!.name} />;
}
