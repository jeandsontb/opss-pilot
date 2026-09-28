# Contrato: `/chat` e requestId

`POST /chat` aceita:

```json
{
  "message": "liste os alertas",
  "requestId": "req-123"
}
```

`requestId` é opcional na entrada, mas obrigatório na saída. Quando ausente,
o servidor gera um identificador único. A resposta mantém o contrato atual e
adiciona:

```json
{
  "requestId": "req-123",
  "conversationId": "conversation-1",
  "answer": "...",
  "trace": [],
  "metrics": {}
}
```

O header `X-Request-Id` contém exatamente o mesmo valor. Entrada inválida
retorna 400 e não cria registro parcial.
