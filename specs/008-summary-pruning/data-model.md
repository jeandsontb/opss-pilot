# Data Model: Sumarização de Histórico

## ConversationSummary

Registro corrente do resumo de uma conversa.

| Campo | Tipo | Regras |
|---|---|---|
| `id` | string/UUID | obrigatório e único |
| `conversationId` | string/UUID | obrigatório; único no store de resumos |
| `summary` | string | obrigatório e não vazio |
| `summarizedMessageCount` | integer | obrigatório e não negativo |
| `createdAt` | timestamp | obrigatório |
| `updatedAt` | timestamp | obrigatório |

### Invariants

- `summarizedMessageCount` nunca diminui.
- O contador não inclui as oito mensagens mantidas na janela recente.
- Falha de sumarização não altera resumo nem contador.

## SummaryInput

- `previousSummary`: resumo corrente ou string vazia.
- `messages`: bloco de até oito mensagens antigas, com `role` e `content`.
- `targetTokens`: sempre 150.

## ConversationContext

1. resumo persistido, quando existir;
2. até oito mensagens recentes, em ordem cronológica;
3. mensagem atual.

## SummarizeTraceEvent

```ts
{
  type: "summarize";
  messageCount: number;
  summarizedMessageCount: number;
}
```

## SummaryStore Contract

- `get(conversationId): ConversationSummary | undefined`
- `upsert(input): ConversationSummary`

O store persistente usa `conversation_summaries`; o fake mantém isolamento por `conversationId`.
