'use client';

import { useState } from 'react';

const OPTIONS = [
  { id: 'a', text: 'Reduzir a velocidade e seguir, se não houver outros veículos à vista.' },
  { id: 'b', text: 'Parar o veículo e só prosseguir quando puder fazê-lo com segurança.' },
  { id: 'c', text: 'Buzinar para avisar os demais condutores e manter a velocidade.' },
  { id: 'd', text: 'Dar preferência apenas aos veículos que vierem pela direita.' },
];
const CORRECT = 'b';

export function DemoQuestion() {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div className="demo" aria-live="polite">
      <div className="tag"><span>Experimente: sinalização</span><span>Questão de exemplo</span></div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="sign" src="/placas/R-1.svg" alt="Placa R-1, parada obrigatória" width={84} height={84} />
      <p className="q">Ao se aproximar de uma placa R-1 (Parada obrigatória), o condutor deve:</p>
      <div style={{ clear: 'both' }}>
        {OPTIONS.map((o) => {
          const state = picked === null ? '' : o.id === CORRECT ? 'ok' : o.id === picked ? 'bad' : '';
          return (
            <button key={o.id} className={`opt ${state}`} disabled={picked !== null} onClick={() => setPicked(o.id)}>
              <span className="ltr">{o.id.toUpperCase()}</span>
              <span>{o.text}</span>
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div className="why">
          <strong>{picked === CORRECT ? 'Acertou.' : 'Resposta certa: B.'}</strong> A placa R-1 exige a parada completa. Só depois de parar, e com a via livre, o condutor pode seguir. Reduzir a velocidade não basta.
          <div className="muted" style={{ marginTop: 6 }}>Base: CTB, Anexo II</div>
        </div>
      )}
    </div>
  );
}
