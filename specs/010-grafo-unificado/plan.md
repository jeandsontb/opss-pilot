# Implementation Plan: Grafo Unificado de Raciocínio

**Branch**: `010-grafo-unificado` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-grafo-unificado/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Unificar a entrada de raciocínio em um grafo de produção que constrói o
contexto, decide a estratégia (ou aplica um override explícito), executa
exatamente um nó de estratégia e consolida a resposta. O trace será enriquecido
com `node` em todos os eventos e com um evento `route` contendo a decisão
estruturada e sua justificativa.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript ESM, Node.js 22 LTS, `strict: true`

**Primary Dependencies**: `@langchain/langgraph`, `@langchain/core`,
`@langchain/openai`, Zod e Express

**Storage**: Nenhuma alteração; o grafo recebe stores de conversa, memória e
operações por injeção

**Testing**: `node:test` via `tsx`, testes fake determinísticos e offline

**Target Platform**: Servidor Linux com API HTTP Express

**Project Type**: Serviço web com grafo de orquestração e camadas Service/Controller

**Performance Goals**: O nó de contexto não adiciona chamadas de modelo; o
roteador realiza no máximo uma chamada adicional quando não há override

**Constraints**: Validação Zod nas fronteiras, rota pertencente ao catálogo,
um único nó de estratégia por execução, métricas e limites de iteração
preservados, sem fallback silencioso

**Scale/Scope**: Um grafo por request; três entradas de estratégia no catálogo:
ReAct, Plan-and-execute e Reflection sobre uma estratégia base

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Type-safe ESM e `strict: true`: PASS
- Entradas, decisões de rota e resposta HTTP validadas: PASS
- Grafo separado do serviço de chat e das estratégias: PASS
- Testes fake offline antes da integração: PASS
- Sem secrets no código e sem alteração de persistência: PASS

## Project Structure

### Documentation (this feature)

```text
specs/010-grafo-unificado/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
src/
├── agents/
│   ├── production-graph.ts
│   ├── types.ts
│   ├── index.ts
│   └── model.ts
├── context/
│   └── context-builder.ts
├── services/
│   └── chat.ts
└── http/
    └── server.ts

test/
├── production-graph.test.ts
├── http.test.ts
└── trace.test.ts
```

**Structure Decision**: O projeto single-project existente será mantido. O
grafo ficará em `src/agents`, receberá o contexto já construído pelo serviço e
será injetável para testes. `runChat` continuará responsável por conversas,
memórias, reflection assíncrona e métricas de contexto; o controller continuará
validando requests/responses.

## Phase 0: Research

Decisões de integração, catálogo, override, trace e contagem de métricas estão
em [research.md](./research.md).

## Phase 1: Design

Entidades e invariantes estão em [data-model.md](./data-model.md), contratos
em [contracts/](./contracts/) e cenários executáveis em [quickstart.md](./quickstart.md).

## Constitution Check (Post-Design)

- O grafo valida rota antes de executar estratégia: PASS
- Contexto é construído uma única vez e compartilhado: PASS
- Evento `route` e campo `node` são adicionados sem remover eventos existentes: PASS
- Override explícito não chama o roteador: PASS
- Métricas do roteador e estratégia são acumuladas sem substituir usage real: PASS
- Testes de todas as rotas e erros são offline: PASS

## Complexity Tracking

Nenhuma violação da constituição foi identificada; não há complexidade
excepcional que precise de justificativa adicional.
