---

description: "Task list for token and context instrumentation"
---

# Tasks: Instrumentação de Tokens e Contexto

**Input**: Design documents from `specs/007-instrumenta-tokens-contexto/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: Required by FR-010 and the feature specification. All tests must remain deterministic and offline.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the existing TypeScript service and diagnostic script surface without changing runtime behavior.

- [X] T001 Confirm the existing TypeScript test and typecheck commands and preserve their current configuration in `package.json` and `tsconfig.json`
- [X] T002 [P] Create the `scripts/` directory and establish the POSIX executable target `scripts/conversa-longa.sh`
- [X] T003 [P] Review the existing chat, strategy, and HTTP metric contracts in `src/agents/types.ts`, `src/services/chat.ts`, and `src/http/server.ts` before adding fields

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define shared token types and normalization rules used by every user story.

**⚠️ CRITICAL**: User story implementation depends on these shared contracts.

- [X] T004 Implement deterministic `estimateTokens(text)` and validated prompt-usage extraction helpers in `src/context/tokens.ts`, using `chars / 4`, non-negative integer outputs, and `null` for missing or invalid usage
- [X] T005 [P] Extend the shared metric/result types in `src/agents/types.ts` with `promptTokens: number | null`, `ContextBreakdown`, and any normalized usage shape required to preserve `llCalls`, `latencyMs`, and `historyMessages`
- [X] T006 [P] Add unit tests for `estimateTokens` and usage extraction, covering empty text, Unicode text, all supported LangChain metadata shapes, invalid values, zero, and missing metadata in `test/tokens.test.ts`
- [X] T007 Run `npm run typecheck` and `npm test` after the shared type/helper changes to establish a green baseline before story work

**Checkpoint**: Shared token contracts and deterministic helpers are available; user stories can now be implemented independently.

---

## Phase 3: User Story 1 - Medir tokens reais no chat (Priority: P1) 🎯 MVP

**Goal**: Return the real accumulated prompt-token usage from model calls in `/chat`, or explicit `null` when no trustworthy usage exists.

**Independent Test**: A fake strategy/model exposing usage metadata produces the expected `metrics.promptTokens` over HTTP without network access; a strategy without metadata returns `null`.

### Tests for User Story 1

- [X] T008 [P] [US1] Add fake-strategy HTTP tests for valid usage, missing usage, zero usage, and response-schema compatibility in `test/http.test.ts`
- [X] T009 [P] [US1] Add strategy aggregation tests for multiple model calls and fallback paths, asserting valid prompt usage is summed once in `test/tokens.test.ts`

### Implementation for User Story 1

- [X] T010 [US1] Add prompt-token accumulation to ReAct model-call handling in `src/agents/react.ts`, extracting usage from returned LangChain messages without double-counting calls
- [X] T011 [US1] Add prompt-token accumulation to planner, executor, and replanner calls in `src/agents/plan-and-execute.ts`, preserving the maximum-iteration behavior and existing `llCalls`
- [X] T012 [US1] Propagate normalized `promptTokens` through strategy results and reflection/fallback paths in `src/agents/types.ts`, `src/agents/react.ts`, and `src/agents/plan-and-execute.ts`
- [X] T013 [US1] Extend the chat service metric composition in `src/services/chat.ts` so real usage takes precedence and unavailable usage remains `null`
- [X] T014 [US1] Extend the `/chat` response schema and serialization in `src/http/server.ts` to validate and return `metrics.promptTokens` while preserving existing fields and status codes

**Checkpoint**: `/chat` reports trustworthy accumulated prompt usage and remains compatible when providers omit usage metadata.

---

## Phase 4: User Story 2 - Decompor o contexto por fonte (Priority: P1)

**Goal**: Expose deterministic estimated token counts for the current message, serialized history, and serialized memories without changing the prompt itself.

**Independent Test**: A chat request with known message, history, and memory text returns three independent non-negative `chars / 4` estimates, including zero for an empty source.

### Tests for User Story 2

- [X] T015 [P] [US2] Add pure breakdown tests for current message, history serialization, memories serialization, empty sources, and Unicode content in `test/tokens.test.ts`
- [X] T016 [P] [US2] Add chat integration assertions for `metrics.contextBreakdown` and preservation of `answer`, trace, `llCalls`, `latencyMs`, and `historyMessages` in `test/chat.test.ts`

### Implementation for User Story 2

- [X] T017 [US2] Add a typed context-breakdown helper in `src/context/tokens.ts` that estimates `currentMessage`, `history`, and `memories` independently using the exact source serialization used by `composePrompt`
- [X] T018 [US2] Compute `contextBreakdown` in `src/services/chat.ts` from the current request, the limited conversation history, and recalled memory facts before invoking the strategy
- [X] T019 [US2] Add `contextBreakdown` to the chat metrics type and validate its three non-negative integer fields in `src/http/server.ts`
- [X] T020 [US2] Ensure prompt composition and memory/history behavior remain unchanged while attaching the diagnostic breakdown in `src/services/chat.ts`

**Checkpoint**: Every successful chat response includes a stable source-by-source context estimate independent of real provider usage.

---

## Phase 5: User Story 3 - Acompanhar crescimento em conversas longas (Priority: P2)

**Goal**: Provide a repeatable multi-turn diagnostic that prints one `promptTokens` value, including `null`, for each completed turn.

**Independent Test**: The script runs multiple turns against a deterministic local/fake target and emits `turn=N promptTokens=<number|null>` for every completed turn without requiring OpenRouter.

### Tests for User Story 3

- [X] T021 [P] [US3] Add an offline script test with a fake runner/server response covering numeric usage and explicit `null` in `test/long-conversation.test.ts`
- [X] T022 [P] [US3] Add a failure-continuation test in `test/long-conversation.test.ts` when the diagnostic scenario supports continuing after an individual failed turn

### Implementation for User Story 3

- [X] T023 [US3] Implement sequential request/response handling and stable `turn=N promptTokens=<value>` output in `scripts/conversa-longa.sh`, preserving `null` instead of converting it to zero
- [X] T024 [US3] Add configurable target, turn count, and testable command/runner injection to `scripts/conversa-longa.sh` without requiring secrets or a live model for automated tests
- [X] T025 [US3] Add the long-conversation diagnostic command to `package.json` if needed and document manual execution and expected output in `specs/007-instrumenta-tokens-contexto/quickstart.md`

**Checkpoint**: Developers can observe prompt-token availability and growth turn by turn with one local command.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the complete feature, compatibility, and documentation.

- [X] T026 [P] Update the token metrics and long-conversation contracts in `specs/007-instrumenta-tokens-contexto/contracts/chat-metrics.md` and `specs/007-instrumenta-tokens-contexto/contracts/long-conversation.md` if implementation details require clarification
- [X] T027 Run the complete offline suite with `npm run typecheck` and `npm test`, including token, chat, HTTP, and long-conversation tests
- [X] T028 Run `git diff --check` and shell syntax/execution validation for `scripts/conversa-longa.sh`
- [X] T029 Verify the quickstart scenarios and confirm no regressions to `answer`, trace, `llCalls`, `latencyMs`, `historyMessages`, HTTP statuses, or memory/reflection behavior

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No implementation dependency; can start immediately.
- **Foundational (Phase 2)**: Depends on setup review and blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on T004-T007.
- **User Story 2 (Phase 4)**: Depends on T004-T007 and shares metric types with US1; its tests can be prepared in parallel with US1 implementation.
- **User Story 3 (Phase 5)**: Depends on the final `/chat` metric contract from US1 and the `promptTokens` shape from the foundation; it can begin after those contracts are stable.
- **Polish (Phase 6)**: Depends on all selected user stories being implemented.

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2; no dependency on another story.
- **US2 (P1)**: Can start after Phase 2; integrates with the same chat metrics but is independently testable with pure helpers.
- **US3 (P2)**: Depends on the `/chat` response contract delivered by US1 and the context/metric types from Phase 2.

### Within Each User Story

- Write deterministic tests before implementation where practical.
- Implement shared helpers/types before strategy or service integration.
- Preserve existing behavior and validate each checkpoint independently.

### Parallel Opportunities

- T002 and T003 can run in parallel during setup.
- T005 and T006 can run in parallel after the design review.
- T008 and T009 can run in parallel before US1 implementation.
- T015 and T016 can run in parallel before US2 implementation.
- T021 and T022 can run in parallel before US3 implementation.
- US1 and US2 can be developed in parallel after Phase 2 if their shared type changes are coordinated.
- T026, T027, and T028 can run in parallel once implementation is complete; T029 follows their results.

## Parallel Example: User Story 1

```bash
# Prepare independent tests concurrently:
Task: "Add fake-strategy HTTP tests in test/http.test.ts"
Task: "Add multi-call usage aggregation tests in test/tokens.test.ts"

