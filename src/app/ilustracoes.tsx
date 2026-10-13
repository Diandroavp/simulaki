/* Ilustrações de material escolar, desenhadas para o Simulaki (decorativas, sem texto). */

export function Lapis({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 220 40" aria-hidden focusable="false">
      <rect x="188" y="7" width="26" height="26" rx="7" fill="#F59FB4" />
      <rect x="170" y="6" width="20" height="28" fill="#C9CED8" />
      <path d="M174 6v28M180 6v28M186 6v28" stroke="#9AA2B1" strokeWidth="1.5" />
      <rect x="46" y="6" width="126" height="28" fill="#F4C20D" />
      <rect x="46" y="6" width="126" height="7" fill="#FBDA55" />
      <rect x="46" y="27" width="126" height="7" fill="#DCA900" />
      <path d="M46 6L9 20l37 14z" fill="#F1D3A5" />
      <path d="M46 6L9 20l37 14" fill="none" stroke="#DDB787" strokeWidth="1.2" />
      <path d="M17 16.8L9 20l8 3.2z" fill="#2B2F3A" />
    </svg>
  );
}

export function Borracha({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 96 48" aria-hidden focusable="false">
      <rect x="1" y="1" width="94" height="46" rx="9" fill="#FFFFFF" stroke="#D5D9E1" strokeWidth="2" />
      <rect x="30" y="1" width="40" height="46" fill="#2447D8" />
      <path d="M38 14h24M38 24h24M38 34h14" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity=".85" />
      <rect x="1" y="1" width="94" height="46" rx="9" fill="none" stroke="#D5D9E1" strokeWidth="2" />
    </svg>
  );
}

export function Regua({ className }: { className?: string }) {
  const ticks = Array.from({ length: 49 }, (_, i) => i);
  return (
    <svg className={className} viewBox="0 0 250 36" aria-hidden focusable="false">
      <rect x="1" y="1" width="248" height="34" rx="6" fill="#FDEFB0" stroke="#E5C94B" strokeWidth="1.5" />
      {ticks.map((i) => (
        <path key={i} d={`M${9 + i * 4.8} 1.5v${i % 10 === 0 ? 15 : i % 5 === 0 ? 11 : 7}`} stroke="#8A6D00" strokeWidth="1.2" />
      ))}
    </svg>
  );
}

export function Marcador({ className, cor = '#2447D8' }: { className?: string; cor?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 24" aria-hidden focusable="false">
      <rect x="1" y="3" width="98" height="18" rx="8" fill="#FFFFFF" stroke="#D5D9E1" strokeWidth="1.5" />
      <rect x="1" y="3" width="30" height="18" rx="8" fill={cor} />
      <rect x="22" y="3" width="9" height="18" fill={cor} />
      <rect x="40" y="9" width="30" height="6" rx="3" fill={cor} opacity=".25" />
    </svg>
  );
}

export function ApagadorLousa({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 70 26" aria-hidden focusable="false">
      <rect x="1" y="12" width="68" height="13" rx="4" fill="#7C8798" />
      <rect x="6" y="2" width="58" height="12" rx="4" fill="#F5C518" />
    </svg>
  );
}

/* Cena de estudo: livros, capelo, caderno, cronômetro e copo de lápis. Decorativa, sem texto. */
const Livro = ({ x, y, w, c, d }: { x: number; y: number; w: number; c: string; d: string }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect width={w} height="38" rx="7" fill={c} />
    <rect width="18" height="38" rx="7" fill={d} />
    <rect x="12" y="6" width={w - 18} height="26" rx="3" fill="#FFFFFF" />
    <path d={`M12 14H${w - 6}M12 19H${w - 6}M12 24H${w - 6}`} stroke="#D9DEE7" strokeWidth="1.5" />
  </g>
);

const Pilha = () => (
  <g>
    <Livro x={0} y={84} w={210} c="#2447D8" d="#1B37A8" />
    <Livro x={16} y={46} w={188} c="#D8453A" d="#A8322A" />
    <Livro x={6} y={8} w={200} c="#F4C20D" d="#C99A00" />
    <g transform="translate(52 -52)">
      <path d="M26 34V56Q60 72 94 56V34L60 46Z" fill="#2A3142" />
      <path d="M0 22L60 0L120 22L60 44Z" fill="#171B26" />
      <path d="M60 22L120 22V52" fill="none" stroke="#F4C20D" strokeWidth="3" />
      <circle cx="120" cy="56" r="5.5" fill="#F4C20D" />
    </g>
  </g>
);

const Caderno = () => (
  <g>
    <rect width="116" height="152" rx="11" fill="#FFFFFF" stroke="#D5D9E1" strokeWidth="2" />
    <path d="M32 2V150" stroke="#F59FB4" strokeWidth="2" />
    {[44, 64, 84, 104, 124].map((y) => <path key={y} d={`M40 ${y}H106`} stroke="#D9E1F2" strokeWidth="2" />)}
    <rect x="42" y="16" width="44" height="8" rx="4" fill="#2447D8" opacity=".85" />
    <path d="M46 88l14 14 30-34" fill="none" stroke="#1E9E63" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    {[16, 38, 60, 82, 104, 126].map((y) => <rect key={y} x="-7" y={y} width="18" height="8" rx="4" fill="#8B93A5" />)}
  </g>
);

const CopoLapis = () => (
  <g>
    {[['#F4C20D', -12, 22], ['#D8453A', 4, 14], ['#1E9E63', 16, 24]].map(([c, r, x], i) => (
      <g key={i} transform={`translate(${x} 46) rotate(${r} 5 60)`}>
        <rect width="11" height="64" fill={c as string} />
        <path d="M0 0L5.5 -16L11 0Z" fill="#F1D3A5" />
        <path d="M3.2 -9.2L5.5 -16L7.8 -9.2Z" fill="#2B2F3A" />
      </g>
    ))}
    <path d="M0 52H62L58 108Q58 112 54 112H8Q4 112 4 108Z" fill="#F59FB4" />
    <rect x="0" y="52" width="62" height="10" rx="5" fill="#E37B96" />
  </g>
);

const Cronometro = () => (
  <g>
    <rect x="-8" y="-56" width="16" height="12" rx="4" fill="#8B93A5" />
    <circle r="42" fill="#FFFFFF" stroke="#2447D8" strokeWidth="7" />
    {Array.from({ length: 12 }, (_, i) => (
      <path key={i} d="M0 -32V-27" stroke="#8B93A5" strokeWidth="2.5" strokeLinecap="round" transform={`rotate(${i * 30})`} />
    ))}
    <path d="M0 0V-22" stroke="#171B26" strokeWidth="4" strokeLinecap="round" />
    <path d="M0 0L15 9" stroke="#D8453A" strokeWidth="4" strokeLinecap="round" />
    <circle r="4.5" fill="#171B26" />
  </g>
);

export function Cena({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 580 290" aria-hidden focusable="false">
      <g transform="translate(26 120) rotate(-7 58 76)"><Caderno /></g>
      <g transform="translate(168 176)"><CopoLapis /></g>
      <g transform="translate(262 168)"><Pilha /></g>
      <g transform="translate(528 242)"><Cronometro /></g>
    </svg>
  );
}

export function Livros({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 270 190" aria-hidden focusable="false">
      <g transform="translate(26 74)"><Pilha /></g>
    </svg>
  );
}

export function CronometroSolto({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="-50 -62 100 112" aria-hidden focusable="false">
      <Cronometro />
    </svg>
  );
}
