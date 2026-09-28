# Quickstart: ContextBuilder com Orçamento por Seção

## Pré-requisitos

- Node.js 22 LTS
- Dependências instaladas
- Nenhum acesso ao OpenRouter necessário para os testes

## Validação automatizada

```bash
npm run typecheck
npm test
```

Os testes devem verificar:

1. defaults 200/1200/300;
2. parsing de budgets válidos e rejeição de inválidos;
3. system e mensagem atual intactos;
4. janela com corte das mensagens mais antigas;
5. memórias com corte por menor score e empate estável;
6. resumo e budgets zero;
7. mesmo prompt nas estratégias fake;
8. ausência de alteração nas métricas existentes.

Consulte [data-model.md](./data-model.md) e
[contracts/context-builder.md](./contracts/context-builder.md) para os
invariantes e o formato do resultado.

## Diagnóstico manual

Defina, por exemplo:

```bash
CONTEXT_BUDGET_SUMMARY=20 \
CONTEXT_BUDGET_WINDOW=40 \
CONTEXT_BUDGET_MEMORIES=30 \
npm test
```

Use uma entrada com conteúdos identificáveis e confirme que os itens removidos
seguem a ordem definida, sem truncar system ou mensagem atual.

Os budgets também podem ser configurados no processo do servidor:

- `CONTEXT_BUDGET_SUMMARY` (default `200`);
- `CONTEXT_BUDGET_WINDOW` (default `1200`);
- `CONTEXT_BUDGET_MEMORIES` (default `300`).

Cada valor deve ser um inteiro decimal não negativo. Valores fracionários,
negativos ou não numéricos falham explicitamente antes da construção do prompt.
