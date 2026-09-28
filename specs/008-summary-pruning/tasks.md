---

description: "Task list for conversation history summarization and pruning"
---

# Tasks: Sumarização de Histórico (Pruning)

**Input**: Design documents from `specs/008-summary-pruning/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: Required by FR-013 and the feature specification. Tests must use fake summarizers/stores and must not require network access.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the existing conversation and trace surfaces for summary pruning.

- [ ] T001 Review the current conversation history limit, trace union, chat service, and Sequelize model patterns in `src/services/chat.ts`, `src/agents/types.ts`, `src/models/conversation-store.ts`, and `src/models/`
- [ ] T002 [P] Create the summary model/store file targets `src/models/conversation-summary.ts` and `src/models/conversation-summary-store.ts` following the existing model and in-memory store conventions
- [ ] T003 [P] Create the summarizer interface/implementation target `src/agents/summarizer.ts` and the focused test targets `test/conversation-summary.test.ts` and `test/summarizer.test.ts`
- [ ] T004 [P] Record the new `conversation_summaries` table and context ordering in `specs/008-summary-pruning/data-model.md` and `specs/008-summary-pruning/contracts/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish validated types, persistence contracts, and trace support required by all user stories.

**⚠️ CRITICAL**: User story work depends on these shared contracts.

- [ ] T005 Extend `TraceEvent` in `src/agents/types.ts` with a typed `summarize` event containing non-negative `messageCount` and cumulative `summarizedMessageCount`
- [ ] T006 Define Zod-validated `ConversationSummary`, `SummaryInput`, and `Summarizer` contracts in `src/agents/summarizer.ts` with `targetTokens` fixed at 150 and non-empty output validation
- [ ] T007 Implement the `conversation_summaries` Sequelize model in `src/models/conversation-summary.ts` with required `id`, `conversationId`, `summary`, `summarizedMessageCount`, `createdAt`, and `updatedAt` fields, a unique conversation constraint, and non-negative counter validation
- [ ] T008 [P] Implement an isolated in-memory summary store in `src/models/conversation-summary-store.ts` with `get(conversationId)` and atomic `upsert` behavior
- [ ] T009 [P] Add deterministic tests for summary-store creation, retrieval, upsert, conversation isolation, non-decreasing counters, and rejection of empty summaries in `test/conversation-summary.test.ts`
- [ ] T010 Run `npm run typecheck` and `npm test` after the foundational type/model/store changes and resolve compatibility regressions before story work

**Checkpoint**: Trace, summarizer, persistence, and validation contracts are available; user stories can now be implemented.

---

## Phase 3: User Story 1 - Preservar contexto antigo em resumo (Priority: P1) 🎯 MVP

**Goal**: Compact old conversation messages in groups of eight, merge each group into the prior summary, and preserve the eight-message recent window.

**Independent Test**: A fake summarizer and in-memory summary store process a conversation with more than eight messages; a valid summary is persisted and the next composed context contains the summary plus the eight recent messages.

### Tests for User Story 1

- [ ] T011 [P] [US1] Add pruning-service tests for fewer than eight messages, exactly eight messages outside the window, and preservation of the recent eight in `test/conversation-summary.test.ts`
- [ ] T012 [P] [US1] Add merge tests proving the previous summary is passed to the fake summarizer and incorporated into the persisted result in `test/conversation-summary.test.ts`
- [ ] T013 [P] [US1] Add chat integration tests proving the persisted summary appears before recent history and the current message in `test/chat.test.ts`

### Implementation for User Story 1

