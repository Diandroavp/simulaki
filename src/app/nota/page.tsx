import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { perfilEnem } from '@/lib/enem-perfil';
import { compararComCorte, estimarNota, MARGEM, MIN_RESPOSTAS_NOTA, pontosPercentuaisParaCorte } from '@/lib/enem-nota';
import { PageHero } from '../page-hero';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Minha nota estimada' };

const num = (v: string | undefined) => { const n = Number(String(v ?? '').replace(',', '.')); return v && Number.isFinite(n) ? n : null; };

export default async function Page({ searchParams }: { searchParams: Promise<{ corte?: string; redacao?: string }> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?erro=${encodeURIComponent('Entre para ver sua nota estimada.')}`);
  const perfil = await perfilEnem(user.id);
  const corte = num(sp.corte);
  const redacao = num(sp.redacao);
  const est = estimarNota(perfil.areas, redacao);
  const cmp = est.media !== null && corte !== null && corte > 0 && corte <= 1000 ? compararComCorte(est.media, corte) : null;
  return (
    <>
      <PageHero compact title={<>Minha nota <em>estimada</em></>} />
      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ margin: 0 }}>
          Uma ideia de onde você está hoje, com base nos seus acertos. 🧭 <strong>É uma estimativa grosseira</strong>: a nota oficial do ENEM usa a TRI, que considera a dificuldade de cada questão e a coerência das respostas. Use como bússola, não como promessa.
        </p>
      </div>

      {est.media === null ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Falta pouco! 🌱</h3>
          <p className="muted">Para estimar, preciso de pelo menos {MIN_RESPOSTAS_NOTA} questões respondidas em cada área. Faltam: <strong>{est.faltam.join(', ')}</strong>.</p>
          <Link className="btn" href="/treino?mundo=enem">Treinar agora</Link>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="muted">Sua nota média estimada</div>
          <div className="price">{est.media}</div>
          <p className="muted" style={{ margin: '4px 0 12px' }}>Provável entre {est.min} e {est.max} (margem de ±{MARGEM}).</p>
          <ul className="pers-list">
            {est.areas.map((a) => <li key={a.key}><span>{a.label}</span><span><strong>{a.nota}</strong> <span className="muted">({a.pct}% de acertos)</span></span></li>)}
            <li><span>Redação {est.redacaoInformada ? '' : '(valor suposto)'}</span><span><strong>{est.redacao}</strong></span></li>
          </ul>
        </div>
      )}

      <form className="card" method="get" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Compare com o curso dos sonhos 🎯</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Digite a nota de corte do curso que você quer (consulte no <a href="https://sisu.mec.gov.br" target="_blank" rel="noreferrer">portal do Sisu</a> ou no site da instituição; ela muda a cada edição) e, se já souber, sua nota de redação.
        </p>
        <div className="row" style={{ gap: 12 }}>
          <label>Nota de corte <input name="corte" inputMode="decimal" defaultValue={sp.corte ?? ''} placeholder="ex.: 650" style={{ width: 120, marginLeft: 6 }} /></label>
          <label>Minha redação <input name="redacao" inputMode="numeric" defaultValue={sp.redacao ?? ''} placeholder="ex.: 700" style={{ width: 120, marginLeft: 6 }} /></label>
          <button className="btn">Calcular</button>
        </div>
        {cmp && est.media !== null && (
          <p style={{ marginBottom: 0, marginTop: 14 }}>
            {cmp.situacao === 'acima' && <>🎉 Você está <strong>{cmp.diferenca} pontos acima</strong> do corte. Continue firme para manter a folga!</>}
            {cmp.situacao === 'perto' && <>💪 Você está <strong>bem perto</strong> do corte ({cmp.diferenca >= 0 ? `${cmp.diferenca} pontos acima` : `${-cmp.diferenca} pontos abaixo`}). Um empurrãozinho resolve!</>}
            {cmp.situacao === 'abaixo' && <>🌱 Faltam cerca de <strong>{-cmp.diferenca} pontos</strong>. Subir uns <strong>{pontosPercentuaisParaCorte(est.media, corte!)} pontos percentuais</strong> de acerto em cada área leva você lá. Um assunto de cada vez!</>}
          </p>
        )}
      </form>
      <p className="muted"><Link href="/app/enem">Voltar para o ENEM</Link> · <Link href="/plano">Ver plano da semana</Link></p>
    </>
  );
}
