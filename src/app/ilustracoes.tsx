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

/* Fita colorida (traço do lápis em cinco cores), usada como assinatura visual do site. */
export function Fita({ className }: { className?: string }) {
  const cores = ['#F4C20D', '#E86A33', '#D8453A', '#8B5CD6', '#2447D8', '#141A26'];
  return (
    <svg className={className} viewBox="0 0 640 460" aria-hidden focusable="false" preserveAspectRatio="xMidYMid slice">
      {cores.map((c, i) => (
        <path key={c} d="M-40 300 C 90 380 190 120 340 170 S 560 90 700 -10" transform={`translate(${i * 4} ${i * 30})`} fill="none" stroke={c} strokeWidth="34" opacity={i === 5 ? 0.85 : 0.92} />
      ))}
    </svg>
  );
}
