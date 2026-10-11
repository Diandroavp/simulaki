# Banco de questões

Uma pasta por estado (`am/`, depois outros) e `br/` com o Banco Nacional de Questões (Senatran), que vale para todos os estados. Cada arquivo `.json` é uma lista de questões.

Campos opcionais: `source` e `sourceRef` (fonte exibida ao aluno), `signCode` (código da placa; a questão só entra na prova se existir `public/placas/<codigo>.svg|png|webp`).

## Formato

```json
{
  "id": "am-leg-0001",
  "stateCode": "AM",
  "topic": "legislacao",
  "statement": "Enunciado da questão",
  "options": [
    { "id": "a", "text": "..." },
    { "id": "b", "text": "..." },
    { "id": "c", "text": "..." },
    { "id": "d", "text": "..." }
  ],
  "correctOptionId": "c",
  "explanation": "Por que a alternativa correta é essa e por que as outras não servem.",
  "legalRef": "CTB, art. 65",
  "status": "draft",
  "reviewedBy": null
}
```

- **topic:** `legislacao`, `sinalizacao`, `direcao_defensiva`, `mecanica`, `primeiros_socorros` ou `meio_ambiente_cidadania`.
- **status:** `draft` (rascunho), `reviewed` (revisada), `published` (publicada), `archived`.
- **Publicar exige:** explicação, referência legal e o nome de quem revisou (`reviewedBy`).
- **id:** `<estado>-<tema abreviado>-<número com 4 dígitos>`, único em todo o banco.

## Regras de autoria

1. Escreva a questão a partir do texto da lei (CTB, resoluções do Contran) e do manual do Detran do estado. Não copie questões de apps, sites ou provas.
2. Uma só alternativa correta, e as erradas devem ser plausíveis, não absurdas.
3. Toda questão cita a base legal ou o manual.
4. Nenhuma questão é publicada sem revisão humana, de preferência por instrutor ou examinador de trânsito.
5. Imagens de placas: use só material próprio, de domínio público ou licenciado.

## Validar

```bash
npm run validate:questions
```

As três questões em `am/exemplos.json` são **rascunhos de exemplo** e não devem ser publicadas sem revisão.
