# Data Model: ContextBuilder

## ContextBudget

| Campo | Tipo | Default | Regras |
|---|---|---:|---|
| `summary` | integer | 200 | inteiro não negativo |
| `window` | integer | 1200 | inteiro não negativo |
| `memories` | integer | 300 | inteiro não negativo |

Variáveis correspondentes: `CONTEXT_BUDGET_SUMMARY`, `CONTEXT_BUDGET_WINDOW` e
`CONTEXT_BUDGET_MEMORIES`.

## ContextInput

- `system`: string intocável.
- `summary`: string opcional.
- `window`: mensagens `{ role, content }` na ordem cronológica.
- `memories`: itens `{ fact, score }` com ordem original.
- `message`: string intocável.

## BuiltContext

- `prompt`: texto serializado com ordem fixa de seções.
- `selectedWindow`: mensagens preservadas.
- `selectedMemories`: memórias preservadas.
- `summary`: resumo preservado/truncado.
- `budgets`: configuração aplicada.

## Invariants

- `system` e `message` no prompt são byte a byte iguais às entradas.
- `selectedWindow` preserva a ordem relativa e remove apenas do início.
- `selectedMemories` prioriza score maior; empate preserva ordem original.
- Budget zero remove conteúdo opcional, mas mantém a seção serializável.
- Um budget inválido falha antes da construção do prompt.
- A estimativa de budget não altera `metrics.promptTokens`.
