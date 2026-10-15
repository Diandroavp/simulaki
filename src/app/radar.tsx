import type { Ponto } from '@/lib/enem-perfil';

/** Gráfico de radar em SVG (renderiza no servidor). Eixo sem dados suficientes fica no centro, em cinza. */
export function Radar({ pontos, titulo, tamanho = 340 }: { pontos: Ponto[]; titulo: string; tamanho?: number }) {
  const n = pontos.length;
  const c = tamanho / 2;
  const R = tamanho / 2 - 70;
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const xy = (i: number, v: number): [number, number] => [c + Math.cos(ang(i)) * R * (v / 100), c + Math.sin(ang(i)) * R * (v / 100)];
  const poli = (v: (i: number) => number) => pontos.map((_, i) => xy(i, v(i)).join(',')).join(' ');
  const aria = `${titulo}: ${pontos.map((p) => `${p.label} ${p.pct === null ? 'poucos dados' : p.pct + '%'}`).join('; ')}`;
  return (
    <svg className="radar" viewBox={`0 0 ${tamanho} ${tamanho}`} role="img" aria-label={aria}>
      {[25, 50, 75, 100].map((g) => <polygon key={g} points={poli(() => g)} className="radar-grid" />)}
      {pontos.map((_, i) => { const [x, y] = xy(i, 100); return <line key={i} x1={c} y1={c} x2={x} y2={y} className="radar-grid" />; })}
      <polygon points={poli((i) => pontos[i]!.pct ?? 0)} className="radar-area" />
      {pontos.map((p, i) => { const [x, y] = xy(i, p.pct ?? 0); return <circle key={p.key} cx={x} cy={y} r={4} className={p.pct === null ? 'radar-dot off' : 'radar-dot'} />; })}
      {pontos.map((p, i) => {
        const [x, y] = xy(i, 118);
        const cos = Math.cos(ang(i));
        const anchor = Math.abs(cos) < 0.25 ? 'middle' : cos > 0 ? 'start' : 'end';
        const nome = p.label.length > 22 ? `${p.label.slice(0, 21)}…` : p.label;
        return (
          <text key={p.key} x={x} y={y} textAnchor={anchor} className={p.pct === null ? 'radar-label off' : 'radar-label'}>
            <tspan x={x} dy="0">{nome}</tspan>
            <tspan x={x} dy="1.2em" className="radar-val">{p.pct === null ? 'poucos dados' : `${p.pct}%`}</tspan>
          </text>
        );
      })}
    </svg>
  );
}
