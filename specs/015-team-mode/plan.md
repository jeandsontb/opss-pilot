# Implementation Plan: Team Mode — Multi-Agent Copilot de Plantão

**Branch**: `015-team-mode` | **Date**: 2026-09-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/015-team-mode/spec.md`

---

## Summary

Implementar o modo equipe multi-agente no OpssPilot: um grafo LangGraph com supervisor estruturado (`withStructuredOutput({ next, brief }}`), blackboard compartilhado via `Annotation.Root`, três papéis com restrições explícitas (analista, planejador, executor), rastreamento de handoffs no `trace` e endpoint HTTP `POST /team` com teto de 8 ciclos.

---

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 22 LTS, ESM nativo (`"type": "module"`)

**Primary Dependencies**:
- `@langchain/langgraph` — StateGraph, Annotation, addConditionalEdges, END, START
- `@langchain/core` — BaseMessage, HumanMessage, AIMessage
- `@langchain/openai` — ChatOpenAI, withStructuredOutput
- `zod` — validação de schema (supervisor, request, response)
- `express` — rota `/team` no servidor existente
- `better-sqlite3` — via `SqliteConversationStore` existente (sem alteração)

**Storage**: SQLite via `SqliteConversationStore` (conversas) e `SqliteOperationalStore` (incidentes). Sem novas tabelas.

**Testing**: `node:test` via `tsx`, seguindo padrão de todos os outros testes do projeto.

**Target Platform**: Linux server, Node.js 22 LTS.

**Project Type**: Web service (API HTTP Express + módulo de agentes LangGraph).

**Performance Goals**: Ciclo completo (3 papéis) em < 60s no ambiente de desenvolvimento.

**Constraints**:
- Máximo 8 ciclos por execução (configurável).
- Sem novas dependências além das já no `package.json`.
- `npm test` e `npm run typecheck` devem permanecer verdes.

**Scale/Scope**: Mesmo escopo do servidor existente (uso local / acadêmico). Sem requisitos de multi-tenant ou escalabilidade horizontal.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio                  | Status | Observação                                                                          |
|----------------------------|--------|-------------------------------------------------------------------------------------|
| **I. Type-Safe ESM**       | ✅ PASS | TypeScript strict, ESM puro, sem `require()` ou `any` implícito                   |
| **II. Validated Boundaries**| ✅ PASS | `teamRequestSchema` Zod na borda HTTP; `supervisorSchema` Zod na saída estruturada |
| **III. Layered Architecture**| ✅ PASS | `src/team/` = camada de agente; rota em `src/http/server.ts`; sem bypass de camadas |
| **IV. Test-First Delivery** | ✅ PASS | Cada novo módulo terá teste em `tests/` antes de integrar ao servidor              |
| **V. Pure and Secure Code** | ✅ PASS | Sem leitura de `.env` em runtime além do padrão; sem novos secrets                |

**Re-check pós-design (Phase 1)**: Todos os gates mantidos. O grafo de equipe é isolado em `src/team/`; a extensão de `TraceEvent` é aditiva e não quebra contratos existentes.

---

## Project Structure

### Documentation (this feature)

```text
specs/015-team-mode/
├── plan.md              # Este arquivo
├── research.md          # Phase 0 — decisões técnicas
├── data-model.md        # Phase 1 — entidades e blackboard
├── quickstart.md        # Phase 1 — guia de validação
├── contracts/
│   └── team-endpoint.md # Phase 1 — contrato HTTP POST /team
└── tasks.md             # Phase 2 — gerado por /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── agents/
│   └── types.ts          # MODIFICADO: adiciona HandoffEvent à union TraceEvent
│   └── trace.ts          # MODIFICADO: adiciona branch handoff em formatTraceEvent
├── team/                  # NOVO módulo
│   ├── types.ts           # TeamRole, SupervisorDecision, TeamState, TeamRequest, TeamResult
│   ├── tools.ts           # createAnalystTools(), createExecutorTools()
│   ├── supervisor.ts      # nó supervisor com withStructuredOutput
│   ├── analyst.ts         # nó analista (somente leitura, sem propostas)
│   ├── planner.ts         # nó planejador (sem tools)
│   ├── executor.ts        # nó executor (com tools de incidente)
│   └── graph.ts           # StateGraph + addConditionalEdges + runTeam()
├── http/
│   └── server.ts          # MODIFICADO: adiciona app.post("/team", ...)
└── ...

tests/
├── team-graph.test.ts     # NOVO: testes unitários do grafo (in-memory, mock LLM)
├── team-endpoint.test.ts  # NOVO: testes HTTP da rota /team
└── ...
```

**Structure Decision**: Módulo `src/team/` isolado seguindo o padrão de `src/agents/`. A rota é adicionada a `src/http/server.ts` (único ponto de montagem HTTP) para manter a coerência arquitetural. Testes em `tests/` no nível raiz, seguindo o padrão existente.

---

## Complexity Tracking

> Nenhuma violação de constituição identificada. Seção não aplicável.
