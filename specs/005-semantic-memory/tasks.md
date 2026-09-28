---

description: "Task list for semantic memory"
---

# Tasks: Memória Semântica

**Input**: Design documents from `specs/005-semantic-memory/`

## Phase 1: Setup

- [X] T001 Confirm semantic memory paths, chat service integration points, and current dependency versions in `package.json`, `src/services/chat.ts`, and `src/http/server.ts`
- [X] T002 Add `@huggingface/transformers` to `package.json` and update `package-lock.json`

## Phase 2: Foundational

- [X] T003 [P] Define `EmbeddingProvider`, `Memory`, `MemoryRecall`, and validation schemas in `src/memory/memory-store.ts`
- [X] T004 [P] Define lazy singleton embedding API and model configuration in `src/memory/embeddings.ts`
- [X] T005 Add the `memories` Sequelize model with `id`, `user_id`, `fact`, `embedding` BLOB, and `created_at` in `src/models/sequelize.ts`
- [X] T006 Extend chat input and result composition types for optional `userId` and memory recall in `src/services/chat.ts`

## Phase 3: User Story 1 - Registrar fatos do usuário (Priority: P1)

**Goal**: Registrar fatos por usuário, normalizar embeddings and deduplicate semantic duplicates.

**Independent Test**: A fake provider stores a fact, rejects empty input, and does not create a second memory when similarity is greater than `0.92`.

- [X] T007 [P] [US1] Write deterministic `remember` tests for valid facts, empty inputs, normalized embeddings, per-user isolation, and deduplication `> 0.92` in `test/memory-store.test.ts`
- [X] T008 [US1] Implement `InMemoryMemoryStore.remember` with per-user isolation, embedding validation, normalization, and deduplication in `src/memory/memory-store.ts`
- [X] T009 [US1] Add deterministic BLOB encode/decode helpers for normalized embeddings in `src/memory/memory-store.ts`

## Phase 4: User Story 2 - Recuperar contexto semanticamente relacionado (Priority: P1)

**Goal**: Recall top-3 fatos por produto escalar com limiar mínimo `0.3`, inclusive quando não houver palavras compartilhadas.

**Independent Test**: A fake embedding provider maps semantically equivalent but lexically disjoint phrases to related vectors and recall returns the fact.

- [X] T010 [P] [US2] Write recall tests for top-3 ordering, minimum similarity `>= 0.3`, user isolation, empty result, and no-common-word retrieval in `test/memory-store.test.ts`
- [X] T011 [US2] Implement normalized-vector dot product, threshold filtering, descending ordering, and top-3 limiting in `src/memory/memory-store.ts`
- [X] T012 [US2] Implement lazy singleton `all-MiniLM-L6-v2` pipeline with mean pooling and normalization in `src/memory/embeddings.ts`

## Phase 5: User Story 3 - Usar memória no chat (Priority: P2)

**Goal**: Consultar memórias quando `userId` existe e injetar o recall no prompt sem alterar o contrato público.

**Independent Test**: An HTTP fake strategy receives a prompt containing the recalled fact for a request with `userId`; requests without `userId` do not call memory.

- [X] T013 [P] [US3] Write integration tests for `userId`, memory recall prompt injection, no-user memory bypass, response contract, and memory failure propagation in `test/http.test.ts`
- [X] T014 [US3] Extend `runChat` to optionally recall user memories and compose them before conversation history and the current message in `src/services/chat.ts`
- [X] T015 [US3] Inject `MemoryStore` into `createServer`, validate optional `userId`, and pass it to `runChat` in `src/http/server.ts`
- [X] T016 [US3] Preserve `conversationId`, `answer`, `trace`, `llCalls`, `latencyMs`, and `historyMessages` while integrating memory context in `src/http/server.ts`

## Phase 6: User Story 4 - Esquecer um fato (Priority: P3)

**Goal**: Remover somente a memória pertencente ao `userId` informado.

**Independent Test**: Remember a fact, forget it, and verify it is absent from recall; forgetting another user's ID does not remove it.

- [X] T017 [P] [US4] Write deterministic forget tests for successful removal, unknown memory, and cross-user protection in `test/memory-store.test.ts`
- [X] T018 [US4] Implement `forget(userId, memoryId)` with explicit not-found result in `src/memory/memory-store.ts`

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T019 [P] Update semantic memory contract and offline validation steps in `specs/005-semantic-memory/contracts/chat.md` and `specs/005-semantic-memory/quickstart.md`
- [X] T020 Add explicit model-load error propagation and schema guards for invalid embedding dimensions in `src/memory/embeddings.ts` and `src/memory/memory-store.ts`
- [X] T021 Run `npm run typecheck`, `npm test`, and the semantic memory quickstart; resolve regressions without introducing network-dependent tests

## Dependencies & Execution Order

- Setup T001-T002 precedes foundational work.
- Foundational T003-T006 blocks all user stories.
- US1 and US2 share the memory contracts but can develop in parallel after T003-T004; US2 depends on the memory representation from US1.
- US3 depends on the store and recall behavior from US1/US2.
- US4 depends on the memory entity and store created in US1.
- Polish follows all story phases.

## Parallel Opportunities

- T003 and T004 can run in parallel.
- T007 can run in parallel with T005-T006 after contracts are defined.
- T010 can run in parallel with T012 after the provider contract exists.
- T013 can run in parallel with T017.
- T019 and T020 can run in parallel before T021.

## Implementation Strategy

1. Complete dependency setup and provider/store contracts.
2. Deliver the MVP with US1 and US2: remember plus semantic recall.
3. Integrate recall into `/chat` for US3.
4. Add forget and ownership protection for US4.
5. Run all offline tests and type validation.
