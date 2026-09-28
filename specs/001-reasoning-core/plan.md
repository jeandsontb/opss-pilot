# Implementation Plan: Núcleo de raciocínio do OpssPilot

**Branch**: `001-reasoning-core` | **Date**: 2026-09-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-reasoning-core/spec.md`

## Summary

Implementar um núcleo de raciocínio intercambiável para investigação
operacional, com contrato comum de estratégias, ferramentas validadas para
alertas e incidentes, estratégias ReAct e Plan-and-execute, e uma arena CLI
para comparar resultados. A implementação usará os adaptadores LangChain/
LangGraph já definidos pelo projeto, OpenRouter para execuções reais, um store
em memória isolável para testes/seed e SQLite como persistência
relacional.

## Technical Context

**Language/Version**: TypeScript ESM, Node.js 22 LTS, strict mode

**Primary Dependencies**: `zod`, `@langchain/core`, `@langchain/openai`,
`@langchain/langgraph`, `better-sqlite3`, `tsx`

**Storage**: SQLite para persistência; store em memória com
snapshot/clonagem para execução determinística e isolamento da arena

**Testing**: `node:test` via `tsx`, sem rede para testes do store e formatador;
`npm run typecheck` como gate de tipos

**Target Platform**: Linux, execução local de CLI e processo Node.js

**Project Type**: Biblioteca interna de agentes com CLI de avaliação

**Performance Goals**: Execuções locais do store e formatação devem ser
determinísticas e sem rede; a arena deve respeitar imediatamente os limites
configurados. Latência de modelo é medida, não mascarada por SLA artificial.

**Constraints**: Temperatura zero; no máximo oito passos no plano; limite de
iterações por execução; validação Zod nas fronteiras; nenhuma credencial
versionada ou lida de `.env`; estratégias devem poder ser executadas em estado
isolado.

**Scale/Scope**: Cinco serviços e seis alertas no seed inicial; três alertas
`firing` e três `resolved`; uma ou mais estratégias por rodada da arena.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Type-Safe ESM**: PASS — preserva TypeScript ESM, strict e
  `npm run typecheck`.
- **II. Validated Boundaries**: PASS — entradas de ferramentas e flags CLI serão
  esquematizadas com Zod; erros inválidos serão explícitos.
- **III. Layered Architecture**: PASS — store/model, serviços de ferramentas e
  controller/CLI serão separados; erros de domínio terão classes próprias.
- **IV. Test-First Delivery**: PASS — testes determinísticos do store e trace
  serão entregues junto com a implementação.
- **V. Pure and Secure Code**: PASS — formatação e isolamento serão puros quando
  possível; configuração de modelo virá do ambiente sem ler ou versionar `.env`.

## Project Structure

### Documentation (this feature)

```text
specs/001-reasoning-core/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── agents/
│   ├── model.ts
│   ├── react.ts
│   ├── plan-and-execute.ts
│   ├── tools.ts
│   ├── trace.ts
│   └── types.ts
├── models/
│   ├── domain.ts
│   └── store.ts
├── services/
│   └── incidents.ts
├── scripts/
│   └── seed.ts
└── arena.ts

test/
├── store.test.ts
└── trace.test.ts
```

**Structure Decision**: Single Node.js project, mantendo a separação Model,
Service e Controller/CLI exigida pela constituição. Os agentes ficam em
`src/agents`, o estado e modelos em `src/models`, operações de domínio em
`src/services`, e a arena/seed são superfícies de execução. Os testes ficam em
`test/` e não acessam rede.

## Complexity Tracking

Não há violações da constituição que exijam justificativa.

## Phase 0: Research

As decisões de contrato, validação, isolamento, integração OpenRouter, limites
de execução e persistência estão registradas em [research.md](./research.md).

## Phase 1: Design

O modelo de entidades e invariantes está em [data-model.md](./data-model.md).
Os contratos públicos de estratégia, ferramentas e CLI estão em
[contracts/strategy.md](./contracts/strategy.md) e
[contracts/tools-and-arena.md](./contracts/tools-and-arena.md). A validação
executável está descrita em [quickstart.md](./quickstart.md).

## Post-Design Constitution Check

- **I. Type-Safe ESM**: PASS — interfaces e schemas serão tipados e a árvore
  segue o módulo ESM existente.
- **II. Validated Boundaries**: PASS — contratos cobrem tools e CLI; o model
  só será criado após validação da configuração.
- **III. Layered Architecture**: PASS — persistência não será acessada
  diretamente pela arena ou pelos agentes.
- **IV. Test-First Delivery**: PASS — quickstart inclui `npm test` e
  `npm run typecheck`; testes não dependem de rede.
- **V. Pure and Secure Code**: PASS — nenhum artefato pede secrets ou `.env`;
  snapshots e formatação podem ser testados como funções puras.
