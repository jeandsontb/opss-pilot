# Contrato: `GET /requests/:id`

Para um identificador existente, retorna 200:

```json
{
  "request": {
    "requestId": "req-123",
    "status": "succeeded",
    "metrics": {
      "llCalls": 1,
      "latencyMs": 10,
      "promptTokens": null,
      "modelUsed": "modelo"
    }
  },
  "trace": [
    {
      "sequence": 0,
      "type": "route",
      "node": "router",
      "payload": {}
    }
  ]
}
```

O trace é sempre ordenado por sequência. Para identificador inexistente,
retorna 404 com `{ "error": "Request not found" }`.
