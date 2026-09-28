# Quickstart: Observabilidade Persistida

## Pré-requisitos

- Node.js 22 LTS
- Dependências instaladas
- Nenhuma chave OpenRouter ou conexão externa de banco necessária para os testes

## Validação automatizada

```bash
npm run typecheck
npm test
```

Os testes devem cobrir:

1. geração e preservação de `requestId` no corpo e em `X-Request-Id`;
2. rejeição de identificador inválido e conflito duplicado;
3. persistência de métricas e trace completo em SQLite em memória;
4. ordenação por sequência em `GET /requests/:id`;
5. 404 para request inexistente;
6. uma linha JSON por evento sem payloads sensíveis;
7. persistência de falhas sem resposta de sucesso.

Os contratos detalhados estão em [contracts/](./contracts/) e as entidades em
[data-model.md](./data-model.md).
