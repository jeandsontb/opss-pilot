# Contrato de Trace e Métricas

Quando ocorre troca de modelo, o trace inclui:

```json
{
  "type": "fallback",
  "node": "router",
  "fromModel": "modelo-primario",
  "toModel": "modelo-reserva",
  "reason": "primary-unavailable"
}
```

O evento não contém mensagens brutas de erro, chaves ou prompts.

Respostas bem-sucedidas incluem:

```json
{
  "metrics": {
    "llCalls": 2,
    "latencyMs": 120,
    "promptTokens": 37,
    "modelUsed": "modelo-reserva"
  }
}
```

`modelUsed` é o identificador lógico do modelo que produziu a resposta.
