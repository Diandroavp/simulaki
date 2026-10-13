/** Enunciado com parágrafos, quebras de verso e figuras (ENEM e outras provas com texto longo e imagem). */
export function Statement({ text, images, long, style, hideText }: { text: string; images?: string[]; long?: boolean; style?: React.CSSProperties; hideText?: boolean }) {
  // Quando a figura já traz a questão inteira (alternativas em imagem), o texto fica só para busca/acessibilidade.
  const paras = hideText ? [] : text.split(/\n\n+/).filter(Boolean);
  // A figura entra antes da pergunta final (o comando da questão), como na prova impressa.
  const head = images?.length && paras.length > 1 ? paras.slice(0, -1) : paras;
  const tail = images?.length && paras.length > 1 ? paras.slice(-1) : [];
  const isLong = long ?? text.length > 360;
  return (
    <div className={isLong ? 'stmt long' : 'stmt'} style={style}>
      {head.map((p, i) => (
        <p key={i} style={{ whiteSpace: 'pre-line' }}>{p}</p>
      ))}
      {images?.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={src} className="qimg" src={src} alt={hideText ? text.slice(0, 200) : `Figura da questão${images.length > 1 ? ` (${i + 1})` : ''}`} loading="lazy" />
      ))}
      {tail.map((p, i) => (
        <p key={`t${i}`} style={{ whiteSpace: 'pre-line' }}>{p}</p>
      ))}
    </div>
  );
}

/** Texto da alternativa; quando as alternativas são figuras, só a letra (a figura já está no enunciado). */
export const optionText = (text: string, id: string) => text || `Alternativa ${id.toUpperCase()}`;
