import Link from 'next/link';
import { redirect } from 'next/navigation';
import { desc, sql } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';
const UID = sql.raw('"users"."id"'); // coluna qualificada: dentro de subconsulta o drizzle imprimiria só "id" (ambíguo)
const when = (d: Date | null) => (d ? d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Manaus' }) : '-');

export default async function Usuarios() {
  if (!(await requireAdmin())) redirect('/');
  const db = await getDb();
  const rows = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      role: schema.users.role,
      createdAt: schema.users.createdAt,
      verified: schema.users.emailVerifiedAt,
      google: schema.users.googleSub,
      uf: schema.users.detranUf,
      deletedAt: schema.users.deletedAt,
      simulados: sql<number>`(select count(*)::int from ${schema.attempts} a where a.user_id = ${UID})`,
      ultimo: sql<Date | null>`(select max(a.started_at) from ${schema.attempts} a where a.user_id = ${UID})`,
      plano: sql<string | null>`(select p.name from ${schema.subscriptions} s join ${schema.plans} p on p.id = s.plan_id where s.owner_user_id = ${UID} and s.status = 'active' and s.ends_at > now() order by s.ends_at desc limit 1)`,
    })
    .from(schema.users)
    .orderBy(desc(schema.users.createdAt))
    .limit(500);

  return (
    <>
      <h1>Usuários</h1>
      <p><Link href="/admin">← Gestão</Link> · {rows.length} conta(s)</p>
      <div className="card scroll">
        <table>
          <thead><tr><th>Cadastro</th><th>Nome</th><th>E-mail</th><th>Confirmado</th><th>Entrada</th><th>Plano</th><th>Simulados</th><th>Último</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={r.deletedAt ? { opacity: 0.5 } : undefined}>
                <td>{when(r.createdAt)}</td>
                <td>{r.name}{r.role !== 'student' ? ` (${r.role})` : ''}{r.deletedAt ? ' [excluída]' : ''}</td>
                <td>{r.email}</td>
                <td>{r.verified ? 'Sim' : 'Não'}</td>
                <td>{r.google ? 'Google' : 'E-mail e senha'}</td>
                <td>{r.plano ?? 'Grátis'}</td>
                <td>{r.simulados}</td>
                <td>{when(r.ultimo ? new Date(r.ultimo) : null)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