- [ ] T014 [US1] Implement `ConversationSummaryStore` domain types and validated `get`/`upsert` behavior in `src/models/conversation-summary-store.ts`, keeping one current record per `conversationId`
- [ ] T015 [US1] Implement pruning decision logic in `src/services/conversation-summary.ts` using an eight-message recent window and complete blocks of eight messages beyond the persisted `summarizedMessageCount`
- [ ] T016 [US1] Implement summary merging in `src/services/conversation-summary.ts` by passing `previousSummary`, one message block, and `targetTokens: 150` to the injected `Summarizer`
- [ ] T017 [US1] Update `composePrompt` and `runChat` in `src/services/chat.ts` to load the conversation summary, keep exactly the latest eight stored messages in chronological order, and place the summary before recent history and the current message
- [ ] T018 [US1] Wire the summary store and pruning service into the default HTTP server composition in `src/http/server.ts` without changing existing request fields or status behavior

**Checkpoint**: A conversation can exceed the recent window while retaining durable historical context through a persisted merged summary.

---

## Phase 4: User Story 2 - Expor sumarização no trace e no armazenamento (Priority: P1)

**Goal**: Make successful pruning observable through a typed `summarize` trace event and make failures explicit without partial persistence.

**Independent Test**: A fake summarizer/store test observes the event, stored counter, reused summary, and unchanged store after a thrown or empty summarizer result.

### Tests for User Story 2

- [ ] T019 [P] [US2] Add trace-format tests for the `summarize` event and HTTP response validation in `test/trace.test.ts` and `test/http.test.ts`
- [ ] T020 [P] [US2] Add failure tests for thrown summarizer errors and empty outputs, asserting no partial summary or counter update in `test/conversation-summary.test.ts`
- [ ] T021 [P] [US2] Add cross-conversation isolation tests proving summaries and `summarize` events do not leak between conversation IDs in `test/chat.test.ts`

### Implementation for User Story 2

- [ ] T022 [US2] Return a `summarize` trace event from `src/services/conversation-summary.ts` only after a validated summary is persisted, including the processed block size and cumulative counter
- [ ] T023 [US2] Propagate pruning trace events through `runChat` in `src/services/chat.ts` while preserving strategy trace ordering and the final `answer` event
- [ ] T024 [US2] Extend the trace Zod schema in `src/http/server.ts` to validate `summarize.messageCount` and `summarize.summarizedMessageCount` as non-negative integers
- [ ] T025 [US2] Translate summarizer/store failures at the service/controller boundary in `src/services/conversation-summary.ts` and `src/http/server.ts` without swallowing the original error or persisting partial state

**Checkpoint**: Successful pruning is auditable in the response trace, and failed pruning leaves durable state unchanged.

---

## Phase 5: User Story 3 - Controlar custo de sumarização (Priority: P2)

**Goal**: Ensure summarization runs only for complete groups of eight new messages and targets approximately 150 tokens.

**Independent Test**: A counting fake summarizer processes multiple turns and demonstrates zero calls below the threshold, one call per complete group, merged output, and bounded deterministic fake output.

### Tests for User Story 3

- [ ] T026 [P] [US3] Add call-count tests for seven or fewer newly pruned messages, one group of eight, and sixteen pruned messages in `test/conversation-summary.test.ts`
- [ ] T027 [P] [US3] Add target-size and durable-content tests for the fake summarizer contract in `test/summarizer.test.ts`, covering decisions, facts, pending items, and approximately 150 estimated tokens
- [ ] T028 [P] [US3] Add repeated-chat tests proving ordinary requests do not invoke summarization and that the summary counter advances only in blocks of eight in `test/chat.test.ts`

### Implementation for User Story 3

- [ ] T029 [US3] Implement the real summarizer adapter in `src/agents/summarizer.ts` with structured model output, explicit prompt instructions for decisions/facts/pendências, and a target of approximately 150 tokens
- [ ] T030 [US3] Implement complete-block accounting in `src/services/conversation-summary.ts` so each eligible group of eight is processed without triggering a summarization call merely because a request occurred
- [ ] T031 [US3] Preserve existing chat and token metrics in `src/services/chat.ts` while adding any summarizer LLM calls and latency to the response metrics exactly once
- [ ] T032 [US3] Configure the default summarizer and summary store dependencies in `src/http/server.ts`, retaining fake injection paths for deterministic tests

