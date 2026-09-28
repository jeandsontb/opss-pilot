# Contrato `POST /chat` com memória semântica

## Request

```json
{
  "message": "qual serviço devo verificar?",
  "userId": "user-123",
  "conversationId": "conversation-id-opcional",
  "strategy": "react",
  "reflect": false
}
```

`userId` é opcional. Quando presente, o sistema faz recall antes de executar a estratégia. Quando ausente, nenhuma memória é consultada.

## Prompt composition

O prompt mantém o histórico conversacional e inclui uma seção explícita de memórias relevantes antes da mensagem atual:

```text
Memórias relevantes do usuário:
- O serviço de pagamentos pertence ao time financeiro.

Histórico da conversa:
...

Mensagem atual do usuário:
...
```

## Success response

O corpo mantém `conversationId`, `answer`, `trace` e `metrics` existentes. A métrica de memória não altera `llCalls`, `latencyMs` ou `historyMessages`.

## Errors

- `400`: `message` ou `userId` inválido.
- `404`: conversa ou memória indicada não encontrada, quando aplicável.
- `422`: estratégia desconhecida.
- `500`: falha explícita no provider, store ou estratégia.
