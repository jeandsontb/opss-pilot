# Tools and Arena Contract

## Tools

- `list_alerts`: recebe `{ "status": "firing" | "resolved" }` e retorna uma
  lista validada de alertas.
- `open_incident`: recebe `{ "title": string, "service": string,
  "severity": string }` e retorna o incidente criado.
- `resolve_incident`: recebe `{ "id": string }` e retorna o incidente resolvido.

IDs inexistentes, status inválido e payloads desconhecidos geram erro explícito
sem mutação.

## Arena CLI

```text
npm run arena -- --strategies react,plan-and-execute --max-iterations 8 "investigue os alertas firing"
```

- `--strategies` aceita uma ou mais estratégias conhecidas.
- `--max-iterations` é inteiro positivo.
- A entrada é o restante dos argumentos posicionais.
- A saída contém um bloco por estratégia com nome, resposta, trace, `llCalls` e
  `latencyMs`.
- Configuração inválida falha antes de iniciar qualquer estratégia.
