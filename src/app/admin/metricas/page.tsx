import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { metricas, pct, type Funil } from '@/lib/metricas';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Métricas do negócio' };
const brl = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function FunilTabela({ titulo, f }: { titulo: string; f: Funil }) {
  const linhas: [string, number][] = [['Cadastraram', f.cadastros], ['Confirmaram o e-mail', f.verificados], ['Fizeram ao menos um simulado ou treino', f.ativos], ['Pagaram', f.pagantes]];
  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>{titulo}</h3>
      <ul className="pers-list">
        {linhas.map(([nome, n]) => (
          <li key={nome}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <strong>{nome}</strong>
              <div className="meter" aria-hidden style={{ marginTop: 6 }}><i style={{ width: `${pct(n, f.cadastros)}%` }} /></div>
            </div>
            <span>{n} <span className="muted">({pct(n, f.cadastros)}%)</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function Metricas() {
  if (!(await requireAdmin())) redirect('/');
  const m = await metricas();
  const maxSem = Math.max(1, ...m.semanas.map((s) => s.cadastros));
  return (
    <>
      <h1>Métricas do negócio</h1>
      <p><Link href="/admin">Gestão</Link></p>
      <div className="grid" style={{ marginBlock: 16 }}>
        <div className="card"><div className="muted">Receita (30 dias)</div><div className="price">{brl(m.receita30)}</div><div className="muted">{m.pagamentos30} pagamentos</div></div>
        <div className="card"><div className="muted">Ticket médio (30 dias)</div><div className="price">{m.ticketMedio30 === null ? '-' : brl(m.ticketMedio30)}</div></div>
        <div className="card"><div className="muted">Renovação</div><div className="price">{m.taxaRenovacao === null ? '-' : `${m.taxaRenovacao}%`}</div><div className="muted">{m.renovaram} de {m.pagantes} pagantes pagaram mais de uma vez</div></div>
      </div>

      <div className="grid" style={{ marginBottom: 16 }}>
        <FunilTabela titulo="Funil dos últimos 30 dias" f={m.funil30} />
        <FunilTabela titulo="Funil de todos os tempos" f={m.funilTotal} />
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Cadastros por semana</h3>
        {m.semanas.length === 0 ? <p className="muted">Sem cadastros nas últimas 8 semanas.</p> : (
          <div className="dbars" role="img" aria-label="Cadastros por semana">
            {m.semanas.map((s) => (
              <div key={s.semana} className="dbar" title={`Semana de ${s.semana}: ${s.cadastros} cadastros`}>
                <i style={{ height: `${Math.round((s.cadastros / maxSem) * 100)}%` }} />
                <span>{s.semana}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card scroll">
        <h3 style={{ marginTop: 0 }}>Receita por plano (todos os tempos)</h3>
        <table>
          <thead><tr><th>Plano</th><th>Pagamentos</th><th>Receita</th></tr></thead>
          <tbody>
            {m.receitaPorPlano.length === 0 && <tr><td colSpan={3} className="muted">Nenhum pagamento confirmado ainda.</td></tr>}
            {m.receitaPorPlano.map((r) => <tr key={r.plano}><td>{r.plano}</td><td>{r.pagamentos}</td><td>{brl(r.centavos)}</td></tr>)}
          </tbody>
        </table>
      </div>
    </>
  );
}
