---

description: "Task list for the unified production reasoning graph"
---

# Tasks: Grafo Unificado de Raciocínio

**Input**: Design documents from `specs/010-grafo-unificado/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: Required by the specification. Tests must be deterministic, fake-based, and offline.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the shared graph, route, and trace surfaces without changing request behavior yet.

- [X] T001 Review current strategy registry, reflection wrapper, ContextBuilder integration, HTTP schemas, and metrics accumulation in `src/agents/index.ts`, `src/agents/reflection.ts`, `src/services/chat.ts`, and `src/http/server.ts`
- [X] T002 [P] Add graph test target `test/production-graph.test.ts` with fake router and fake strategies
- [X] T003 [P] Add trace contract test target `test/trace.test.ts` for node-enriched events and route events
- [X] T004 [P] Add HTTP override test cases to `test/http.test.ts` without changing existing tests
- [X] T005 [P] Document the route catalog, router table, override source, and trace node contract in `specs/010-grafo-unificado/contracts/production-graph.md`, `specs/010-grafo-unificado/contracts/router.md`, and `specs/010-grafo-unificado/contracts/chat-trace.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define validated route and trace types that every graph node and HTTP response will use.

**CRITICAL**: No user story implementation should begin before this phase is complete.

- [X] T006 Extend `TraceEvent` in `src/agents/types.ts` with a non-empty `node` field on every existing event variant and add the structured `route` event with `route`, `reason`, and `source`
- [X] T007 Define the stable route catalog type for `react`, `plan-and-execute`, and `reflection` plus validated `RouteDecision` and `ProductionGraphInput` types in `src/graph/production-graph.ts`
- [X] T008 Add Zod schemas for route decisions, route names, node-enriched trace events, and graph results in `src/graph/production-graph.ts` and reuse them at the HTTP boundary
- [X] T009 Implement pure trace normalization helpers in `src/graph/production-graph.ts` that preserve every event payload and assign the producing node when legacy strategies omit `node`
- [X] T010 [P] Add unit assertions for route names, non-empty reasons, invalid decisions, and normalization of every existing trace event type in `test/trace.test.ts`
- [X] T011 Run `npm run typecheck` and `npm test` after foundational type/schema changes and resolve all compatibility errors before story work

**Checkpoint**: Route and trace contracts are type-safe, validated, and ready for graph execution.

---

## Phase 3: User Story 1 - Roteamento automático para a estratégia adequada (Priority: P1) 🎯 MVP

**Goal**: Build the production graph that constructs context, routes automatically, executes exactly one strategy node, and returns an auditable result.

**Independent Test**: Invoke the graph with fake router decisions for all three valid routes and verify one selected strategy, one route event before strategy events, and a final answer.

### Tests for User Story 1

- [X] T012 [P] [US1] Add fake-router tests for `react`, `plan-and-execute`, and `reflection` selection in `test/production-graph.test.ts`
- [X] T013 [P] [US1] Add graph-order tests proving context precedes router, route precedes strategy, and response is last in `test/production-graph.test.ts`
- [X] T014 [P] [US1] Add invalid-route and invalid-structured-decision tests proving no strategy executes and errors are explicit in `test/production-graph.test.ts`
- [X] T015 [P] [US1] Add router-prompt assertion for the explicit strategy table and route criteria in `test/production-graph.test.ts`

### Implementation for User Story 1

- [X] T016 [US1] Implement the route catalog and strategy-node adapters for `react`, `plan-and-execute`, and `reflection` in `src/graph/production-graph.ts`
- [X] T017 [US1] Implement the router prompt with the explicit route table and structured `{ route, reason }` output using `withStructuredOutput` in `src/graph/production-graph.ts`
- [X] T018 [US1] Implement the context, router, strategy, and response nodes with typed state and conditional routing in `src/graph/production-graph.ts`
- [X] T019 [US1] Accumulate router and selected-strategy `llCalls`, `latencyMs`, and `promptTokens` without replacing known real usage in `src/graph/production-graph.ts`
- [X] T020 [US1] Ensure the graph passes `maxIterations`, `noReplanner`, `store`, and `memoryStore` only to the selected strategy node in `src/graph/production-graph.ts`
- [X] T021 [US1] Export a graph factory/invoker with injectable router and strategy dependencies for deterministic tests from `src/graph/production-graph.ts`
- [X] T022 [US1] Add the unified graph entry point to `src/agents/index.ts` while preserving direct strategy resolution compatibility

