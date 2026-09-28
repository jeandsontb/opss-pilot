---

description: "Task list for persistent conversations"
---

# Tasks: Conversas Persistentes

**Input**: Design documents from `specs/004-persistent-conversations/`

## Phase 1: Setup

- [X] T001 Confirm conversation feature paths and existing HTTP strategy contracts in `src/http/server.ts` and `src/agents/types.ts`

## Phase 2: Foundational

- [X] T002 [P] Define `MessageRole`, `ConversationMessage`, and `ConversationStore` contracts in `src/models/conversation-store.ts`
- [X] T003 [P] Add conversation-aware input and history types to `src/agents/types.ts`
- [X] T004 Define `ConversationNotFoundError` and validation rules in `src/models/conversation-store.ts`

## Phase 3: User Story 1 - Continuar uma conversa de plantão (Priority: P1)

**Goal**: Criar ou reutilizar uma conversa, compor o histórico e persistir as mensagens pelo endpoint.

**Independent Test**: Duas requisições fake, a segunda usando o `conversationId` da primeira, observam o histórico anterior e retornam o mesmo identificador.

- [X] T005 [P] [US1] Write integration tests for new and resumed conversations in `test/http.test.ts`
- [X] T006 [P] [US1] Write deterministic fake strategy assertions for composed history in `test/http.test.ts`
- [X] T007 [US1] Implement `InMemoryConversationStore` with `create`, `append`, and `lastMessages` in `src/models/conversation-store.ts`
- [X] T008 [US1] Implement `runChat` service to create/reuse conversations, read 12 messages, append user input, run strategy, append assistant answer, and add `historyMessages` in `src/services/chat.ts`
- [X] T009 [US1] Integrate `runChat` and injected conversation store into `POST /chat` in `src/http/server.ts`

## Phase 4: User Story 2 - Persistir e recuperar mensagens (Priority: P2)

**Goal**: Garantir semântica do store, isolamento por conversa e limite de 12 mensagens.

**Independent Test**: O store em memória cria duas conversas, mantém mensagens isoladas e retorna as 12 últimas em ordem cronológica.

- [X] T010 [P] [US2] Write store tests for create, append, missing conversations, ordering, isolation, and 12-message limit in `test/conversation-store.test.ts`
- [X] T011 [US2] Add `messages` Sequelize model/schema adapter compatible with the existing persistence layer in `src/models/sequelize.ts`
- [X] T012 [US2] Ensure store failures become explicit HTTP errors without false 200 responses in `src/http/server.ts`

## Phase 5: User Story 3 - Medir o contexto usado (Priority: P3)

**Goal**: Expor a quantidade efetiva de mensagens históricas usadas sem alterar métricas existentes.

**Independent Test**: Fake executions with 0, 5, and more than 12 prior messages return `historyMessages` of 0, 5, and 12.

- [X] T013 [P] [US3] Add integration assertions for `historyMessages` and response schema in `test/http.test.ts`
- [X] T014 [US3] Validate `conversationId`, `trace`, and metrics including `llCalls`, `latencyMs`, and `historyMessages` with Zod in `src/http/server.ts`

## Phase 6: Polish

- [X] T015 [P] Update persistent conversation contract and quickstart examples in `specs/004-persistent-conversations/contracts/chat.md` and `specs/004-persistent-conversations/quickstart.md`
- [X] T016 Run `npm run typecheck`, `npm test`, and quickstart validation and resolve regressions

## Dependencies & Execution Order

- Setup T001 precedes foundational tasks.
- Foundational T002-T004 precede all user stories.
- US1 is the MVP and must complete before endpoint-dependent US3.
- US2 store tests and implementation can proceed in parallel with US1 tests after foundational contracts, but endpoint integration depends on T007/T008.
- Polish follows all implementation tasks.

## Parallel Opportunities

- T002 and T003 can run in parallel.
- T005 and T006 can run in parallel before US1 implementation.
- T010 can run in parallel with T005/T006.
- T013 can run in parallel with T010/T011.
- T015 can run in parallel with code validation before T016.

## Implementation Strategy

1. Complete contracts and deterministic in-memory store.
2. Deliver US1 as the MVP through `runChat` and `/chat`.
3. Add store isolation and persistence adapter coverage.
4. Verify metrics and response validation.
5. Run the complete typecheck, tests, and quickstart validation.
