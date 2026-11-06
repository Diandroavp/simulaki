/** Opções da pergunta opcional ao excluir a conta. O id é o que fica guardado. */
export const MOTIVOS_EXCLUSAO = [
  { id: 'nao-preciso', label: 'Já passei na prova ou não preciso mais' },
  { id: 'dificil', label: 'Achei difícil de usar' },
  { id: 'conteudo', label: 'Faltou conteúdo ou questões' },
  { id: 'preco', label: 'O preço não cabe no meu bolso' },
  { id: 'privacidade', label: 'Preocupação com meus dados' },
  { id: 'outro', label: 'Outro motivo' },
] as const;

export const motivoLabel = (id: string) => MOTIVOS_EXCLUSAO.find((m) => m.id === id)?.label ?? id;
