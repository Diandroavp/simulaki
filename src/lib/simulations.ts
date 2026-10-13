import { loadQuestions } from './questions';

export type SimulationType = {
  slug: string;
  name: string;
  group: 'detran' | 'vestibular';
  /** Estado cujo banco de questões e regras de prova são usados (só Detran por enquanto). */
  stateCode?: string;
  description: string;
};

export const SIMULATIONS: SimulationType[] = [
  { slug: 'detran-am', name: 'Detran AM', group: 'detran', stateCode: 'AM', description: 'Prova teórica de habilitação do Amazonas.' },
  { slug: 'detran-sp', name: 'Detran SP', group: 'detran', stateCode: 'SP', description: 'Prova teórica de habilitação de São Paulo.' },
  { slug: 'detran-ba', name: 'Detran BA', group: 'detran', stateCode: 'BA', description: 'Prova teórica de habilitação da Bahia.' },
  { slug: 'enem', name: 'ENEM', group: 'vestibular', stateCode: 'ENEM', description: 'Questões no formato do Exame Nacional do Ensino Médio.' },
  { slug: 'psc', name: 'PSC', group: 'vestibular', description: 'Processo Seletivo Contínuo.' },
  { slug: 'sis', name: 'SIS', group: 'vestibular', description: 'Sistema de Ingresso Seriado.' },
];

/** Nome para exibir de um tipo de tentativa (inclui o simulado personalizado). */
export function nomeTipo(tipo: string): string {
  if (tipo.startsWith('custom:') || tipo.startsWith('treino:custom:')) {
    const bank = tipo.slice(tipo.lastIndexOf(':') + 1);
    const sim = SIMULATIONS.find((s) => s.stateCode === bank);
    return `Personalizado${sim ? ` · ${sim.name}` : ''}`;
  }
  return getSimulation(tipo)?.name ?? tipo;
}

export function getSimulation(slug: string): SimulationType | undefined {
  return SIMULATIONS.find((s) => s.slug === slug);
}

/** Um tipo está disponível quando tem regras de prova e questões liberadas para uso. */
export function isAvailable(sim: SimulationType): boolean {
  return !!sim.stateCode && loadQuestions(sim.stateCode).length > 0;
}
