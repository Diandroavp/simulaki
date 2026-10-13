'use client';

import Link from 'next/link';
import { Statement, optionText } from '../question-body';
import { useState } from 'react';

type Option = { id: string; text: string };
type PQ = { id: string; topic: string; statement: string; options: Option[]; sourceLine: string; signCode?: string; signImage?: string; images?: string[]; optionsAsImage?: boolean };
type Feedback = { correct: boolean; correctOptionId: string; explanation: string | null; legalRef: string | null; sourceLine: string; done: boolean; score?: { correct: number; total: number } };
type Tema = { id: string; nome: string; total: number };

export default function TreinoClient({ temas, erros, tamanho, gratis }: { temas: Tema[]; erros: number; tamanho: number; gratis: number | null }) {
  const [sessao, setSessao] = useState<{ attemptId: string; tema: string; questions: PQ[] } | null>(null);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [fb, setFb] = useState<Record<string, Feedback>>({});
  const [erro, setErro] = useState<{ msg: string; limit: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  async function iniciar(tema: string) {
    setBusy(true); setErro(null);
    const r = await fetch('/api/treino/start', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tema }) });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) { setErro({ msg: d.error ?? 'Não foi possível iniciar.', limit: d.code === 'limit' }); return; }
    setSessao(d); setIdx(0); setPicked({}); setFb({});
  }

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
    return (
      <>
        <h1>Treino por tema</h1>
        <p className="lead muted" style={{ maxWidth: '36em' }}>
          {tamanho} questões por sessão, sem relógio. Você vê se acertou, a explicação e a fonte logo depois de responder.
          {gratis !== null && ` No plano grátis: ${gratis} treinos por dia.`}
        </p>
        {erro && <p role="alert" className="err">{erro.msg} {erro.limit && <Link href="/planos">Ver planos</Link>}</p>}
        <div className="grid" style={{ marginBlock: 16 }}>
          {erros > 0 && (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Caderno de erros</h3>
              <p className="muted">{erros} {erros === 1 ? 'questão que você errou' : 'questões que você errou'} e ainda não acertou depois.</p>
              <button className="btn" disabled={busy} onClick={() => iniciar('erros')}>Refazer meus erros</button>
            </div>
          )}
          {temas.map((t) => (
            <div className="card" key={t.id}>
              <h3 style={{ marginTop: 0 }}>{t.nome}</h3>
              <p className="muted">{t.total} questões no banco</p>
              <button className="btn ghost" disabled={busy} onClick={() => iniciar(t.id)}>Treinar</button>
            </div>
          ))}
        </div>
        <p className="muted"><Link href="/app">Voltar para minha área</Link></p>
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
        <h1 style={{ fontSize: '1.2rem', margin: 0 }}>{sessao.tema === 'erros' ? 'Caderno de erros' : 'Treino'}</h1>
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
          <button className="btn" onClick={() => setSessao(null)}>Concluir: {placar} de {sessao.questions.length}</button>
        ) : null}
      </div>
    </>
  );
}
