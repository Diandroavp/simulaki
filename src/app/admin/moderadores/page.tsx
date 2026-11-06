import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { moderadores } from '@/lib/comunidade';
import { elegerAction } from '../../comunidade/actions';

export const dynamic = 'force-dynamic';

export default async function Moderadores({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  if (!(await requireAdmin())) redirect('/');
  const sp = await searchParams;
  const lista = await moderadores();
  return (
    <div style={{ maxWidth: 640 }}>
      <h1>Moderadores</h1>
      <p><Link href="/admin">← Gestão</Link></p>
      <p className="muted">Moderadores veem as denúncias da comunidade, ocultam mensagens e silenciam quem desrespeitar as regras. Não veem dados financeiros da Gestão.</p>
      {sp.erro && <p className="err" role="alert">{sp.erro}</p>}
      {sp.ok && <p className="okmsg">{sp.ok}</p>}
      <form action={elegerAction} className="card">
        <label>E-mail da conta (já cadastrada, com e-mail confirmado)<input name="email" type="email" required /></label>
        <input type="hidden" name="ativo" value="1" />
        <div className="row"><button className="btn">Tornar moderador</button></div>
      </form>
      <h2 style={{ fontSize: '1.3rem' }}>Moderadores atuais ({lista.length})</h2>
      {lista.length === 0 && <p className="muted">Nenhum além dos administradores.</p>}
      {lista.map((m) => (
        <form key={m.id} action={elegerAction} className="row" style={{ alignItems: 'center' }}>
          <input type="hidden" name="email" value={m.email} /><input type="hidden" name="ativo" value="0" />
          <span><strong>{m.apelido ?? m.name}</strong> <span className="muted">{m.email}</span></span>
          <button className="btn ghost">Remover</button>
        </form>
      ))}
    </div>
  );
}
