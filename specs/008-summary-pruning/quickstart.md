# Quickstart: Sumarização de Histórico

## Pré-requisitos

- Node.js 22 LTS
- Dependências instaladas
- Nenhuma credencial ou conexão de rede para os testes

## Validação automatizada

```bash
npm run typecheck
npm test
```

Os testes devem cobrir menos de oito mensagens sem resumo, o primeiro bloco de
oito persistido, mesclagem com resumo anterior, ausência de chamada antes do
limiar, isolamento por conversa, evento `summarize`, resumo no prompt e falha
sem alteração parcial do store.

Consulte [data-model.md](./data-model.md) e
[contracts/summary-service.md](./contracts/summary-service.md).

## Cenário manual

Use um `Summarizer` fake que devolva texto identificável, execute turnos
suficientes para retirar oito mensagens da janela e confirme que o trace contém
`type: "summarize"`, o resumo aparece no prompt seguinte e o contador avança em
unidades de oito. Requests intermediários não devem incrementar as chamadas.