**Checkpoint**: Automatic routing works independently for all three routes with explicit failures and preserved metrics.

---

## Phase 4: User Story 2 - Forçar uma estratégia pelo endpoint de chat (Priority: P1)

**Goal**: Route `/chat` through the unified graph and honor a valid optional `strategy` as a deterministic override.

**Independent Test**: Send fake `/chat` requests with and without `strategy`; verify override execution, router bypass, route source, and explicit unknown-strategy errors.

### Tests for User Story 2

- [X] T023 [P] [US2] Add HTTP tests for valid `react`, `plan-and-execute`, and `reflection` overrides with fake strategies in `test/http.test.ts`
- [X] T024 [P] [US2] Add HTTP tests proving override bypasses the router and records `source: "override"` in `test/http.test.ts`
- [X] T025 [P] [US2] Add HTTP tests for omitted strategy using an injected fake router and for unknown/blank strategy values in `test/http.test.ts`
- [X] T026 [P] [US2] Add `runChat` integration tests proving the same built context is delivered to the graph regardless of override in `test/strategy-context.test.ts`

### Implementation for User Story 2

- [X] T027 [US2] Extend the graph input and `runChat` options to carry the optional validated strategy override without recomposing context in `src/services/chat.ts` and `src/graph/production-graph.ts`
- [X] T028 [US2] Replace direct strategy selection in `src/http/server.ts` with the unified graph while preserving reflection option, timeout handling, conversation persistence, and dependency injection
- [X] T029 [US2] Validate optional `strategy` against the graph catalog in `src/http/server.ts` and translate unknown strategy errors to the existing 422 response
- [X] T030 [US2] Build an override route decision with `source: "override"` and a non-empty reason while skipping router model invocation in `src/graph/production-graph.ts`
- [X] T031 [US2] Preserve response metrics, context breakdown, conversation IDs, learning reflection scheduling, and existing HTTP response shape after graph integration in `src/services/chat.ts` and `src/http/server.ts`

**Checkpoint**: `/chat` uses the unified graph, supports automatic routing, and deterministically honors valid overrides.

---

## Phase 5: User Story 3 - Trace uniforme e auditável (Priority: P1)

**Goal**: Make every graph and strategy trace event attributable to a non-empty node and expose route decisions consistently.

**Independent Test**: Run all route paths with all existing event variants and verify every event has `node`, route appears first, and override source is distinguishable.

### Tests for User Story 3

- [X] T032 [P] [US3] Add coverage for `thought`, `action`, `observation`, `plan`, `critique`, `answer`, and `route` node values in `test/trace.test.ts`
- [X] T033 [P] [US3] Add reflection trace tests proving regenerated events and critique events retain distinct node attribution in `test/production-graph.test.ts`
- [X] T034 [P] [US3] Update HTTP response schema tests to require `node` on every event and validate the route event shape in `test/http.test.ts`
- [X] T035 [P] [US3] Add deterministic trace formatting assertions showing the route event before strategy events in `test/trace.test.ts`

### Implementation for User Story 3

- [X] T036 [US3] Normalize selected-strategy events under `react`, `plan-and-execute`, or `reflection` node names without dropping action arguments or plan steps in `src/graph/production-graph.ts`
- [X] T037 [US3] Update trace formatting and serialization to preserve `node` and render route source, route, and reason deterministically in `src/trace.ts`
- [X] T038 [US3] Update the HTTP trace Zod schema and response validation to accept the route event and require non-empty `node` on all variants in `src/http/server.ts`
- [X] T039 [US3] Ensure direct strategy outputs remain backward-compatible internally while graph outputs always satisfy the enriched public trace contract in `src/agents/types.ts` and `src/graph/production-graph.ts`

