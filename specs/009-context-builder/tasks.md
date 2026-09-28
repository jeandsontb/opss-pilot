---

description: "Task list for shared context construction and section budgets"
---

# Tasks: ContextBuilder com Orçamento por Seção

**Input**: Design documents from `specs/009-context-builder/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: Required by FR-012 and the feature specification. Tests must be deterministic, fake-based, and offline.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the shared context surface without changing strategy behavior yet.

- [X] T001 Review current prompt composition, memory shape, history serialization, and strategy invocation in `src/services/chat.ts`, `src/memory/memory-store.ts`, and `src/agents/types.ts`
- [X] T002 [P] Create the context builder and test targets `src/context/context-builder.ts` and `test/context-builder.test.ts`
- [X] T003 [P] Create the strategy integration test target `test/strategy-context.test.ts` for ReAct, plan-and-execute, and reflection/fake strategies
- [X] T004 [P] Document the shared section order and budget variables in `specs/009-context-builder/contracts/context-builder.md` and `specs/009-context-builder/contracts/strategy-integration.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define validated budget/input/output types and deterministic token-fit helpers used by all stories.

**⚠️ CRITICAL**: No user story implementation should begin before this phase is complete.

- [X] T005 Define `ContextBudget`, `ContextInput`, `BuiltContext`, and scored-memory types in `src/context/context-builder.ts`, preserving immutable system/current-message fields
- [X] T006 Implement validated environment parsing for `CONTEXT_BUDGET_SUMMARY`, `CONTEXT_BUDGET_WINDOW`, and `CONTEXT_BUDGET_MEMORIES` in `src/context/context-builder.ts`, with defaults 200/1200/300 and explicit rejection of invalid, negative, or fractional values while allowing absent variables to use defaults
- [X] T007 Implement deterministic `chars / 4` fit/truncation helpers in `src/context/context-builder.ts` by reusing `estimateTokens` from `src/context/tokens.ts`, without modifying real `promptTokens` metrics
- [X] T008 [P] Add pure tests for defaults, valid overrides, invalid environment values, empty sections, budget zero, and unchanged system/current message in `test/context-builder.test.ts`
- [X] T009 Run `npm run typecheck` and `npm test` after the foundational builder/types/tests to establish a green baseline

**Checkpoint**: Context contracts and validated budgets are available for independent story work.

---

## Phase 3: User Story 1 - Construir contexto único para todas as estratégias (Priority: P1) 🎯 MVP

**Goal**: Route every strategy through one shared context construction result with a stable section order.

**Independent Test**: Fake ReAct, plan-and-execute, and reflection paths receive identical prompts for identical sources and budgets.

### Tests for User Story 1

- [X] T010 [P] [US1] Add builder serialization tests for the fixed `system`, `summary`, `window`, `memories`, and `message` section order in `test/context-builder.test.ts`
- [X] T011 [P] [US1] Add integration tests that capture prompts from fake `react`, `plan-and-execute`, and reflection-wrapped strategies and compare them in `test/strategy-context.test.ts`
- [X] T012 [P] [US1] Add chat integration assertions that empty summary/memory sources remain valid sections and existing answer/trace/metrics are unchanged in `test/chat.test.ts`

### Implementation for User Story 1

- [X] T013 [US1] Implement `ContextBuilder.build` in `src/context/context-builder.ts`, returning prompt, selected sources, applied budgets, and deterministic section serialization
- [X] T014 [US1] Replace duplicated `composePrompt` logic in `src/services/chat.ts` with the shared builder while preserving history/message source semantics and context breakdown inputs
- [X] T015 [US1] Ensure the default `react` and `plan-and-execute` strategy paths consume the prompt produced by `runChat` without local recomposition in `src/agents/react.ts` and `src/agents/plan-and-execute.ts`
- [X] T016 [US1] Preserve reflection and other strategy wrappers over the shared prompt in `src/agents/reflection.ts` and `src/agents/types.ts`

**Checkpoint**: All strategy paths receive the same built prompt and no longer maintain divergent section composition.

---

## Phase 4: User Story 2 - Aplicar cortes determinísticos por seção (Priority: P1)

**Goal**: Enforce independent section budgets with the specified cut order.

**Independent Test**: Low budgets retain the newest window entries, highest-score memories, and intact system/current message while reducing only optional sections.

### Tests for User Story 2

- [X] T017 [P] [US2] Add low-window-budget tests proving oldest messages are removed first and remaining messages keep chronological order in `test/context-builder.test.ts`
- [X] T018 [P] [US2] Add low-memory-budget tests proving lowest scores are removed first, ties preserve original order, and retained facts serialize deterministically in `test/context-builder.test.ts`
- [X] T019 [P] [US2] Add summary truncation tests proving summary-only reduction and byte-for-byte preservation of system/current message in `test/context-builder.test.ts`
- [X] T020 [P] [US2] Add HTTP/chat regression tests proving low budgets do not alter `promptTokens`, `llCalls`, `latencyMs`, `answer`, trace, or response status in `test/http.test.ts`

### Implementation for User Story 2

