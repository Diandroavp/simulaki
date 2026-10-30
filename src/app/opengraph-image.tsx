import { ImageResponse } from 'next/og';

export const alt = 'Simulaki: simulados para a prova do Detran e o ENEM';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 80, background: '#FBF7EE', color: '#16203A' }}>
        <div style={{ fontSize: 40, fontWeight: 700, color: '#2447D8' }}>Simulaki</div>
        <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.05, marginTop: 24 }}>Simulados para o Detran e o ENEM</div>
        <div style={{ fontSize: 36, marginTop: 28, color: '#4A5470' }}>Cronômetro, correção na hora e explicação de cada questão.</div>
      </div>
    ),
    size,
  );
}
