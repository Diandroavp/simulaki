import Link from 'next/link';
import { redirect } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';
const when = (d: Date | null) => (d ? d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Manaus' }) : '-');

export default async function Atividade() {
  if (!(await requireAdmin())) redirect('/');
  const db = await getDb();
  const rows = await db
    .select({
      id: schema.attempts.id,
      name: schema.users.name,
      email: schema.users.email,
      sim: schema.attempts.simulationType,
      total: schema.attempts.totalCount,
      certas: schema.attempts.correctCount,
      passed: schema.attempts.passed,
      startedAt: schema.attempts.startedAt,
      finishedAt: schema.attempts.finishedAt,
    })
    .from(schema.attempts)
    .innerJoin(schema.users, eq(schema.users.id, schema.attempts.userId))
    .orderBy(desc(schema.attempts.startedAt))
    .limit(100);

  return (
    <>
      <h1>Atividade</h1>
      <p><Link href="/admin">← Gestão</Link> · últimos {rows.length} simulados</p>
      <div className="card scroll">
        <table>
          <thead><tr><th>Início</th><th>Aluno</th><th>E-mail</th><th>Simulado</th><th>Acertos</th><th>Situação</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="muted">Nenhum simulado ainda.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{when(r.startedAt)}</td>
                <td>{r.name}</td>
                <td>{r.email}</td>
                <td>{r.sim}</td>
                <td>{r.finishedAt ? `${r.certas ?? 0}/${r.total}` : '-'}</td>
                <td>{!r.finishedAt ? 'Em andamento' : r.passed === null ? 'Concluído' : r.passed ? 'Aprovado' : 'Reprovado'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
