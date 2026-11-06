import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { feed, podePostar, totalDenunciasAbertas } from '@/lib/comunidade';
import { MUNDOS_COM, MUNDO_COM_NOME, TIPOS, mundoComValido, tipoValido } from '@/lib/comunidade-regras';
import { PageHero } from '../page-hero';
import { apelidoAction } from './actions';
import { Papel, Selo } from './post-card';

export const metadata = { title: 'Comunidade', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const quando = (d: Date) => d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Manaus' });

export default async function Comunidade({ searchParams }: { searchParams: Promise<{ mundo?: string; tipo?: string; erro?: string; ok?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/entrar');
  const sp = await searchParams;
  const mundo = sp.mundo && mundoComValido(sp.mundo) ? sp.mundo : null;
  const tipo = sp.tipo && tipoValido(sp.tipo) ? sp.tipo : null;
  const [itens, abertas] = await Promise.all([feed(mundo, tipo), user.moderator || user.role === 'admin' ? totalDenunciasAbertas() : Promise.resolve(0)]);
  const pode = podePostar(user);
  const link = (m: string | null, t: string | null) => `/comunidade${m || t ? '?' : ''}${[m && `mundo=${m}`, t && `tipo=${t}`].filter(Boolean).join('&')}`;
  return (
    <>
      <PageHero title={<>Comunidade <em>Simulaki</em></>} lead="Tire dúvidas, ajude colegas e compartilhe suas conquistas." />
      {sp.erro && <p className="err" role="alert">{sp.erro}</p>}
      {sp.ok && <p className="okmsg">{sp.ok}</p>}

      <details className="card" style={{ marginBottom: 16 }}>
        <summary><strong>Regras da comunidade</strong></summary>
        <ul>
          <li>Respeite todo mundo. Dúvida boa é bem-vinda; deboche não.</li>
          <li>Não compartilhe dados pessoais: telefone, endereço, e-mail, redes sociais ou fotos suas.</li>
          <li>Links não são permitidos, por segurança.</li>
          <li>Moderadores podem ocultar mensagens e silenciar quem desrespeitar as regras. Use "Denunciar" se encontrar algo errado.</li>
        </ul>
      </details>

      {!user.nickname ? (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Escolha seu apelido</h2>
          <p className="muted">É o nome que os outros alunos vão ver. Não use seu nome completo. De 3 a 20 letras (sem acento), números ou _.</p>
          <form action={apelidoAction}>
            <label>Apelido<input name="apelido" required minLength={3} maxLength={20} autoComplete="off" placeholder="ex.: Fera_do_ENEM" /></label>
            <div className="row"><button className="btn">Salvar apelido</button></div>
          </form>
        </div>
      ) : (
        <>
          <div className="row" style={{ marginTop: 0, justifyContent: 'space-between', alignItems: 'center' }}>
            <p className="muted" style={{ margin: 0 }}>Você aparece como <strong>{user.nickname}</strong>.</p>
            <div className="row" style={{ margin: 0 }}>
              {(user.moderator || user.role === 'admin') && <Link className="btn ghost" href="/comunidade/moderacao">🛡️ Moderação{abertas > 0 ? ` (${abertas})` : ''}</Link>}
              {pode.ok ? <Link className="btn" href="/comunidade/novo">Nova publicação</Link> : <span className="muted">{pode.erro}</span>}
            </div>
          </div>
          <div className="faixa-niveis" style={{ justifyContent: 'flex-start', marginTop: 16 }}>
            <Link href={link(null, tipo)} className={`btn ${mundo ? 'ghost' : ''}`} style={{ padding: '6px 14px' }}>Tudo</Link>
            {MUNDOS_COM.map((m) => <Link key={m} href={link(m, tipo)} className={`btn ${mundo === m ? '' : 'ghost'}`} style={{ padding: '6px 14px' }}>{MUNDO_COM_NOME[m]}</Link>)}
          </div>
          <div className="faixa-niveis" style={{ justifyContent: 'flex-start' }}>
            <Link href={link(mundo, null)} className={`btn ${tipo ? 'ghost' : ''}`} style={{ padding: '6px 14px' }}>Todos os tipos</Link>
            {TIPOS.map((t) => <Link key={t.id} href={link(mundo, t.id)} className={`btn ${tipo === t.id ? '' : 'ghost'}`} style={{ padding: '6px 14px' }}>{t.label}</Link>)}
          </div>
          {itens.length === 0 && <div className="card"><p style={{ margin: 0 }}>Ainda não há publicações aqui. Que tal começar com uma dúvida ou um resultado?</p></div>}
          {itens.map((i) => (
            <Link key={i.id} href={`/comunidade/${i.id}`} className="card" style={{ display: 'block', marginBottom: 12, color: 'inherit', textDecoration: 'none' }}>
              <div className="row" style={{ marginTop: 0, alignItems: 'center', gap: 8 }}>
                <strong>{i.autor ?? 'Conta excluída'}</strong><Papel papel={i.papel} /><Selo kind={i.kind} /><span className="badge">{MUNDO_COM_NOME[i.mundo as keyof typeof MUNDO_COM_NOME] ?? i.mundo}</span><span className="muted">{quando(i.createdAt)}</span>
              </div>
              <p style={{ margin: '10px 0 6px', whiteSpace: 'pre-wrap' }}>{i.body.length > 280 ? i.body.slice(0, 280) + '…' : i.body}</p>
              <span className="muted">💬 {i.respostas} {i.respostas === 1 ? 'resposta' : 'respostas'}</span>
            </Link>
          ))}
        </>
      )}
    </>
  );
}
