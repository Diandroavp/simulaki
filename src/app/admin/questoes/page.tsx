import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { hardestQuestions, openFeedback } from '@/lib/feedback';
import { loadQuestions } from '@/lib/questions';
import { resolveFeedbackAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function AdminQuestoes() {
  if (!(await requireAdmin())) redirect('/');
  const [feedback, hard] = await Promise.all([openFeedback(), hardestQuestions()]);
  const byId = new Map(loadQuestions('AM').map((q) => [q.id, q]));
  const line = (id: string) => byId.get(id)?.statement ?? '(questão não encontrada)';
  return (
    <>
      <h1>Questões</h1>
      <p><Link href="/admin">Gestão</Link></p>
      <h2>Avisos de erro ({feedback.length})</h2>
      {feedback.length === 0 && <p className="muted">Nenhum aviso aberto.</p>}
      {feedback.map((f) => (
        <div className="card" key={f.id} style={{ marginBottom: 12 }}>
          <p style={{ marginTop: 0 }}><strong>{f.questionId}</strong>: {line(f.questionId)}</p>
          <p>{f.reason}</p>
          <form action={resolveFeedbackAction}><input type="hidden" name="id" value={f.id} /><button className="btn ghost">Marcar como resolvido</button></form>
        </div>
      ))}
      <h2>Questões mais erradas</h2>
      <p className="muted">Com pelo menos 5 respostas. Taxa de erro alta pode indicar gabarito errado ou enunciado confuso.</p>
      <table>
        <thead><tr><th>Questão</th><th>Respostas</th><th>Erros</th></tr></thead>
        <tbody>
          {hard.map((h) => (
            <tr key={h.questionId}><td>{h.questionId}: {line(h.questionId).slice(0, 90)}</td><td>{h.total}</td><td>{Math.round((h.wrong / h.total) * 100)}%</td></tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
