import { sql } from 'drizzle-orm';
import { getDb } from '@/db';

/** Métricas do negócio para o painel de gestão. Tudo em uma consulta por bloco, sem dados pessoais. */

export type Funil = { cadastros: number; verificados: number; ativos: number; pagantes: number };
export type ReceitaPlano = { plano: string; pagamentos: number; centavos: number };

export async function metricas(now = new Date()) {
  const db = await getDb();
  const desde30 = new Date(now.getTime() - 30 * 86_400_000).toISOString();

  // Funil dos cadastros de cada janela: cadastrou -> confirmou e-mail -> usou (respondeu questões) -> pagou.
  const funilDe = async (desde: string | null): Promise<Funil> => {
    const cond = desde ? sql`and u.created_at >= ${desde}::timestamptz` : sql``;
    const r = await db.execute(sql`
      select count(*)::int as cadastros,
        count(*) filter (where u.email_verified_at is not null)::int as verificados,
        count(*) filter (where exists (select 1 from attempts a where a.user_id = u.id))::int as ativos,
        count(*) filter (where exists (select 1 from payments p where p.user_id = u.id and p.status = 'paid'))::int as pagantes
      from users u where u.deleted_at is null ${cond}`);
    return rows<Funil>(r)[0]!;
  };

  const receita = await db.execute(sql`
    select pl.name as plano, count(*)::int as pagamentos, coalesce(sum(p.amount_cents),0)::int as centavos
    from payments p join plans pl on pl.id = p.plan_id
    where p.status = 'paid' group by pl.name order by sum(p.amount_cents) desc`);

  const rec = await db.execute(sql`
    select count(*) filter (where n >= 1)::int as pagantes, count(*) filter (where n >= 2)::int as renovaram
    from (select user_id, count(*) as n from payments where status = 'paid' group by user_id) t`);

  const semanas = await db.execute(sql`
    select to_char(date_trunc('week', created_at at time zone 'America/Manaus'), 'DD/MM') as semana, count(*)::int as cadastros
    from users where deleted_at is null and created_at >= now() - interval '56 days'
    group by date_trunc('week', created_at at time zone 'America/Manaus') order by date_trunc('week', created_at at time zone 'America/Manaus')`);

  const mes = await db.execute(sql`
    select coalesce(sum(amount_cents),0)::int as centavos, count(*)::int as pagamentos from payments where status = 'paid' and paid_at >= ${desde30}::timestamptz`);

  const [r1] = rows<{ pagantes: number; renovaram: number }>(rec);
  const [m1] = rows<{ centavos: number; pagamentos: number }>(mes);
  return {
    funil30: await funilDe(desde30),
    funilTotal: await funilDe(null),
    receitaPorPlano: rows<ReceitaPlano>(receita),
    pagantes: r1!.pagantes,
    renovaram: r1!.renovaram,
    taxaRenovacao: r1!.pagantes ? Math.round((r1!.renovaram / r1!.pagantes) * 100) : null,
    receita30: m1!.centavos,
    pagamentos30: m1!.pagamentos,
    ticketMedio30: m1!.pagamentos ? Math.round(m1!.centavos / m1!.pagamentos) : null,
    semanas: rows<{ semana: string; cadastros: number }>(semanas),
  };
}

/** Normaliza o retorno de db.execute (PGlite devolve { rows }, node-postgres também). */
function rows<T>(r: unknown): T[] {
  return ((r as { rows?: T[] }).rows ?? (r as T[])) as T[];
}

export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