# Then implement independent strategy paths concurrently:
Task: "Instrument ReAct usage in src/agents/react.ts"
Task: "Instrument plan-and-execute usage in src/agents/plan-and-execute.ts"
```

## Parallel Example: User Story 2

```bash
# Prepare independent coverage concurrently:
Task: "Add pure context breakdown tests in test/tokens.test.ts"
Task: "Add chat integration breakdown assertions in test/chat.test.ts"
```

## Parallel Example: User Story 3

```bash
# Prepare script behavior coverage concurrently:
Task: "Test numeric and null script output in test/long-conversation.test.ts"
Task: "Test supported failure continuation in test/long-conversation.test.ts"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 for real usage extraction and `/chat` propagation.
3. Run the independent US1 tests and the existing suite.
4. Stop for an MVP that exposes real prompt usage without changing existing chat behavior.

### Incremental Delivery

1. Add US2 source breakdown and validate its deterministic estimates.
2. Add US3 diagnostic script and offline execution tests.
3. Complete Phase 6 regression, shell, typecheck, and documentation validation.

### Constraints

- Never use `estimateTokens` as a fallback value for `metrics.promptTokens`.
- Keep unavailable usage as `null`; zero remains a valid measured value.
- Do not add network calls, secrets, persistence changes, or model-specific tokenizers.
