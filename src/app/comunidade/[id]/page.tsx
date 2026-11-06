import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { podePostar, topico } from '@/lib/comunidade';
import { MAX_TEXTO, MUNDO_COM_NOME } from '@/lib/comunidade-regras';
import { questaoPorId } from '@/lib/questao-por-id';
import { responderAction } from '../actions';
import { Mensagem } from '../post-card';

export const metadata = { title: 'Comunidade', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function Topico({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/entrar');
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const sp = await searchParams;
  const t = await topico(id, user.moderator || user.role === 'admin');
  if (!t) notFound();
  const q = t.post.questionId ? questaoPorId(t.post.questionId) : null;
  const pode = podePostar(user);
  return (
    <div style={{ maxWidth: 720 }}>
      <p className="muted"><Link href="/comunidade">← Comunidade</Link> · {MUNDO_COM_NOME[t.post.mundo as keyof typeof MUNDO_COM_NOME] ?? t.post.mundo}</p>
      {sp.erro && <p className="err" role="alert">{sp.erro}</p>}
      {sp.ok && <p className="okmsg">{sp.ok}</p>}
      {t.post.status === 'hidden' && <p className="note">Esta publicação está oculta para os alunos (visível só para moderadores).</p>}
      {q && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="muted">Questão {q.id}</div>
          <p style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>{q.statement.length > 500 ? q.statement.slice(0, 500) + '…' : q.statement}</p>
        </div>
      )}
      <Mensagem item={t.post} raiz={t.post.id} meuId={user.id} />
      <h2 style={{ fontSize: '1.2rem' }}>{t.respostas.length} {t.respostas.length === 1 ? 'resposta' : 'respostas'}</h2>
      {t.respostas.map((r) => <Mensagem key={r.id} item={r} raiz={t.post.id} meuId={user.id} resposta />)}
      {t.post.status === 'visible' && (pode.ok ? (
        <form action={responderAction} className="card">
          <input type="hidden" name="id" value={t.post.id} />
          <label>Sua resposta<textarea name="texto" required rows={4} maxLength={MAX_TEXTO} placeholder="Ajude com calma e explique o caminho, não só a resposta." /></label>
          <div className="row"><button className="btn">Responder</button></div>
        </form>
      ) : <p className="muted">{pode.erro} <Link href="/comunidade">Voltar</Link></p>)}
    </div>
  );
}
