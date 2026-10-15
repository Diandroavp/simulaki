'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getDb, schema } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { UFS_DETRAN } from '@/lib/mundos';

/** Guarda o estado do Detran do aluno (vazio = escolher de novo). */
export async function escolherUfAction(form: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect('/entrar');
  const uf = String(form.get('uf') ?? '').toUpperCase();
  const db = await getDb();
  await db.update(schema.users).set({ detranUf: UFS_DETRAN.some((x) => x.uf === uf) ? uf : null }).where(eq(schema.users.id, user.id));
  revalidatePath('/app/detran');
  redirect('/app/detran');
}
