# Implementation Plan: Observabilidade Persistida

**Branch**: `012-observabilidade-persistida` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-observabilidade-persistida/spec.md`

## Summary

Adicionar correlação por `requestId`, persistência local de métricas e traces,
logs JSON sanitizados e consulta de uma execução completa por
`GET /requests/:id`. A implementação usará um repositório SQLite injetável,
registrará a execução no serviço de chat e manterá a resposta HTTP e os dados
persistidos validados por Zod.

## Technical Context

**Language/Version**: TypeScript ESM, Node.js 22 LTS, `strict: true`

**Primary Dependencies**: Express, Zod, Sequelize existente, SQLite via `better-sqlite3`, `node:test` e `tsx`

**Storage**: SQLite local para `requests`, `trace_events`, conversas, memórias e dados operacionais via `better-sqlite3`

**Testing**: `node:test` via `tsx`, fake strategy, SQLite temporário/in-memory e
testes HTTP offline

**Target Platform**: Servidor Linux com API HTTP Express

**Project Type**: Serviço web com camadas de serviço, repositório e controller

**Performance Goals**: Consulta de até 1.000 eventos por request em menos de
200 ms em teste de referência; uma linha JSON por evento; nenhuma chamada de
rede adicional para persistência local

**Constraints**: `requestId` não vazio, máximo de 128 caracteres e sem
caracteres de controle; trace ordenado por sequência; payloads sanitizados;
conflitos explícitos; falhas persistidas sem resposta de sucesso indevida

**Scale/Scope**: Uma execução de chat por registro, trace completo da execução,
sem retenção, expurgo ou paginação nesta versão

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Type-safe ESM e `strict: true`: PASS
- Fronteiras HTTP e payloads persistidos validados com Zod: PASS
- Camadas Model/Service/Controller preservadas: PASS
- Testes offline determinísticos antes da implementação: PASS
- Sem secrets em logs, traces ou respostas: PASS
- Nenhuma alteração necessária aos princípios da constituição: PASS

## Project Structure

### Documentation (this feature)

```text
specs/012-observabilidade-persistida/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── chat-request-id.md
│   ├── observability-store.md
│   └── requests-endpoint.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── http/
│   └── server.ts
├── models/
│   └── observability-sqlite.ts
├── obs/
│   ├── logger.ts
│   └── trace-persistence.ts
└── services/
    └── chat.ts

test/
├── http.test.ts
├── observability-store.test.ts
└── logger.test.ts
```

**Structure Decision**: O repositório SQLite ficará em `src/models` e exporá
operações tipadas para requests e eventos. `src/obs` concentrará sanitização,
logger e adaptação do trace. `chat.ts` coordenará o ciclo de vida da execução;
`server.ts` validará a entrada/saída e exporá `/requests/:id`.

## Phase 0: Research

As decisões sobre driver SQLite, isolamento de testes, ordenação e sanitização
estão em [research.md](./research.md).

## Phase 1: Design

Entidades e invariantes estão em [data-model.md](./data-model.md), contratos
HTTP e de persistência estão em [contracts/](./contracts/) e os cenários
executáveis estão em [quickstart.md](./quickstart.md).

## Constitution Check (Post-Design)

- Persistência SQLite isolada atrás de repositório tipado: PASS
- `requestId`, trace e respostas HTTP validados na borda: PASS
- Falhas de persistência não ocultam falhas de modelo nem criam sucesso falso: PASS
- Logger emite somente metadados sanitizados: PASS
- Testes cobrem sucesso, falha, conflito, 404 e ordenação: PASS

## Complexity Tracking

Nenhuma violação da constituição foi identificada.
