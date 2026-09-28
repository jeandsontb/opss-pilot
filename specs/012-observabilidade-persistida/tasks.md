---

description: "Tasks for persisted request traces and structured JSON logs"
---

# Tasks: Observabilidade Persistida

**Input**: Design documents from `/specs/012-observabilidade-persistida/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included because the specification and constitution require deterministic offline coverage.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the SQLite dependency and configuration without exposing secrets.

- [X] T001 Add the SQLite driver required by the plan to `package.json` and `package-lock.json`, preserving existing PostgreSQL dependencies
- [X] T002 [P] Add an optional observability database path setting to `.env.example` without adding credentials or reading `.env`
- [ ] T003 [P] Document the offline observability validation commands and SQLite in-memory test mode in `specs/012-observabilidade-persistida/quickstart.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish validated entities, repository contracts, sanitization, and logging seams before HTTP integration.

**CRITICAL**: User-story work depends on this phase.

- [X] T004 Define Zod schemas and TypeScript types for `RequestRecord`, `TraceEventRecord`, statuses, metrics, and sanitized payloads in `src/obs/types.ts`, enforcing `requestId` 1–128 characters with no control characters and non-negative metric constraints
- [X] T005 [P] Define repository error classes for duplicate request IDs and missing requests in `src/obs/errors.ts`
- [X] T006 [P] Implement SQLite initialization with idempotent `requests` and `trace_events` tables, unique `(requestId, sequence)` constraint, and indexes for request lookup/order in `src/models/observability-sqlite.ts`
- [X] T007 [P] Define the injected observability repository interface and lifecycle methods (`startRequest`, `appendTraceEvent`, `completeRequest`, `failRequest`, `getRequest`) in `src/obs/trace-persistence.ts`
- [X] T008 [P] Implement metadata-only JSON logging in `src/obs/logger.ts`, allowing only `timestamp`, `requestId`, `event`, `type`, `node`, `sequence`, `status`, `durationMs`, and `errorKind`
- [X] T009 Add a validated sanitization adapter from `TraceEvent` to persisted event payloads in `src/obs/trace-persistence.ts`, rejecting missing `node`, non-serializable values, secrets, prompts, authentication headers, and raw provider errors
- [ ] T010 Add deterministic repository and logger fakes/test fixtures in `test/observability-store.test.ts` and `test/logger.test.ts` for offline tests

**Checkpoint**: SQLite tables, typed repository lifecycle, sanitization, and metadata-only logging are ready.

---

## Phase 3: User Story 1 - Identificar cada requisição de chat (Priority: P1) 🎯 MVP

**Goal**: Correlate every valid `/chat` execution with one validated request ID in the response body and `X-Request-Id`.

**Independent Test**: Send valid requests with and without a body `requestId`, then verify generated/preserved IDs in body and header; invalid IDs return 400 without a partial record.

### Tests for User Story 1

- [X] T011 [P] [US1] Add HTTP tests for generated and caller-provided `requestId` parity between `/chat` response body and `X-Request-Id` in `test/http.test.ts`
- [ ] T012 [P] [US1] Add HTTP tests for empty, overlong, and control-character `requestId` rejection with no observability record in `test/http.test.ts`

### Implementation for User Story 1

- [X] T013 [US1] Extend the `/chat` request schema and response schema with validated optional/input and required/output `requestId` fields in `src/http/server.ts`
- [X] T014 [US1] Generate a unique request ID when absent and set `X-Request-Id` on every `/chat` response path that has a validated request ID in `src/http/server.ts`
- [X] T015 [US1] Pass `requestId` through `ChatInput`, `runChat`, and `ChatResult` without changing existing conversation or strategy behavior in `src/services/chat.ts`
- [X] T016 [US1] Inject the observability repository into `ServerOptions` and configure a deterministic default repository lifecycle in `src/http/server.ts`

**Checkpoint**: `/chat` exposes stable request correlation and rejects invalid IDs before creating partial observability data.

---

## Phase 4: User Story 2 - Persistir métricas e trace de execução (Priority: P1)

**Goal**: Persist each request lifecycle, metrics, ordered trace events, and sanitized failure state.

**Independent Test**: Run a fake strategy against an in-memory repository, then retrieve the stored request and verify metrics, every event, node, sequence, and failure status.

### Tests for User Story 2

- [X] T017 [P] [US2] Add repository tests for start, append, complete, duplicate-ID conflict, and `sequence ASC` retrieval in `test/observability-store.test.ts`
- [X] T018 [P] [US2] Add integration tests for successful chat persistence of `llCalls`, `latencyMs`, `promptTokens`, `modelUsed`, and all trace events in `test/http.test.ts`
- [ ] T019 [P] [US2] Add failure-path tests proving failed executions persist sanitized error state and never return a success-shaped result in `test/http.test.ts`
- [ ] T020 [P] [US2] Add sanitization tests proving trace payloads and persisted errors exclude provider messages, prompts, credentials, and authentication headers in `test/observability-store.test.ts`

### Implementation for User Story 2

