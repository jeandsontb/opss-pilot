---

description: "Tasks for model resilience with retry, fallback, observability, and HTTP 503 handling"
---

# Tasks: Resiliência de Modelo

**Input**: Design documents from `/specs/011-resiliencia-modelo/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included because the specification explicitly requires deterministic fake-model and HTTP coverage.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the configuration and test seams required by the resilience feature.

- [X] T001 Add `OPENROUTER_MODEL_FALLBACK` to `.env.example` with an explanatory optional-model comment, without adding credentials
- [X] T002 [P] Document retry/fallback configuration and offline validation commands in `specs/011-resiliencia-modelo/quickstart.md`
- [X] T003 [P] Inspect the installed LangChain runnable APIs and record the supported retry/fallback composition in `src/agents/model.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create shared types, configuration boundaries, and error primitives before story-specific work.

**CRITICAL**: User-story implementation depends on this phase.

- [X] T004 Extend `Metrics` with optional `modelUsed` and add the typed `fallback` trace event shape in `src/agents/types.ts`, preserving existing trace event compatibility
- [X] T005 Add sanitized fallback formatting for `fallback` events in `src/agents/trace.ts`
- [X] T006 [P] Define validated model resilience configuration, retry policy, model-attempt metadata, and callback/result types in `src/agents/model.ts` using the `ModelConfiguration` rules: non-empty primary, optional non-empty fallback, and finite positive retry limit
- [X] T007 [P] Add the `ModelUnavailableError` domain class in `src/agents/model.ts` with no provider message, prompt, header, credential, or secret in its public message
- [X] T008 [P] Add injectable fake-model and resilience-policy test helpers in `test/model-resilience.test.ts` so all resilience scenarios run without OpenRouter or network access
- [X] T009 Update response schemas and trace validation to accept `metrics.modelUsed` and `type: "fallback"` in `src/http/server.ts` and related schemas

**Checkpoint**: Shared types, sanitized trace support, validated configuration, and fake-model seams are ready.

---

## Phase 3: User Story 1 - Recuperar falhas transitórias do modelo (Priority: P1) 🎯 MVP

**Goal**: Retry transient primary-model failures within a finite limit and use a configured fallback only after the primary is exhausted.

**Independent Test**: Invoke the shared model executor with fake primary/fallback models and verify immediate success, retry success, fallback success, absent fallback, and finite-attempt behavior.

### Tests for User Story 1

- [X] T010 [P] [US1] Add fake-model tests for primary retry success, immediate primary success, and no unnecessary fallback in `test/model-resilience.test.ts`
- [X] T011 [P] [US1] Add fake-model tests for exhausted primary followed by fallback success, empty fallback omission, and bounded total attempts in `test/model-resilience.test.ts`
- [X] T012 [P] [US1] Add classification tests proving permanent/non-transient errors are propagated without silent fallback in `test/model-resilience.test.ts`

### Implementation for User Story 1

- [X] T013 [US1] Read and validate `OPENROUTER_MODEL`, `OPENROUTER_MODEL_FALLBACK`, and retry policy in `src/agents/model.ts`, treating missing or whitespace-only fallback as unconfigured
- [X] T014 [US1] Implement the shared primary-with-retry then optional-fallback executor in `src/agents/model.ts`, calling no absent model and never retrying indefinitely
- [X] T015 [US1] Make `createModel` expose the centralized resilience policy while preserving the existing OpenRouter base URL, API-key handling, and temperature `0` behavior in `src/agents/model.ts`
- [X] T016 [US1] Replace local rate-limit fallback logic with the shared executor in `src/agents/react.ts`
- [X] T017 [US1] Replace `invokeWithFallback` and equivalent local retry/fallback paths with the shared executor in `src/agents/plan-and-execute.ts`
- [X] T018 [US1] Replace direct primary/fallback critique calls with the shared executor in `src/agents/reflection.ts`
- [X] T019 [US1] Route default graph-router model calls through the shared executor in `src/graph/production-graph.ts`

**Checkpoint**: All model call sites use one bounded resilience policy; primary success and retry/fallback behavior are independently testable offline.

---

## Phase 4: User Story 2 - Tornar o fallback observável (Priority: P1)

**Goal**: Preserve complete strategy traces while reporting the effective model and exactly one sanitized fallback event per model switch.

**Independent Test**: Run primary-success and fallback-success scenarios through the executor, router, strategies, and reflection; verify model identity, accumulated metrics, node association, and trace ordering.

### Tests for User Story 2

- [X] T020 [P] [US2] Add assertions for `modelUsed`, accumulated `llCalls`, latency, and real `promptTokens` preservation across retries and fallback in `test/model-resilience.test.ts`
- [X] T021 [P] [US2] Add assertions that fallback emits exactly one sanitized event per effective switch and never exposes raw errors, prompts, headers, or credentials in `test/model-resilience.test.ts`
- [X] T022 [P] [US2] Cover router fallback and strategy fallback propagation, including node association and retention of all pre-existing trace events, in `test/production-graph.test.ts` and `test/reflection.test.ts`

### Implementation for User Story 2