- [X] T021 [US2] Implement whole-message window trimming from the oldest entries until the configured `window` estimate fits in `src/context/context-builder.ts`
- [X] T022 [US2] Implement stable memory selection by descending score with original-order tie breaking until the configured `memories` estimate fits in `src/context/context-builder.ts`
- [X] T023 [US2] Implement deterministic summary truncation to the configured `summary` estimate while keeping the summary section valid in `src/context/context-builder.ts`
- [X] T024 [US2] Expose selected-source metadata from `BuiltContext` for tests/diagnostics without adding required HTTP fields or changing token usage semantics

**Checkpoint**: Low section budgets cut only their own sources in the required deterministic order.

---

## Phase 5: User Story 3 - Configurar budgets por ambiente (Priority: P2)

**Goal**: Make section budgets configurable and safely validated through environment values.

**Independent Test**: Injected environment maps produce defaults or valid overrides, while malformed values throw explicit errors before prompt construction.

### Tests for User Story 3

- [X] T025 [P] [US3] Add isolated environment parsing tests for absent, zero, positive integer, negative, fractional, non-numeric, and whitespace values in `test/context-builder.test.ts`
- [X] T026 [P] [US3] Add server composition tests proving a builder configured with environment budgets is used for each strategy path in `test/strategy-context.test.ts`
- [X] T027 [P] [US3] Add tests for budget independence proving an oversized section does not consume or truncate another section in `test/context-builder.test.ts`

### Implementation for User Story 3

- [X] T028 [US3] Add an explicit budget configuration factory in `src/context/context-builder.ts` that accepts an injected environment object for tests and `process.env` in production
- [X] T029 [US3] Wire the configured `ContextBuilder` into `src/services/chat.ts` and `src/http/server.ts` through dependency injection while preserving existing server options compatibility
- [X] T030 [US3] Document runtime variables, defaults, invalid-value behavior, and low-budget diagnostics in `specs/009-context-builder/quickstart.md`

**Checkpoint**: Operators can tune section budgets per environment without code changes or silent invalid configuration.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate complete integration and protect existing behavior.

- [X] T031 [P] Update [data-model.md](./data-model.md) and contracts if final exported names or metadata fields differ from the planned builder contract
- [X] T032 [P] Add focused documentation comments only where truncation/tie behavior is not self-evident in `src/context/context-builder.ts`
- [X] T033 Run `npm run typecheck` and `npm test` across context, chat, HTTP, strategy, memory, reflection, and token tests
- [X] T034 Run `git diff --check` and validate quickstart commands from `specs/009-context-builder/quickstart.md`
- [X] T035 Confirm no regressions to answer, trace, history behavior, memory injection, reflection, `promptTokens`, context breakdown, and HTTP statuses in `src/services/chat.ts` and `test/`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No implementation dependency; can begin immediately.
- **Foundational (Phase 2)**: Depends on the setup review and blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on T005-T009.
- **User Story 2 (Phase 4)**: Depends on the shared builder integration from US1.
- **User Story 3 (Phase 5)**: Depends on the builder cut behavior from US2.
- **Polish (Phase 6)**: Depends on all selected stories.

### User Story Dependencies

- **US1 (P1)**: Independent MVP after Phase 2.
- **US2 (P1)**: Builds on US1's shared builder; remains independently testable with pure inputs.
- **US3 (P2)**: Builds on US1/US2 to validate runtime configuration and dependency injection.

### Within Each User Story

- Write deterministic tests before implementation.
- Implement pure builder behavior before chat/controller wiring.
- Keep edits to shared files sequentially coordinated.
- Validate the checkpoint before moving to the next story.

### Parallel Opportunities

- T002-T004 can run in parallel during setup.
- T008 can run in parallel with documentation updates after T005-T007.
- T010-T012 can run in parallel before US1 implementation.
- T017-T020 can run in parallel before cut implementation.
- T025-T027 can run in parallel before environment wiring.
- T031-T034 can run in parallel during polish; T035 follows their results.

## Parallel Example: User Story 1

```bash
Task: "Test section serialization in test/context-builder.test.ts"
Task: "Test identical prompts across strategies in test/strategy-context.test.ts"
Task: "Test empty sources and preserved metrics in test/chat.test.ts"
```

## Parallel Example: User Story 2

```bash
Task: "Test oldest-window trimming in test/context-builder.test.ts"
Task: "Test score-based memory trimming in test/context-builder.test.ts"
Task: "Test summary-only truncation and immutable sections in test/context-builder.test.ts"
Task: "Test metric/status compatibility in test/http.test.ts"
```

## Parallel Example: User Story 3

```bash
Task: "Test environment parsing in test/context-builder.test.ts"
Task: "Test strategy wiring with injected budgets in test/strategy-context.test.ts"
Task: "Test independent section budgets in test/context-builder.test.ts"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2.
2. Implement the pure builder and route chat through it in Phase 3.
3. Run US1 tests and the existing suite.
4. Stop with a consistent shared context before adding aggressive cuts.

### Incremental Delivery

1. Add deterministic section trimming in US2.
2. Add environment injection and validation in US3.
3. Complete regression, documentation, and quickstart validation.

### Constraints

- Never truncate system or current message.
- Never use budget estimates as real provider usage.
- Never let one section consume another section's budget.
- Preserve stable ordering and score tie behavior.
- Keep fake strategy tests offline and compatible with current metrics.
