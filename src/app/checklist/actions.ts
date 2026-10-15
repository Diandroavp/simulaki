'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { salvarMarca, statusValido } from '@/lib/enem-checklist';

/** Marca o assunto como não vi / estudando / dominado; "auto" volta ao automático. */
export async function marcarAssuntoAction(form: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect('/entrar');
  const key = String(form.get('assunto') ?? '');
  const s = String(form.get('status') ?? '');
  await salvarMarca(user.id, key, s === 'auto' ? null : statusValido(s) ? s : null);
  revalidatePath('/checklist');
  redirect('/checklist');
}
