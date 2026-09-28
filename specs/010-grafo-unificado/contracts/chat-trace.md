# Contrato HTTP e Trace

`POST /chat` mantém `message` obrigatório e aceita `strategy` opcional. Quando
presente, o valor deve pertencer ao catálogo de estratégias.

Todo evento de trace deve possuir `node` não vazio. Além dos eventos existentes,
o endpoint pode retornar:

```json
{
  "type": "route",
  "node": "router",
  "route": "react",
  "reason": "A pergunta exige investigação com ferramentas.",
  "source": "router"
}
```

Com override, `source` é `"override"` e `reason` identifica que a estratégia
foi solicitada pelo consumidor. O response continua contendo `conversationId`,
`answer`, `trace` e `metrics`.
