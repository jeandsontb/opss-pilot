# Quickstart: Grafo Unificado de Raciocínio

## Pré-requisitos

- Node.js 22 LTS
- Dependências instaladas
- Testes fake não exigem OpenRouter nem secrets

## Validação automatizada

```bash
npm run typecheck
npm test
```

Os testes devem cobrir:

1. as três rotas do catálogo;
2. decisão estruturada com `route` e `reason`;
3. tabela de estratégias no prompt do roteador;
4. ordem contexto → route → estratégia → resposta;
5. evento `route` e campo `node` em todos os eventos;
6. override válido sem chamada ao roteador;
7. rota inválida, decisão inválida e falha do roteador;
8. preservação de métricas e contrato HTTP.

## Cenários manuais

Envie um pedido sem `strategy` para `/chat` e confirme um evento `route`
originado pelo roteador antes dos eventos da estratégia.

Envie o mesmo pedido com `"strategy": "plan-and-execute"` e confirme que o
trace identifica `source: "override"`, não chama o roteador e executa apenas a
rota solicitada.
