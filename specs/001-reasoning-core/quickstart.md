# Quickstart de validação

## Pré-requisitos

- Node.js 22 LTS
- Dependências instaladas com `npm install`
- Para execução real: `OPENROUTER_API_KEY` e `OPENROUTER_MODEL` no ambiente do
  processo. Não criar ou versionar `.env` para os testes.

## Seed local

```bash
npm run seed
```

O resultado esperado informa cinco serviços e seis alertas, sendo três
`firing` e três `resolved`.

## Testes determinísticos

```bash
npm test
npm run typecheck
```

Os testes do store e de formatação não fazem chamadas de rede nem exigem
credenciais.

## Arena

```bash
npm run arena -- \
  --strategies react,plan-and-execute \
  --max-iterations 8 \
  "investigue os alertas firing e abra um incidente se necessário"
```

Verifique um bloco independente por estratégia, com resposta, trace ordenado e
métricas `llCalls`/`latencyMs`. Reduza `--max-iterations` para validar o
encerramento por limite e confirme que o trace parcial é preservado.

Os formatos estão em [strategy.md](./contracts/strategy.md) e
[tools-and-arena.md](./contracts/tools-and-arena.md); entidades e invariantes
estão em [data-model.md](./data-model.md).
