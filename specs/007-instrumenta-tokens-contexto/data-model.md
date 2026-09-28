# Data Model: Instrumentação de Tokens e Contexto

## TokenUsage

- `promptTokens`: número inteiro não negativo reportado por uma chamada de
  modelo, ou `null` quando ausente/inválido.
- `source`: mensagem LangChain ou resultado normalizado da estratégia.

## ContextBreakdown

- `currentMessage`: estimativa de `currentMessage.length / 4`.
- `history`: estimativa do texto serializado do histórico dividido por quatro.
- `memories`: estimativa do texto serializado das memórias relevantes dividido
  por quatro.
- Todos os valores são inteiros não negativos.

## ChatMetrics

Mantém `llCalls`, `latencyMs` e `historyMessages`, adicionando:

- `promptTokens`: `number | null`.
- `contextBreakdown`: objeto `ContextBreakdown`.

## Invariants

- Uso real válido nunca é substituído por estimativa.
- Uso ausente nunca é convertido silenciosamente em zero.
- A decomposição não altera o texto enviado ao modelo.
- A métrica de histórico continua contando mensagens, não tokens.
