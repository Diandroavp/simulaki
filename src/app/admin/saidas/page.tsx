import Link from 'next/link';
import { redirect } from 'next/navigation';
import { desc } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { requireAdmin } from '@/lib/auth';
import { motivoLabel } from '@/lib/motivos-exclusao';

export const dynamic = 'force-dynamic';
const when = (d: Date) => d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Manaus' });

export default async function Saidas() {
  if (!(await requireAdmin())) redirect('/');
  const db = await getDb();
  const rows = await db.select().from(schema.accountDeletions).orderBy(desc(schema.accountDeletions.createdAt)).limit(200);
  return (
    <>
      <h1>Saídas</h1>
      <p><Link href="/admin">← Gestão</Link> · motivos informados ao excluir a conta (anônimos e opcionais)</p>
      <div className="card scroll">
        <table>
          <thead><tr><th>Quando</th><th>Motivo</th><th>Comentário</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={3} className="muted">Nenhum motivo informado ainda.</td></tr>}
            {rows.map((r) => <tr key={r.id}><td>{when(r.createdAt)}</td><td>{motivoLabel(r.reason)}</td><td>{r.detail ?? '-'}</td></tr>)}
          </tbody>
        </table>
      </div>
    </>
  );
}