**Checkpoint**: Long conversations receive bounded, merged summaries only when complete pruning groups are available.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate persistence compatibility, documentation, and complete regression behavior.

- [ ] T033 [P] Update the summary contracts and data model documentation in `specs/008-summary-pruning/contracts/` and `specs/008-summary-pruning/data-model.md` if implementation naming differs from the planned interfaces
- [ ] T034 [P] Add or update Sequelize type declarations/migration registration for `conversation_summaries` in `src/types/` and existing model bootstrap files
- [ ] T035 Run `npm run typecheck` and `npm test` with all summary, chat, HTTP, trace, memory, reflection, and token tests
- [ ] T036 Run `git diff --check` and verify the quickstart scenarios from `specs/008-summary-pruning/quickstart.md`
- [ ] T037 Confirm existing answer, recent-history ordering, memory injection, reflection behavior, token breakdown, HTTP statuses, and no-network fake tests remain unchanged in `src/services/chat.ts` and `test/`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No implementation dependency; can begin immediately.
- **Foundational (Phase 2)**: Depends on setup review and blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on T005-T010.
- **User Story 2 (Phase 4)**: Depends on US1's pruning result and shared trace contracts.
- **User Story 3 (Phase 5)**: Depends on the service/store behavior from US1 and failure/trace behavior from US2.
- **Polish (Phase 6)**: Depends on all selected stories being complete.

### User Story Dependencies

- **US1 (P1)**: Independent MVP after Phase 2.
- **US2 (P1)**: Depends on US1's pruning service but is independently testable with fake dependencies.
- **US3 (P2)**: Builds on US1 and US2 to enforce call-count and target-size guarantees.

### Within Each User Story

- Write deterministic tests before implementation.
- Implement model/store contracts before service logic.
- Implement service decisions before chat/controller integration.
- Validate each checkpoint before advancing.

### Parallel Opportunities

- T002, T003, and T004 can run in parallel during setup.
- T008 and T009 can run in parallel after the shared types are agreed.
- T011-T013 can run in parallel because they target separate test concerns.
- T019-T021 can run in parallel before trace/failure integration.
- T026-T028 can run in parallel before cost-control implementation.
- T033-T034 and T035-T036 can run in parallel during polish.

## Parallel Example: User Story 1

```bash
Task: "Add pruning window tests in test/conversation-summary.test.ts"
Task: "Add summary merge tests in test/conversation-summary.test.ts"
Task: "Add context ordering tests in test/chat.test.ts"
```

## Parallel Example: User Story 2

```bash
Task: "Add summarize trace schema tests in test/trace.test.ts and test/http.test.ts"
Task: "Add summarizer failure tests in test/conversation-summary.test.ts"
Task: "Add conversation isolation tests in test/chat.test.ts"
```

## Parallel Example: User Story 3

```bash
Task: "Add call-count threshold tests in test/conversation-summary.test.ts"
Task: "Add target-size durable-content tests in test/summarizer.test.ts"
Task: "Add repeated-chat no-extra-call tests in test/chat.test.ts"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2.
2. Implement the in-memory store, fake summarizer contract, pruning service, and context integration in Phase 3.
3. Run the US1 tests plus the existing suite.
4. Stop at a usable MVP that preserves historical context without requiring the real model summarizer.

### Incremental Delivery

1. Add typed trace events and failure-safe persistence with US2.
2. Add call-count limits, approximate 150-token output, and production summarizer wiring with US3.
3. Complete persistence registration, regression validation, and quickstart checks.

### Constraints

- Never summarize on every request when fewer than eight new messages leave the window.
- Never persist an empty or partially generated summary.
- Always pass the previous summary to the merge operation.
- Always keep the eight most recent messages available in context.
- Keep fake tests offline and preserve all existing chat metrics and behavior.