- [X] T021 [US2] Implement request start and duplicate-ID handling in `src/models/observability-sqlite.ts`, persisting `status="running"` and `createdAt`
- [X] T022 [US2] Implement ordered trace-event insertion with per-request sequence and validated payload serialization in `src/models/observability-sqlite.ts`
- [X] T023 [US2] Implement completion updates for `succeeded`, timestamps, answer, and metrics in `src/models/observability-sqlite.ts`
- [X] T024 [US2] Implement failure updates for `failed`, timestamps, and generic sanitized `errorKind` in `src/models/observability-sqlite.ts`
- [X] T025 [US2] Persist request lifecycle and normalized strategy trace from `runChat` while retaining the original domain error and response semantics in `src/services/chat.ts`
- [X] T026 [US2] Emit one metadata-only JSON log per persisted lifecycle/event operation with request correlation in `src/obs/logger.ts` and `src/services/chat.ts`

**Checkpoint**: Successful and failed executions have complete, ordered, sanitized persistence independent of network services.

---

## Phase 5: User Story 3 - Consultar execução e logs estruturados (Priority: P1)

**Goal**: Provide a validated lookup endpoint and machine-readable event logs.

**Independent Test**: Persist a fake request with out-of-order insertion attempts, call `GET /requests/:id`, and verify a 200 response with ordered trace or a generic 404 for missing IDs.

### Tests for User Story 3

- [X] T027 [P] [US3] Add HTTP contract tests for `GET /requests/:id` returning metrics and trace sorted by `sequence ASC` in `test/http.test.ts`
- [X] T028 [P] [US3] Add HTTP tests for missing IDs returning validated 404 `{ "error": "Request not found" }` without storage details in `test/http.test.ts`
- [X] T029 [P] [US3] Add logger tests for exactly one valid JSON line per event and forbidden metadata/payload fields in `test/logger.test.ts`
- [ ] T030 [P] [US3] Add a reference test for retrieving up to 1,000 trace events within the documented performance target in `test/observability-store.test.ts`

### Implementation for User Story 3

- [X] T031 [US3] Implement repository lookup returning `RequestRecord` and trace events ordered by `sequence ASC` in `src/models/observability-sqlite.ts`
- [X] T032 [US3] Add response schemas for request lookup, metrics, and persisted trace payloads in `src/http/server.ts`
- [X] T033 [US3] Implement `GET /requests/:id` with validated path ID, generic 404 mapping, and no storage/provider details in `src/http/server.ts`
- [X] T034 [US3] Ensure logger output remains one-line JSON and metadata-only for success, failure, trace, and request-completion events in `src/obs/logger.ts`

**Checkpoint**: Operators can retrieve an execution and ordered trace, while logs remain safe for machine ingestion.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the complete feature and preserve existing behavior.

- [ ] T035 [P] Update observability contracts and quickstart examples to match final schemas and repository behavior in `specs/012-observabilidade-persistida/contracts/` and `specs/012-observabilidade-persistida/quickstart.md`
- [ ] T036 [P] Add regression assertions ensuring existing `/chat` conversation, strategy, timeout, 503, and trace behavior remains compatible in `test/http.test.ts`
- [X] T037 Run `npm run typecheck` and `npm test` with the SQLite tests enabled
- [X] T038 Run `git diff --check` and review all logs/persisted payloads for secrets, prompt leakage, raw provider errors, and unbounded data writes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; dependency installation precedes implementation.
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on the validated repository/configuration seams; delivers the MVP request correlation.
- **User Story 2 (Phase 4)**: Depends on US1's request ID propagation and the repository lifecycle.
- **User Story 3 (Phase 5)**: Depends on US2's stored request/trace shape and can then expose lookup.
- **Polish (Phase 6)**: Depends on all desired stories.

### User Story Dependencies

- **US1 (P1)**: Starts after Foundational; no dependency on later stories.
- **US2 (P1)**: Depends on US1 because persistence keys and lifecycle use the propagated request ID.
- **US3 (P1)**: Depends on US2 because the endpoint reads persisted records and events.

### Parallel Opportunities

- T002, T003, T005, T006, T007, T008, and T010 can proceed in parallel after setup.
- US1 tests T011-T012 can run in parallel; T013-T014 must precede T015-T016.
- US2 tests T017-T020 can run in parallel before implementation; T021-T024 touch the same repository file and should be sequenced.
- US3 tests T027-T030 can run in parallel; T031-T034 can proceed after the repository contract is stable.
- T035-T036 can run in parallel with one another after feature integration.

## Parallel Example: User Story 1

```text
Task T011: requestId response/header tests in test/http.test.ts
Task T012: invalid requestId validation tests in test/http.test.ts

After the tests are prepared:
Task T013: schemas in src/http/server.ts
Task T014: generation and X-Request-Id handling in src/http/server.ts
Task T015: propagation through src/services/chat.ts
```

## Parallel Example: User Story 2

```text
Task T017: repository lifecycle tests in test/observability-store.test.ts
Task T018: success persistence integration tests in test/http.test.ts
Task T019: failure persistence tests in test/http.test.ts
Task T020: sanitization tests in test/observability-store.test.ts
```

## Parallel Example: User Story 3

```text
Task T027: GET endpoint success contract tests in test/http.test.ts
Task T028: GET endpoint 404 tests in test/http.test.ts
Task T029: metadata-only logger tests in test/logger.test.ts
Task T030: 1,000-event performance test in test/observability-store.test.ts
```

## Implementation Strategy

1. Add the SQLite dependency and shared validated repository/logger seams.
2. Deliver US1 as the MVP with request ID generation, validation, and response correlation.
3. Add US2 lifecycle persistence and sanitized trace/metrics storage.
4. Add US3 lookup and structured logs.
5. Run typecheck, tests, diff validation, and secret-leak review before completion.