- [X] T023 [US2] Emit a single typed `fallback` event through the shared executor callback only when switching from primary to fallback, with sanitized reason `primary-unavailable` in `src/agents/model.ts`
- [X] T024 [US2] Accumulate effective calls, latency, real usage when available, and `modelUsed` from every executor invocation in `src/agents/react.ts`, `src/agents/plan-and-execute.ts`, and `src/agents/reflection.ts`
- [X] T025 [US2] Attach fallback events to the invoking node and merge router metrics/traces with strategy metrics/traces without dropping existing events in `src/graph/production-graph.ts`
- [X] T026 [US2] Preserve fallback events and `modelUsed` through the common chat result and response assembly in `src/services/chat.ts`
- [X] T027 [US2] Validate and serialize `fallback` events and `modelUsed` in the HTTP response without exposing raw provider failures in `src/http/server.ts`

**Checkpoint**: Successful primary and degraded fallback responses are observable, correctly attributed, and schema-valid.

---

## Phase 5: User Story 3 - Responder explicitamente quando todos os modelos falham (Priority: P1)

**Goal**: Return a validated generic HTTP 503 only when every configured model attempt is unavailable.

**Independent Test**: Call `/chat` with fake primary and fallback models that fail completely, with and without a fallback configured, and verify 503, generic body, and no success-shaped response.

### Tests for User Story 3

- [X] T028 [P] [US3] Add HTTP tests for total primary/fallback failure returning status 503 with the validated generic error body in `test/http.test.ts`
- [X] T029 [P] [US3] Add HTTP tests for primary-only total failure, absent fallback calls, and sanitization against provider details in `test/http.test.ts`
- [X] T030 [P] [US3] Add regression tests proving invalid input, unknown strategy, timeout, and non-availability errors retain their existing HTTP mappings in `test/http.test.ts`

### Implementation for User Story 3

- [X] T031 [US3] Throw `ModelUnavailableError` only after all configured model attempts are exhausted, preserving the original cause internally without exposing it in `src/agents/model.ts`
- [X] T032 [US3] Map only `ModelUnavailableError` to HTTP 503 with a generic validated body and no provider details in `src/http/server.ts`
- [X] T033 [US3] Propagate total model failure through router, ReAct, plan-and-execute, reflection, and chat service paths without converting unrelated errors in `src/graph/production-graph.ts`, `src/agents/react.ts`, `src/agents/plan-and-execute.ts`, `src/agents/reflection.ts`, and `src/services/chat.ts`

**Checkpoint**: `/chat` clearly signals total model unavailability while preserving all existing error contracts.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the complete feature and keep implementation and documentation consistent.

- [X] T034 [P] Update resilience contracts and quickstart examples to match the final exported types and HTTP response shape in `specs/011-resiliencia-modelo/contracts/` and `specs/011-resiliencia-modelo/quickstart.md`
- [X] T035 [P] Add or update focused trace and metrics regression tests for formatter compatibility in `test/trace.test.ts`
- [X] T036 Run the complete deterministic validation suite with `npm run typecheck` and `npm test`
- [X] T037 Run `git diff --check` and review changed files for secret leakage, unbounded retry loops, duplicate fallback events, and stale local fallback implementations

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No code dependency; T003 informs the model-factory implementation.
- **Foundational (Phase 2)**: Depends on Phase 1 and blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Phase 2; delivers the MVP resilience executor.
- **User Story 2 (Phase 4)**: Depends on US1 because observability wraps the working executor.
- **User Story 3 (Phase 5)**: Depends on US1 and the shared error primitive from Phase 2; can be implemented in parallel with US2 once the executor contract is stable.
- **Polish (Phase 6)**: Depends on all desired stories.

### User Story Dependencies

- **US1 (P1)**: No dependency on other user stories after Foundational.
- **US2 (P1)**: Depends on US1's executor and model-attempt result contract.
- **US3 (P1)**: Depends on US1's exhausted-chain behavior; independent of US2's trace formatting except for response schema coverage.

### Parallel Opportunities

- T002, T003, T006, T007, and T008 can proceed in parallel after setup inspection.
- Within US1, T010-T012 can run in parallel before T013-T019.
- T016-T019 can run in parallel after T014-T015, because they touch separate call-site files.
- Within US2, T020-T022 can run in parallel before implementation tasks.
- US2 and US3 can proceed in parallel after US1 if separate contributors own trace/metrics and HTTP error handling.
- T028-T030 and T034-T035 can run in parallel with one another.

## Parallel Example: User Story 1

```text
Task T010: fake primary retry and immediate-success tests in test/model-resilience.test.ts
Task T011: fallback-chain and bounded-attempt tests in test/model-resilience.test.ts
Task T012: permanent-error classification tests in test/model-resilience.test.ts

After tests are prepared:
Task T016: migrate ReAct in src/agents/react.ts
Task T017: migrate plan-and-execute in src/agents/plan-and-execute.ts
Task T018: migrate reflection in src/agents/reflection.ts
Task T019: migrate router in src/graph/production-graph.ts
```

## Parallel Example: User Story 2

```text
Task T020: metrics accumulation tests in test/model-resilience.test.ts
Task T021: sanitized fallback-event tests in test/model-resilience.test.ts
Task T022: graph/reflection propagation tests in test/production-graph.test.ts and test/reflection.test.ts
```

## Parallel Example: User Story 3

```text
Task T028: total-failure 503 test in test/http.test.ts
Task T029: primary-only and sanitization HTTP tests in test/http.test.ts
Task T030: existing-error-regression tests in test/http.test.ts
```

## Implementation Strategy

1. Complete the shared contracts and fake seams.
2. Deliver US1 as the MVP: one bounded retry/fallback executor used by every model call site.
3. Add US2 observability without changing successful primary behavior.
4. Add US3's explicit 503 boundary and regression coverage.
5. Run the full typecheck, test suite, and diff/secret review before marking tasks complete.
