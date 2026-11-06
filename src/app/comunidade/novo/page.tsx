import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { podePostar } from '@/lib/comunidade';
import { MAX_TEXTO, MUNDOS_COM, MUNDO_COM_NOME, TIPOS, mundoComValido, tipoValido } from '@/lib/comunidade-regras';
import { questaoPorId } from '@/lib/questao-por-id';
import { mundoDeQuestao } from '@/lib/mundos';
import { publicarAction } from '../actions';

export const metadata = { title: 'Nova publicação', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function Novo({ searchParams }: { searchParams: Promise<{ tipo?: string; mundo?: string; questao?: string; texto?: string; erro?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/entrar');
  const sp = await searchParams;
  const pode = podePostar(user);
  if (!pode.ok) redirect(`/comunidade?erro=${encodeURIComponent(pode.erro)}`);
  const q = sp.questao ? questaoPorId(sp.questao) : null;
  const tipo = sp.tipo && tipoValido(sp.tipo) ? sp.tipo : q ? 'duvida' : 'conversa';
  const mundo = sp.mundo && mundoComValido(sp.mundo) ? sp.mundo : q ? mundoDeQuestao(q.id) : 'geral';
  return (
    <div style={{ maxWidth: 640 }}>
      <h1>Nova publicação</h1>
      <p className="muted"><Link href="/comunidade">← Voltar à comunidade</Link></p>
      {sp.erro && <p className="err" role="alert">{sp.erro}</p>}
      {q && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="muted">Dúvida sobre a questão {q.id}</div>
          <p style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>{q.statement.length > 400 ? q.statement.slice(0, 400) + '…' : q.statement}</p>
        </div>
      )}
      <form action={publicarAction} className="card">
        {q && <input type="hidden" name="questao" value={q.id} />}
        <label>Tipo<select name="tipo" defaultValue={tipo}>{TIPOS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
        <label>Área<select name="mundo" defaultValue={mundo}>{MUNDOS_COM.map((m) => <option key={m} value={m}>{MUNDO_COM_NOME[m]}</option>)}</select></label>
        <label>Sua mensagem<textarea name="texto" required rows={6} maxLength={MAX_TEXTO} defaultValue={(sp.texto ?? '').slice(0, MAX_TEXTO)} placeholder="Explique sua dúvida com calma: o que você entendeu e onde travou." /></label>
        <p className="muted">Sem links, e-mails, telefones ou outros dados pessoais. Você publica como <strong>{user.nickname}</strong>.</p>
        <div className="row"><button className="btn">Publicar</button></div>
      </form>
    </div>
  );
}
