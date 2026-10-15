'use client';

import Link from 'next/link';
import { Statement, optionText } from '../question-body';
import { useEffect, useRef, useState } from 'react';

type Option = { id: string; text: string };
type PQ = { id: string; topic: string; statement: string; options: Option[]; sourceLine: string; signCode?: string; signImage?: string; images?: string[]; optionsAsImage?: boolean };
type Feedback = { correct: boolean; correctOptionId: string; explanation: string | null; legalRef: string | null; sourceLine: string; done: boolean; score?: { correct: number; total: number } };
type Tema = { id: string; nome: string; total: number };
type Grupo = { titulo?: string; temaTodos?: Tema; temas: Tema[] };

type Sessao = { attemptId: string; tema: string; questions: PQ[] };

export default function TreinoClient({ mundo, mundoNome, grupos, erros, agendadas = 0, tamanhos, tamanhoPadrao, minutosPorQuestao, gratis, temaInicial, sessaoInicial, onSair }: {
  mundo: string; mundoNome: string; grupos: Grupo[]; erros: number; agendadas?: number; tamanhos: number[]; tamanhoPadrao: number; minutosPorQuestao: number;
  gratis: number | null; temaInicial?: string; sessaoInicial?: Sessao; onSair?: () => void;
}) {
  const [sessao, setSessao] = useState<Sessao | null>(sessaoInicial ?? null);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [fb, setFb] = useState<Record<string, Feedback>>({});
  const [erro, setErro] = useState<{ msg: string; limit: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [tamanho, setTamanho] = useState(tamanhoPadrao);
  const iniciou = useRef(false);

  async function iniciar(tema: string) {
    setBusy(true); setErro(null);
    const r = await fetch('/api/treino/start', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tema, mundo, tamanho }) });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) { setErro({ msg: d.error ?? 'Não foi possível iniciar.', limit: d.code === 'limit' }); return; }
    setSessao(d); setIdx(0); setPicked({}); setFb({});
  }

  useEffect(() => {
    if (temaInicial && !iniciou.current && !sessaoInicial) { iniciou.current = true; void iniciar(temaInicial); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function responder(q: PQ, optionId: string) {
    if (!sessao || fb[q.id] || busy) return;
    setBusy(true);
    setPicked((p) => ({ ...p, [q.id]: optionId }));
    const r = await fetch('/api/treino/answer', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ attemptId: sessao.attemptId, questionId: q.id, optionId }) });
    const d = await r.json();
    setBusy(false);
    if (r.ok) setFb((f) => ({ ...f, [q.id]: d }));
    else { setErro({ msg: d.error ?? 'Erro ao corrigir.', limit: false }); setPicked((p) => { const n = { ...p }; delete n[q.id]; return n; }); }
  }

  if (!sessao) {
    const min = Math.max(1, Math.round(tamanho * minutosPorQuestao));
    return (
      <>
        <h1>Treino rápido · {mundoNome}</h1>
        <p className="lead muted" style={{ maxWidth: '36em' }}>
          Um pouquinho por vez é o melhor jeito de aprender. Escolha quantas questões quer fazer agora, sem relógio, e veja se acertou logo depois de responder.
          {gratis !== null && ` No plano grátis: ${gratis} treinos por dia.`}
        </p>
        <div className="card" style={{ marginBottom: 16 }}>
          <strong>Quantas questões?</strong>
          <div className="row" role="radiogroup" aria-label="Quantidade de questões" style={{ marginTop: 8 }}>
            {tamanhos.map((n) => (
              <button key={n} className={`btn ${n === tamanho ? '' : 'ghost'}`} role="radio" aria-checked={n === tamanho} onClick={() => setTamanho(n)}>{n} questões</button>
            ))}
          </div>
          <p className="muted" style={{ margin: '8px 0 0' }}>Leva uns {min} min. Dá pra fazer no intervalo. ☕</p>
        </div>
        {erro && <p role="alert" className="err">{erro.msg} {erro.limit && <Link href="/planos">Ver planos</Link>}</p>}
        <div className="grid" style={{ marginBlock: 16 }}>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>🎲 Surpreenda-me</h3>
            <p className="muted">Questões aleatórias de {mundoNome}, dando prioridade ao que você ainda não viu.</p>
            <button className="btn" disabled={busy} onClick={() => iniciar('aleatorio')}>Começar</button>
          </div>
          {erros > 0 && (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Caderno de erros</h3>
              <p className="muted">{erros} {erros === 1 ? 'questão para revisar hoje' : 'questões para revisar hoje'}. Cada uma volta em intervalos maiores (3 e 7 dias) até você dominar.{agendadas > 0 ? ` Outras ${agendadas} já estão agendadas.` : ''}</p>
              <button className="btn ghost" disabled={busy} onClick={() => iniciar('erros')}>Revisar agora</button>
            </div>
          )}
          {erros === 0 && agendadas > 0 && (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Caderno de erros</h3>
              <p className="muted" style={{ marginBottom: 0 }}>Revisão em dia. {agendadas} {agendadas === 1 ? 'questão volta' : 'questões voltam'} nos próximos dias.</p>
            </div>
          )}
        </div>
        <h2 style={{ fontSize: '1.2rem' }}>Ou escolha uma matéria</h2>
        {grupos.map((g, gi) => (
          <div className="card" key={gi} style={{ marginBottom: 12 }}>
            {g.titulo && (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' }}>
                <h3 style={{ margin: 0 }}>{g.titulo}</h3>
                {g.temaTodos && <button className="btn" style={{ padding: '2px 12px' }} disabled={busy} onClick={() => iniciar(g.temaTodos!.id)}>Misturar tudo de {g.titulo}</button>}
              </div>
            )}
            <div className="row" style={{ gap: 8, marginTop: g.titulo ? 10 : 0 }}>
              {g.temas.map((t) => (
                <button key={t.id} className="btn ghost" style={{ padding: '6px 14px' }} disabled={busy} onClick={() => iniciar(t.id)}>
                  {t.nome} <span style={{ opacity: .6, fontWeight: 400 }}>· {t.total}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
        <p className="muted"><Link href={`/app/${mundo}`}>Voltar para {mundoNome}</Link></p>
      </>
    );
  }

  const q = sessao.questions[idx]!;
  const f = fb[q.id];
  const respondidas = Object.keys(fb).length;
  const fim = respondidas === sessao.questions.length;
  const placar = Object.values(fb).filter((x) => x.correct).length;

  return (
    <>
      <div className="bar">
        <h1 style={{ fontSize: '1.2rem', margin: 0 }}>{sessao.tema === 'erros' ? 'Caderno de erros' : sessao.tema === 'personalizado' ? 'Simulado personalizado' : 'Treino rápido'}</h1>
        <span className="clock">{respondidas}/{sessao.questions.length} · {placar} {placar === 1 ? 'acerto' : 'acertos'}</span>
      </div>
      <div className="card">
        {q.signImage && (
          <figure style={{ margin: '0 0 12px', textAlign: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={q.signImage} alt={`Placa ${q.signCode}`} style={{ maxWidth: 160, maxHeight: 160, width: 'auto', height: 'auto' }} />
          </figure>
        )}
        <Statement text={q.statement} images={q.images} hideText={q.optionsAsImage} />
        {q.options.map((o) => {
          const state = !f ? '' : o.id === f.correctOptionId ? 'ok' : o.id === picked[q.id] ? 'bad' : '';
          return (
            <button key={o.id} className={`opt ${state}`} aria-pressed={!f && picked[q.id] === o.id} disabled={!!f || busy} onClick={() => responder(q, o.id)}>
              <span className="ltr">{o.id.toUpperCase()}</span><span>{optionText(o.text, o.id)}</span>
            </button>
          );
        })}
        {f && (
          <div className="demo why" style={{ transform: 'none', marginTop: 14, boxShadow: 'none' }} aria-live="polite">
            <strong>{f.correct ? 'Acertou.' : `Resposta certa: ${f.correctOptionId.toUpperCase()}.`}</strong>{' '}
            {f.explanation}
            {f.legalRef && <div className="muted" style={{ marginTop: 6 }}>Base legal: {f.legalRef}</div>}
          </div>
        )}
        <p className="muted" style={{ fontSize: '.8rem', marginBottom: 0 }}>{q.sourceLine}</p>
      </div>
      {erro && <p role="alert" className="err">{erro.msg}</p>}
      <div className="row">
        {idx > 0 && <button className="btn ghost" onClick={() => setIdx(idx - 1)}>Anterior</button>}
        {idx < sessao.questions.length - 1 ? (
          <button className="btn" disabled={!f} onClick={() => setIdx(idx + 1)}>Próxima</button>
        ) : fim ? (
          <button className="btn" onClick={() => (onSair ? onSair() : setSessao(null))}>Concluir: {placar} de {sessao.questions.length}</button>
        ) : null}
      </div>
    </>
  );
}
