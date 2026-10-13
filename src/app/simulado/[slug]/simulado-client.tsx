'use client';

import Link from 'next/link';
import { Statement, optionText } from '../../question-body';
import { useCallback, useEffect, useRef, useState } from 'react';

type Option = { id: string; text: string };
type PQ = { id: string; topic: string; statement: string; options: Option[]; sourceLine: string; signCode?: string; signImage?: string; images?: string[]; optionsAsImage?: boolean };
type Exam = { attemptId: string; durationMinutes: number; configVerified: boolean; shortExam: boolean; questions: PQ[]; remainingSeconds: number; draftAnswers: Record<string, string>; resumed: boolean };
type Review = {
  questionId: string; statement: string; images?: string[]; optionsAsImage?: boolean; options: Option[];
  selectedOptionId: string | null; correctOptionId: string; explanation: string | null; legalRef: string | null; sourceLine: string;
};
type Result = { correct: number; total: number; passed: boolean; minCorrect: number; review: Review[] };

function ReportError({ questionId }: { questionId: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [msg, setMsg] = useState('');
  async function send() {
    const r = await fetch('/api/questao/reportar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ questionId, reason: text }) });
    const d = await r.json().catch(() => ({}));
    if (r.ok) { setMsg('Obrigado! Vamos revisar esta questão.'); setOpen(false); } else setMsg(d.error ?? 'Não foi possível enviar.');
  }
  if (msg && !open) return <p className="muted">{msg}</p>;
  if (!open) return <button className="btn ghost" style={{ padding: '2px 10px', fontSize: '.85rem' }} onClick={() => setOpen(true)}>Reportar erro nesta questão</button>;
  return (
    <div>
      <label>O que está errado?<textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={1000} style={{ width: '100%' }} /></label>
      {msg && <p className="err">{msg}</p>}
      <div className="row"><button className="btn" onClick={send}>Enviar</button><button className="btn ghost" onClick={() => setOpen(false)}>Cancelar</button></div>
    </div>
  );
}

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function SimuladoClient({ slug, name }: { slug: string; name: string }) {
  const [exam, setExam] = useState<Exam | null>(null);
  const [error, setError] = useState<{ msg: string; limit: boolean } | null>(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [left, setLeft] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const finishing = useRef(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // evita iniciar duas provas (modo estrito do React em desenvolvimento)
    started.current = true;
    fetch('/api/simulado/start', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slug }) })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Object.assign(new Error(d.error ?? 'Erro ao iniciar'), { limit: d.code === 'limit' });
        setExam(d);
        setLeft(d.remainingSeconds);
        setAnswers(d.draftAnswers ?? {});
      })
      .catch((e: Error & { limit?: boolean }) => setError({ msg: e.message, limit: !!e.limit }));
  }, [slug]);

  const finish = useCallback(async () => {
    if (!exam || finishing.current) return;
    finishing.current = true;
    const r = await fetch('/api/simulado/finish', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        attemptId: exam.attemptId,
        answers: exam.questions.map((q) => ({ questionId: q.id, selectedOptionId: answers[q.id] ?? null })),
      }),
    });
    const d = await r.json();
    if (r.ok) setResult(d);
    else { setError({ msg: d.error ?? 'Erro ao corrigir', limit: false }); finishing.current = false; }
  }, [exam, answers]);

  // Autosave das respostas (com pequeno atraso) para poder retomar se a página recarregar.
  useEffect(() => {
    if (!exam || result || Object.keys(answers).length === 0) return;
    const t = setTimeout(() => {
      void fetch('/api/simulado/save', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ attemptId: exam.attemptId, answers }) }).catch(() => {});
    }, 600);
    return () => clearTimeout(t);
  }, [answers, exam, result]);

  useEffect(() => {
    if (!exam || result) return;
    if (left <= 0) { void finish(); return; }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [exam, left, result, finish]);

  if (error) {
    return (
      <div className="card" style={{ maxWidth: 480, margin: '24px auto' }}>
        <p role="alert" className="err">{error.msg}</p>
        <div className="row">
          {error.limit && <Link className="btn" href="/planos">Ver planos</Link>}
          <Link className="btn ghost" href="/app">Minha área</Link>
        </div>
      </div>
    );
  }
  if (!exam) return <p>Montando seu simulado…</p>;

  if (result) {
    return (
      <>
        <h1>{result.passed ? 'Aprovado no simulado' : 'Não atingiu a nota mínima'}</h1>
        <div className="card">
          <p style={{ fontSize: '1.4rem', margin: 0 }}>{result.correct} de {result.total} acertos ({Math.round((result.correct / result.total) * 100)}%)</p>
          <p className="muted">Mínimo para aprovação neste simulado: {result.minCorrect}.</p>
        </div>
        <div className="row"><Link className="btn" href="/app">Ver minhas estatísticas</Link><a className="btn ghost" href={`/simulado/${slug}`}>Fazer outro</a></div>
        <h2>Revisão</h2>
        {result.review.map((r, i) => (
          <div className="card" key={r.questionId} style={{ marginBottom: 12 }}>
            <p style={{ marginTop: 0 }}><strong>{i + 1}.</strong></p>
            <Statement text={r.statement} images={r.images} hideText={r.optionsAsImage} />
            {r.options.map((o) => (
              <div key={o.id} className={`opt ${o.id === r.correctOptionId ? 'ok' : o.id === r.selectedOptionId ? 'bad' : ''}`}>
                <span className="ltr">{o.id.toUpperCase()}</span><span>{optionText(o.text, o.id)}</span>
              </div>
            ))}
            {r.selectedOptionId === null && <p className="muted">Sem resposta.</p>}
            {r.explanation && <p className="muted">{r.explanation}</p>}
            {r.legalRef && !r.legalRef.includes('conferir') && !r.legalRef.startsWith('Banco Nacional') && <p className="muted">Base legal: {r.legalRef}</p>}
            <p className="muted" style={{ fontSize: '.8rem' }}>{r.sourceLine}</p>
            <ReportError questionId={r.questionId} />
          </div>
        ))}
      </>
    );
  }

  const q = exam.questions[idx]!;
  const answered = Object.keys(answers).length;
  return (
    <>
      <h1 style={{ fontSize: '1.2rem' }}>{name}</h1>
      <div className="bar">
        <span>Questão {idx + 1} de {exam.questions.length}</span>
        <span className={`clock ${left <= 300 ? 'low' : ''}`} aria-label="Tempo restante">{fmt(left)}</span>
      </div>
      <div className="meter" aria-hidden style={{ marginBottom: 14 }}><i style={{ width: `${(answered / exam.questions.length) * 100}%` }} /></div>
      <nav className="sheet" aria-label="Navegar entre as questões">
        {exam.questions.map((qq, i) => (
          <button key={qq.id} className={`dot ${answers[qq.id] ? 'done' : ''} ${i === idx ? 'cur' : ''}`} aria-label={`Questão ${i + 1}${answers[qq.id] ? ', respondida' : ''}`} aria-current={i === idx} onClick={() => setIdx(i)}>{i + 1}</button>
        ))}
      </nav>
      {exam.resumed && <p className="note">Retomamos o simulado de onde você parou.</p>}
      {(exam.shortExam || !exam.configVerified) && (
        <p className="note">
          {exam.shortExam ? 'Versão de demonstração com menos questões. ' : ''}
          {!exam.configVerified ? 'Regras da prova ainda não confirmadas com o Detran.' : ''}
        </p>
      )}
      <div className="card">
        <Statement text={q.statement} images={q.images} hideText={q.optionsAsImage} />
        {q.signImage && (
          <figure style={{ margin: '0 0 12px', textAlign: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={q.signImage} alt={`Placa ${q.signCode}`} style={{ maxWidth: 160, maxHeight: 160, width: 'auto', height: 'auto' }} />
            <figcaption className="muted" style={{ fontSize: '.8rem' }}>Placa {q.signCode}</figcaption>
          </figure>
        )}
        {q.options.map((o) => (
          <button key={o.id} className="opt" aria-pressed={answers[q.id] === o.id} onClick={() => setAnswers((a) => ({ ...a, [q.id]: o.id }))}>
            <span className="ltr">{o.id.toUpperCase()}</span><span>{optionText(o.text, o.id)}</span>
          </button>
        ))}
        <p className="muted" style={{ fontSize: '.8rem', marginBottom: 0 }}>{q.sourceLine}</p>
      </div>
      <div className="row">
        <button className="btn ghost" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>Anterior</button>
        {idx < exam.questions.length - 1 ? (
          <button className="btn" onClick={() => setIdx(idx + 1)}>Próxima</button>
        ) : (
          <button className="btn" onClick={finish}>Finalizar ({answered}/{exam.questions.length})</button>
        )}
      </div>
    </>
  );
}
