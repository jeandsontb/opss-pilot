# Data Model: Grafo Unificado de Raciocínio

## ProductionGraphInput

- `prompt`: contexto já construído pelo `ContextBuilder`.
- `strategyOverride`: identificador opcional enviado por `/chat`.
- `maxIterations`: limite propagado ao nó de estratégia.
- `noReplanner`: opção propagada ao Plan-and-execute.
- `store`: store operacional opcional.
- `memoryStore`: store de memória opcional.

## RouteDecision

| Campo | Tipo | Regras |
|---|---|---|
| `route` | `"react" \| "plan-and-execute" \| "reflection"` | deve existir no catálogo |
| `reason` | string não vazia | justificativa produzida pelo roteador |
| `source` | `"router" \| "override"` | indica origem da decisão |

## TraceEvent

Cada evento mantém seu payload específico e adiciona:

- `node`: string não vazia com o nó produtor.

O evento `route` contém:

- `type: "route"`;
- `node: "router"`;
- `route`;
- `reason`;
- `source`.

## ProductionGraphResult

- `answer`: resposta final;
- `trace`: trace com evento de rota e eventos normalizados;
- `metrics`: métricas da rota mais estratégia, incluindo tokens quando
  disponíveis.

## Invariants

- Contexto é construído uma vez antes da decisão.
- Override válido não invoca o roteador.
- Exatamente uma estratégia é executada.
- Rota inválida falha antes da execução.
- O evento `route` precede eventos do nó de estratégia.
- Todo evento possui `node`.
- A resposta final é o answer da estratégia escolhida.
