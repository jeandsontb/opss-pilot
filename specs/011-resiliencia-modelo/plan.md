# Implementation Plan: Resiliência de Modelo

**Branch**: `011-resiliencia-modelo` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-resiliencia-modelo/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Centralizar retry e fallback dos modelos na fábrica compartilhada, propagar o
modelo efetivamente usado para métricas e trace, e traduzir falha total em
HTTP 503 sem expor detalhes sensíveis.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript ESM, Node.js 22 LTS, `strict: true`

**Primary Dependencies**: `@langchain/openai`, `@langchain/core`, Zod e Express

**Storage**: Nenhuma alteração de persistência

**Testing**: `node:test` via `tsx`, modelos fake e testes HTTP offline

**Target Platform**: Servidor Linux com API HTTP Express

**Project Type**: Serviço web com fábrica de modelos, agentes e controller HTTP

**Performance Goals**: Retry limitado; fallback somente após esgotar o primário;
nenhuma chamada extra no caminho de sucesso imediato

**Constraints**: Erros classificados, sem loops infinitos, sem secrets no trace,
usage real preservado, 503 somente para falha total de modelo

**Scale/Scope**: Todas as chamadas que usam `createModel`: roteador,
estratégias e reflection

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Type-safe ESM e `strict: true`: PASS
- Configuração e erros externos validados: PASS
- Retry/fallback separado da lógica das estratégias: PASS
- Testes fake offline: PASS
- Sem persistência nova ou exposição de secrets: PASS

## Project Structure

### Documentation (this feature)

```text
specs/011-resiliencia-modelo/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── agents/
│   ├── model.ts
│   ├── types.ts
│   ├── react.ts
│   ├── plan-and-execute.ts
│   └── reflection.ts
├── graph/
│   └── production-graph.ts
├── services/
│   └── chat.ts
└── http/
    └── server.ts

test/
├── model-resilience.test.ts
├── http.test.ts
├── production-graph.test.ts
└── reflection.test.ts
```

**Structure Decision**: A política de retry/fallback ficará na fábrica
compartilhada em `src/agents/model.ts`; chamadas que precisam de observabilidade
receberão eventos e métricas através de um executor/adaptador comum. A borda
HTTP traduzirá `ModelUnavailableError` para 503. Estratégias e o grafo não
duplicarão regras de retry.

## Phase 0: Research

Decisões sobre classificação, cadeia de modelos, observabilidade e 503 estão em
[research.md](./research.md).

## Phase 1: Design

Entidades e invariantes estão em [data-model.md](./data-model.md), contratos
em [contracts/](./contracts/) e cenários executáveis em [quickstart.md](./quickstart.md).

## Constitution Check (Post-Design)

- A fábrica centraliza retry/fallback para todas as chamadas: PASS
- Retry não substitui usage real nem gera fallback falso: PASS
- Evento `fallback` é sanitizado e associado ao nó chamador: PASS
- `ModelUnavailableError` é o único caminho para 503 de modelo: PASS
- Modelos fake permitem testes sem rede: PASS

## Complexity Tracking

Nenhuma violação da constituição foi identificada.
