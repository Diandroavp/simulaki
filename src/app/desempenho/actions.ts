'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getDb, schema } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { parseDataProva } from '@/lib/desempenho';

/** Salva (ou apaga, se vazio) a data da prova do aluno. */
export async function salvarDataProvaAction(form: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect('/entrar');
  const raw = String(form.get('data') ?? '').trim();
  const data = raw ? parseDataProva(raw) : null;
  if (raw && !data) redirect(`/desempenho?erro=${encodeURIComponent('Informe uma data futura, em até 2 anos.')}`);
  const db = await getDb();
  await db.update(schema.users).set({ examDate: data }).where(eq(schema.users.id, user.id));
  revalidatePath('/desempenho');
  redirect('/desempenho');
}
