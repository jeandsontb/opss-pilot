# Contrato `POST /chat`

## Request

```json
{
  "message": "liste alertas ativos",
  "conversationId": "conversation-id-opcional",
  "strategy": "react",
  "reflect": false
}
```

`conversationId`, `strategy` e `reflect` são opcionais. Quando omitido, `conversationId` é criado e `strategy` usa `react`.

## Success response

```json
{
  "conversationId": "conversation-id",
  "answer": "Há três alertas ativos.",
  "trace": [],
  "metrics": {
    "llCalls": 1,
    "latencyMs": 100,
    "historyMessages": 2
  }
}
```

`historyMessages` é a quantidade de mensagens anteriores compostas, limitada a 12.

## Errors

- `400`: request inválido ou `conversationId` inválido.
- `422`: estratégia desconhecida.
- `504`: timeout de execução.
- `500`: falha de persistência ou estratégia não tratada.