**Checkpoint**: Automatic and override executions produce complete, attributable, and HTTP-valid traces.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the complete graph against the specification and protect existing behavior.

- [X] T040 [P] Update [data-model.md](./data-model.md) and contracts if final exported names, route reasons, or trace metadata differ from the implemented contract
- [X] T041 [P] Update [quickstart.md](./quickstart.md) with final commands and expected automatic-routing and override responses
- [X] T042 [P] Add focused error messages and logging for router failure, invalid structured output, unknown route, and graph timeout in `src/graph/production-graph.ts` and `src/http/server.ts`
- [X] T043 [P] Verify no router call occurs on valid override and no unselected strategy node executes using `test/production-graph.test.ts` and `test/http.test.ts`
- [X] T044 Run `npm run typecheck`, `npm test`, and the complete quickstart validation from `specs/010-grafo-unificado/quickstart.md`
- [X] T045 Run `git diff --check` and confirm all existing reasoning, reflection, chat, token, memory, and trace tests remain green

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No implementation dependency; can begin immediately.
- **Foundational (Phase 2)**: Depends on Setup review and blocks all user stories.
- **US1 (Phase 3)**: Depends on T006-T011; delivers the graph and automatic routing MVP.
- **US2 (Phase 4)**: Depends on US1 graph entry point and route catalog.
- **US3 (Phase 5)**: Depends on foundational trace types and graph integration; can begin after US1, with HTTP assertions after US2.
- **Polish (Phase 6)**: Depends on all selected stories.

### User Story Dependencies

- **US1 (P1)**: Independent after foundational types; implements the core graph.
- **US2 (P1)**: Depends on US1's graph API but is independently testable with fake router/strategies.
- **US3 (P1)**: Uses the graph and HTTP surfaces from US1/US2 to guarantee public trace auditability.

### Within Each User Story

- Write deterministic tests before implementation.
- Implement pure schemas and adapters before graph/controller wiring.
- Keep edits to shared files sequentially coordinated.
- Run the story checkpoint before moving to the next story.

### Parallel Opportunities

- T002-T005 can run in parallel during setup.
- T010 can run in parallel with T006-T009 after the target types are agreed.
- T012-T015 can run in parallel before US1 implementation.
- T023-T026 can run in parallel before US2 implementation.
- T032-T035 can run in parallel before US3 implementation.
- T040-T043 can run in parallel during polish; T044-T045 follow all edits.

## Parallel Example: User Story 1

```bash
Task: "Test all automatic routes in test/production-graph.test.ts"
Task: "Test graph node order in test/production-graph.test.ts"
Task: "Test invalid decisions in test/production-graph.test.ts"
Task: "Assert router strategy table in test/production-graph.test.ts"
```

## Parallel Example: User Story 2

```bash
Task: "Test strategy overrides in test/http.test.ts"
Task: "Test router bypass and override trace source in test/http.test.ts"
Task: "Test omitted and unknown strategies in test/http.test.ts"
Task: "Test shared context delivery in test/strategy-context.test.ts"
```

## Parallel Example: User Story 3

```bash
Task: "Test node attribution for every event type in test/trace.test.ts"
Task: "Test reflection node attribution in test/production-graph.test.ts"
Task: "Test HTTP trace schema in test/http.test.ts"
Task: "Test deterministic route formatting in test/trace.test.ts"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup and Foundational phases.
2. Implement the graph with automatic routing for all three catalog routes.
3. Validate route order, structured decisions, selected-node execution, and metrics.
4. Stop with a callable graph API before changing `/chat`.

### Incremental Delivery

1. Add the `/chat` integration and deterministic strategy override in US2.
2. Enforce the complete public trace contract in US3.
3. Finish error handling, documentation, and regression validation.

### Constraints

- Execute exactly one strategy node per graph run.
- Do not invoke the router for a valid explicit override.
- Preserve all existing event payloads and metrics.
- Treat invalid routes and malformed structured decisions as explicit failures.
- Keep model-dependent router tests injectable and offline by default.
