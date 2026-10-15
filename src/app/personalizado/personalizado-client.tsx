'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import SimuladoClient from '../simulado/[slug]/simulado-client';
import TreinoClient from '../treino/treino-client';

type Banco = {
  slug: string; nome: string; bank: string; total: number;
  temas: { id: string; nome: string; total: number }[];
  anos: number[]; cadernos: { id: string; ano: number; dia: number; total: number }[]; minutosPorQuestao: number; distribuicao: Record<string, number> | null; metaPct: number;
};
type Modo = 'prova' | 'treino';
type Spec = { bank: string; modo: Modo; itens: Record<string, number>; minutos?: number; novas: boolean; erradas: boolean; anos?: number[]; caderno?: string };
type Sessao = { attemptId: string; tema: string; questions: never[]; faltou?: number };

export default function PersonalizadoClient({ mundo, bancos, liberado, retomar, limites }: {
  mundo: string; bancos: Banco[]; liberado: boolean; retomar: boolean; limites: { maxQuestoes: number; minMinutos: number; maxMinutos: number };
}) {
  const [bankId, setBankId] = useState(bancos[0]?.bank ?? '');
  const banco = bancos.find((b) => b.bank === bankId);
  const [itens, setItens] = useState<Record<string, number>>({});
  const [modo, setModo] = useState<Modo>('prova');
  const [minutosManual, setMinutosManual] = useState<number | null>(null);
  const [novas, setNovas] = useState(true);
  const [erradas, setErradas] = useState(false);
  const [anos, setAnos] = useState<number[]>([]);
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);
  const [prova, setProva] = useState<Spec | { resume: true } | null>(retomar ? { resume: true } : null);
  const [treino, setTreino] = useState<Sessao | null>(null);

  const total = useMemo(() => Object.values(itens).reduce((a, n) => a + n, 0), [itens]);
  const minutosAuto = banco ? Math.max(limites.minMinutos, Math.ceil(total * banco.minutosPorQuestao)) : 0;
  const minutos = minutosManual ?? minutosAuto;

  if (prova) return <SimuladoClient slug="personalizado" name="Simulado personalizado" custom={prova as Record<string, unknown>} />;
  if (treino) return <TreinoClient mundo={mundo} mundoNome={mundo} grupos={[]} erros={0} tamanhos={[]} tamanhoPadrao={0} minutosPorQuestao={1} gratis={null} sessaoInicial={treino as never} onSair={() => setTreino(null)} />;
  if (!banco) return <><h1>Simulado personalizado</h1><p className="muted">Ainda não há bancos de questões liberados.</p></>;

  const setQtd = (id: string, max: number, v: number) => setItens((m) => {
    const n = Math.max(0, Math.min(max, Math.floor(v) || 0));
    const { [id]: _, ...resto } = m; void _;
    return n > 0 ? { ...resto, [id]: n } : resto;
  });
  const trocarBanco = (b: string) => { setBankId(b); setItens({}); setAnos([]); setMinutosManual(null); setErro(''); };
  const comoNaProva = () => {
    if (!banco.distribuicao) return;
    const novo: Record<string, number> = {};
    for (const t of banco.temas) { const q = Math.min(banco.distribuicao[t.id] ?? 0, t.total); if (q > 0) novo[t.id] = q; }
    setItens(novo); setMinutosManual(null);
  };

  async function refazer(caderno: string) {
    setErro('');
    const spec: Spec = { bank: banco!.bank, modo: 'prova', itens: {}, novas: false, erradas: false, caderno };
    setProva(spec);
  }

  async function comecar() {
    setErro('');
    if (total === 0) { setErro('Escolha ao menos uma questão.'); return; }
    if (total > limites.maxQuestoes) { setErro(`No máximo ${limites.maxQuestoes} questões por simulado.`); return; }
    const spec: Spec = { bank: banco!.bank, modo, itens, novas, erradas, ...(anos.length ? { anos } : {}), ...(modo === 'prova' ? { minutos } : {}) };
    if (modo === 'prova') { setProva(spec); return; }
    setBusy(true);
    const r = await fetch('/api/personalizado/start', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ custom: spec }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErro(d.error ?? 'Não foi possível iniciar.'); return; }
    setTreino(d);
  }

  return (
    <>
      <h1>Monte seu simulado</h1>
      <p className="lead muted" style={{ maxWidth: '38em' }}>
        Escolha as matérias e quantas questões quer de cada. Faça como uma prova, com relógio e resultado no final, ou como treino, com a correção logo depois de cada resposta.
        {' '}Quer só um treino curtinho? Use o <Link href={`/treino?mundo=${mundo}`}>treino rápido</Link>.
      </p>
      {!liberado && (
        <p className="note">O simulado personalizado faz parte do plano pago. <Link href="/planos">Ver planos</Link></p>
      )}

      {bancos.length > 1 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>1. Qual prova?</h3>
          <div className="row">
            {bancos.map((b) => (
              <button key={b.bank} className={`btn ${b.bank === bankId ? '' : 'ghost'}`} aria-pressed={b.bank === bankId} onClick={() => trocarBanco(b.bank)}>
                {b.nome} <span style={{ opacity: .7, fontWeight: 400 }}>· {b.total}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {banco.cadernos.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Refazer uma prova do ENEM</h3>
          <p className="muted" style={{ marginTop: 0 }}>A prova de um dia inteiro, com as questões na ordem real e o tempo oficial (dia 1: 5h30; dia 2: 5h). Se faltar alguma questão, o tempo é ajustado.</p>
          <ul className="pers-list">
            {[...new Set(banco.cadernos.map((c) => c.ano))].map((ano) => (
              <li key={ano}>
                <strong>ENEM {ano}</strong>
                <div className="row" style={{ gap: 6 }}>
                  {banco.cadernos.filter((c) => c.ano === ano).map((c) => (
                    <button key={c.id} className="btn ghost" style={{ padding: '4px 12px' }} disabled={!liberado} onClick={() => refazer(c.id)}>
                      Dia {c.dia} <span style={{ opacity: .7, fontWeight: 400 }}>· {c.total} questões</span>
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' }}>
          <h3 style={{ margin: 0 }}>{bancos.length > 1 ? '2. ' : '1. '}Matérias e quantidades</h3>
          <span className="row">
            {banco.distribuicao && <button className="btn ghost" style={{ padding: '2px 10px' }} onClick={comoNaProva}>Como na prova real</button>}
            <button className="btn ghost" style={{ padding: '2px 10px' }} onClick={() => setItens({})} disabled={total === 0}>Zerar</button>
          </span>
        </div>
        <ul className="pers-list">
          {banco.temas.map((t) => {
            const n = itens[t.id] ?? 0;
            return (
              <li key={t.id} className={n > 0 ? 'on' : ''}>
                <div>
                  <strong>{t.nome}</strong>
                  <div className="muted" style={{ fontSize: '.85rem' }}>{t.total} {t.total === 1 ? 'questão' : 'questões'} no banco</div>
                </div>
                <div className="stepper">
                  <button aria-label={`Menos ${t.nome}`} onClick={() => setQtd(t.id, t.total, n - 1)} disabled={n === 0}>−</button>
                  <input aria-label={`Quantidade de ${t.nome}`} inputMode="numeric" value={n} onChange={(e) => setQtd(t.id, t.total, Number(e.target.value.replace(/\D/g, '')))} />
                  <button aria-label={`Mais ${t.nome}`} onClick={() => setQtd(t.id, t.total, n + 1)} disabled={n >= t.total}>+</button>
                  <button className="max" onClick={() => setQtd(t.id, t.total, Math.min(t.total, limites.maxQuestoes - (total - n)))} disabled={n >= t.total || total - n >= limites.maxQuestoes}>máx</button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>{bancos.length > 1 ? '3. ' : '2. '}Como fazer</h3>
        <div className="row" role="radiogroup" aria-label="Modo">
          <button className={`btn ${modo === 'prova' ? '' : 'ghost'}`} role="radio" aria-checked={modo === 'prova'} onClick={() => setModo('prova')}>Prova, com relógio</button>
          <button className={`btn ${modo === 'treino' ? '' : 'ghost'}`} role="radio" aria-checked={modo === 'treino'} onClick={() => setModo('treino')}>Treino, correção na hora</button>
        </div>
        <p className="muted" style={{ marginBottom: 8 }}>
          {modo === 'prova' ? 'Você responde tudo, pode voltar e trocar, e vê o resultado e a revisão no final.' : 'Cada resposta é corrigida na hora, com explicação. Sem relógio.'}
        </p>
        {modo === 'prova' && (
          <label style={{ display: 'block', marginBottom: 8 }}>Tempo (minutos)
            <input type="number" min={limites.minMinutos} max={limites.maxMinutos} value={minutos} style={{ width: 100, marginLeft: 8 }}
              onChange={(e) => setMinutosManual(Math.max(0, Number(e.target.value) || 0))} />
            <span className="muted"> {total > 0 ? `sugerido: ${minutosAuto} min (${banco.minutosPorQuestao} min por questão)` : ''}</span>
          </label>
        )}
        <label className="chk"><input type="checkbox" checked={novas} disabled={erradas} onChange={(e) => setNovas(e.target.checked)} /> Priorizar questões que ainda não respondi</label>
        <label className="chk"><input type="checkbox" checked={erradas} onChange={(e) => setErradas(e.target.checked)} /> Só questões que errei e ainda não acertei</label>
        {banco.anos.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div className="muted" style={{ marginBottom: 4 }}>Anos da prova {anos.length === 0 ? '(todos)' : `(${anos.length} selecionados)`}</div>
            <div className="row" style={{ gap: 6 }}>
              {banco.anos.map((y) => (
                <button key={y} className={`btn ${anos.includes(y) ? '' : 'ghost'}`} style={{ padding: '2px 10px' }} aria-pressed={anos.includes(y)}
                  onClick={() => setAnos((a) => (a.includes(y) ? a.filter((x) => x !== y) : [...a, y]))}>{y}</button>
              ))}
              {anos.length > 0 && <button className="btn ghost" style={{ padding: '2px 10px' }} onClick={() => setAnos([])}>Todos</button>}
            </div>
          </div>
        )}
      </div>

      <div className="card pers-resumo">
        <div>
          <strong style={{ fontSize: '1.2rem' }}>{total} {total === 1 ? 'questão' : 'questões'}</strong>
          <span className="muted">{modo === 'prova' && total > 0 ? ` · ${minutos} min · meta de ${banco.metaPct}% de acertos` : ''}</span>
        </div>
        <button className="btn" disabled={busy || total === 0 || !liberado} onClick={comecar}>{modo === 'prova' ? 'Começar a prova' : 'Começar o treino'}</button>
      </div>
      {erro && <p role="alert" className="err">{erro}</p>}
      <p className="muted"><Link href={`/app/${mundo}`}>Voltar</Link></p>
    </>
  );
}
