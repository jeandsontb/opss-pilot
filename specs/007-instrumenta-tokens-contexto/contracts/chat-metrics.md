# Contrato de métricas do chat

## Success response

```json
{
  "metrics": {
    "llCalls": 1,
    "latencyMs": 42,
    "historyMessages": 4,
    "promptTokens": 321,
    "contextBreakdown": {
      "currentMessage": 8,
      "history": 120,
      "memories": 32
    }
  }
}
```

`promptTokens` será `null` quando a estratégia não disponibilizar uso real.
`contextBreakdown` sempre será produzido com a estimativa `chars / 4`.

## Compatibility

Os campos existentes permanecem presentes e com os mesmos significados. Os
novos campos são aditivos.
