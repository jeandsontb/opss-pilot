---

description: "Task list for the learning reflector"
---

# Tasks: Refletor de Aprendizado

**Input**: Design documents from `specs/006-refletor-aprendizado/`

## Phase 1: Setup

- [X] T001 Confirm existing `MemoryStore`, model factory, chat service, and tool registration points in `src/memory/memory-store.ts`, `src/agents/model.ts`, `src/services/chat.ts`, and `src/agents/tools.ts`
- [X] T002 Define structured reflection boundaries, logging policy, and dependency injection seams in `src/agents/learning-reflector.ts` and `src/services/chat.ts`

## Phase 2: Foundational

- [X] T003 [P] Add Zod schemas and typed contracts for `LearningReflection`, `LearningContext`, and `ForgetPreferenceRequest` in `src/agents/learning-reflector.ts`
- [X] T004 [P] Add a structured-output model factory seam using the existing OpenRouter model configuration in `src/agents/model.ts`
- [X] T005 [P] Add explicit non-sensitive error logging helper for asynchronous reflection failures in `src/agents/learning-reflector.ts`
- [X] T006 [P] Extend `MemoryStore` contracts with the ownership-safe result semantics required by `forget_preference` in `src/memory/memory-store.ts`

## Phase 3: User Story 1 - Aprender fatos duráveis após uma resposta (Priority: P1)

**Goal**: Destilar fatos duráveis da última mensagem original e persistir apenas fatos elegíveis para o usuário.

**Independent Test**: Um provider fake retorna aprendizado para uma preferência durável, `hasLearning=false` para um pedido pontual e uma classificação de segredo; somente o fato durável chega ao `remember`.

- [X] T007 [P] [US1] Write deterministic reflector tests for structured output validation, durable preference extraction, empty facts, point-in-time requests, secrets, ambiguous facts, missing `userId`, and last-user-message-only behavior in `test/learning-reflector.test.ts`
- [X] T008 [US1] Implement conservative eligibility checks that reject operational requests, credentials, tokens, passwords, keys, secrets, and ambiguous content in `src/agents/learning-reflector.ts`
- [X] T009 [US1] Implement `createLearningReflector` with `withStructuredOutput({ hasLearning, fact })`, last-message input, and `MemoryStore.remember(userId, fact)` integration in `src/agents/learning-reflector.ts`
- [X] T010 [US1] Ensure reflection receives only the original final user message and does not learn from history, recalled memories, or assistant content in `src/services/chat.ts`

## Phase 4: User Story 2 - Executar o aprendizado sem atrasar o chat (Priority: P1)

**Goal**: Disparar reflexão e persistência sem bloquear ou alterar a resposta principal.

**Independent Test**: Um reflector artificialmente lento é iniciado após uma resposta e o request termina antes dele; erros do provider ou store são capturados e registrados sem rejeitar a resposta.

- [X] T011 [P] [US2] Add integration tests for fire-and-forget response timing, successful background persistence, provider failure, store failure, and unchanged chat metrics in `test/http.test.ts`
- [X] T012 [US2] Add an explicit `void` background task boundary with non-sensitive error handling after successful strategy completion in `src/services/chat.ts`
- [X] T013 [US2] Inject an optional learning reflector into `runChat` and `createServer`, preserving `answer`, `trace`, `conversationId`, `llCalls`, `latencyMs`, and `historyMessages` in `src/services/chat.ts` and `src/http/server.ts`
- [X] T014 [US2] Ensure reflection is not scheduled after validation errors, strategy errors, timeouts, or failed assistant-message persistence in `src/services/chat.ts`

## Phase 5: User Story 3 - Remover uma preferência aprendida (Priority: P2)

**Goal**: Expor `forget_preference` como tool validada, removendo somente memórias pertencentes ao usuário informado.

**Independent Test**: A tool remove uma memória do próprio usuário, retorna `removed:false` para memória inexistente ou de outro usuário e rejeita argumentos vazios.

- [X] T015 [P] [US3] Write deterministic tool tests for valid removal, missing memory, cross-user ownership protection, invalid `userId`, and invalid `memoryId` in `test/tools.test.ts`
- [X] T016 [US3] Implement `forget_preference` with Zod arguments `{ userId: string, memoryId: string }` and `{ removed: boolean }` result in `src/agents/tools.ts`
- [X] T017 [US3] Register `forget_preference` in the default and injected tool collections without exposing cross-user existence information in `src/agents/tools.ts`
- [X] T018 [US3] Add domain error/result handling for memory removal failures and map them to explicit tool observations in `src/agents/tools.ts`

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T019 [P] Update the reflection and tool contracts with final error, privacy, and asynchronous execution behavior in `specs/006-refletor-aprendizado/contracts/reflection.md` and `specs/006-refletor-aprendizado/contracts/forget-preference.md`
- [X] T020 [P] Update the offline quickstart with timing, failure-isolation, secret-rejection, and forget-preference scenarios in `specs/006-refletor-aprendizado/quickstart.md`
- [X] T021 Add structured observability that records reflection outcome and failure class without logging message, fact, token, or credential content in `src/agents/learning-reflector.ts`
- [X] T022 Run `npm run typecheck`, `npm test`, and the feature quickstart; resolve regressions without adding network-dependent tests

## Dependencies & Execution Order

- Setup T001-T002 precedes foundational T003-T006.
- Foundational contracts and injection seams T003-T006 block all user stories.
- US1 must establish the reflector and eligibility behavior before US2 wires it into the chat lifecycle.
- US3 can be implemented in parallel with US1 after T006 because it only depends on the existing memory ownership contract.
- Polish tasks follow the story phases; T022 is the final validation gate.

## Parallel Opportunities

- T003 and T004 can run in parallel.
- T007 can run in parallel with T005-T006 after the contracts are defined.
- T011 can run in parallel with T015 after the tool seam is available.
- T019 and T020 can run in parallel.

## Implementation Strategy

1. Complete contracts and injection seams.
2. Deliver MVP with US1: safe durable-learning extraction and persistence.
3. Add US2 so learning is fully asynchronous and isolated from chat responses.
4. Add US3 for user-controlled preference removal.
5. Run typecheck, offline tests, and the quickstart validation.
