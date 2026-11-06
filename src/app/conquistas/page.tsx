import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { conquistasDe } from '@/lib/conquistas-db';
import { NIVEIS, TODOS_TROFEUS, XP_POR_TROFEU } from '@/lib/conquistas';
import { PageHero } from '../page-hero';

export const metadata = {
  title: 'Conquistas e níveis',
  description: 'Suba de nível de Calouro a Lenda e ganhe troféus a cada simulado, sequência de estudos e meta batida no Simulaki.',
  alternates: { canonical: '/conquistas' },
};
export const dynamic = 'force-dynamic';

export default async function Conquistas() {
  const user = await getCurrentUser();
  const c = user ? await conquistasDe(user.id) : null;
  const indice = c?.indice ?? -1;
  return (
    <>
      <PageHero title={<>Suas <em>conquistas</em></>} lead="Cada questão e cada simulado dão XP. Suba de Calouro a Lenda e junte troféus pelo caminho." />

      {c ? (
        <section className="card nivel-hero" aria-label="Seu nível">
          <div className="nivel-emoji" aria-hidden>{c.nivel.emoji}</div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div className="muted">Seu nível</div>
            <h2 style={{ margin: '0 0 4px' }}>{c.nivel.nome}</h2>
            <div className="barra" role="progressbar" aria-valuenow={c.progresso} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso até o próximo nível"><i style={{ width: `${c.progresso}%` }} /></div>
            <p className="muted" style={{ margin: '8px 0 0' }}>
              {c.xp} XP · {c.proximo ? `faltam ${c.faltamXp} XP para ${c.proximo.emoji} ${c.proximo.nome}` : 'você chegou ao topo!'}
            </p>
            <p className="muted" style={{ margin: '4px 0 0' }}>
              🏅 {c.ganhos} de {c.trofeus.length} troféus{c.sequenciaAtual > 0 ? ` · 🔥 ${c.sequenciaAtual} ${c.sequenciaAtual === 1 ? 'dia' : 'dias'} seguidos` : ''}
            </p>
          </div>
        </section>
      ) : (
        <section className="card nivel-hero">
          <div className="nivel-emoji" aria-hidden>🎒</div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <h2 style={{ margin: '0 0 6px' }}>Comece como Calouro</h2>
            <p className="muted" style={{ margin: 0 }}>Crie sua conta grátis e faça o primeiro simulado para ganhar seu primeiro troféu.</p>
            <div className="row"><Link className="btn" href="/cadastro">Criar conta grátis</Link><Link className="btn ghost" href="/entrar">Já tenho conta</Link></div>
          </div>
        </section>
      )}

      <h2>Escada de níveis</h2>
      <ol className="escada">
        {NIVEIS.map((n, i) => (
          <li key={n.nome} className={i === indice ? 'atual' : i < indice ? 'feito' : ''} aria-current={i === indice ? 'step' : undefined}>
            <span className="e" aria-hidden>{n.emoji}</span>
            <b>{n.nome}</b>
            <small>{n.xp} XP</small>
          </li>
        ))}
      </ol>

      <h2>Troféus</h2>
      <div className="trofeus">
        {(c ? c.trofeus : TODOS_TROFEUS.map((t) => ({ ...t, ganho: false, atual: 0 }))).map((t) => (
          <div key={t.id} className={`trofeu ${t.ganho ? 'on' : 'off'}`}>
            <span className="e" aria-hidden>{t.emoji}</span>
            <div>
              <b>{t.titulo}</b>
              <p className="muted" style={{ margin: '2px 0 6px' }}>{t.descricao}</p>
              {t.ganho ? <span className="badge">Conquistado</span> : c && t.meta > 1 && <div className="barra mini" aria-hidden><i style={{ width: `${Math.round((t.atual / t.meta) * 100)}%` }} /></div>}
              {!t.ganho && c && t.meta > 1 && <small className="muted">{t.atual}/{t.meta}</small>}
            </div>
          </div>
        ))}
      </div>
      <p className="muted" style={{ marginTop: 24 }}>
        Como ganhar XP: cada acerto vale 2, cada erro vale 1 (errar também ensina), cada simulado concluído vale 20, cada treino rápido vale 5 e cada troféu vale {XP_POR_TROFEU}.
      </p>
    </>
  );
}
