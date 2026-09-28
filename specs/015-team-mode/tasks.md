# Tasks: Team Mode — Multi-Agent Copilot de Plantão

**Branch**: `015-team-mode` | **Date**: 2026-09-28 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## Phase 1: Setup (Infraestrutura Compartilhada)

**Purpose**: Extensão de tipos compartilhados e criação da estrutura do módulo `src/team/`. Sem essas bases, nenhuma tarefa de user story pode avançar.

- [X] T001 Estender a union `TraceEvent` em `src/agents/types.ts` adicionando o membro `{ type: "handoff"; from: string; to: string; brief: string; node?: string }` à union discriminada existente
- [X] T002 Adicionar branch `handoff` ao `formatTraceEvent` em `src/agents/trace.ts` retornando `[handoff] {from} → {to}: {brief}`
- [X] T003 [P] Criar arquivo `src/team/types.ts` com: `TeamRole` (enum `analyst | planner | executor`), `SupervisorDecision` (interface `{ next: TeamRole | "END"; brief: string }`), `TeamRequest` (interface `{ message: string; conversationId?: string; maxSteps?: number; requestId?: string }`), `TeamResult` (interface estendendo `ReasoningResult` com `conversationId: string` e `requestId: string`)
- [X] T004 [P] Criar arquivo `src/team/tools.ts` com: `createAnalystTools(store)` exportando somente `list_alerts` do `createTools` existente; `createExecutorTools(store)` exportando `list_alerts`, `open_incident` e `resolve_incident`

---

## Phase 2: Foundational (Pré-requisitos Bloqueantes)

**Purpose**: Schema Zod e grafo LangGraph base. Esses componentes bloqueiam todas as user stories.

**⚠️ CRÍTICO**: Nenhuma user story pode ser iniciada antes desta fase estar completa.

- [X] T005 Criar `teamRequestSchema` e `teamResponseSchema` em `src/team/types.ts` usando Zod: `message: z.string().min(1)`, `conversationId: z.string().uuid().optional()`, `maxSteps: z.number().int().min(1).max(8).default(8)`, `requestId: z.string().uuid().optional()`
- [X] T006 Criar `supervisorSchema` em `src/team/supervisor.ts` usando Zod: `z.object({ next: z.enum(["analyst", "planner", "executor", "END"]), brief: z.string().min(1) })`
- [X] T007 Criar `TeamState` via `Annotation.Root` em `src/team/graph.ts` com todos os campos do data-model: `input`, `conversationId`, `history`, `supervisorDecision`, `analysis`, `plan`, `executionResult`, `trace` (reducer aditivo), `cycleCount` (reducer aditivo), `maxSteps`, `llCalls` (reducer aditivo), `promptTokens` (reducer null-safe), `modelUsed` e `store`

**Checkpoint**: Com T001–T007 completos, o módulo tem base de tipos e estado. User Stories podem ser implementadas.

---

## Phase 3: User Story 1 — Triagem Automática de Alerta via Equipe (Priority: P1) 🎯 MVP

**Goal**: Endpoint `POST /team` funcional com fluxo completo supervisor → analista → planejador → executor, retornando `answer`, `conversationId` e `trace` com eventos `handoff`.

**Independent Test**: `curl -X POST http://localhost:3000/team -d '{"message":"Latência alta no serviço de pagamentos"}' | jq '[.trace[] | select(.type=="handoff")] | length'` deve retornar ≥ 2.

### Implementação — User Story 1

- [X] T008 [US1] Implementar nó `supervisorNode` em `src/team/supervisor.ts`: invocar `model.withStructuredOutput(supervisorSchema)` via `invokeWithResilience`, incrementar `cycleCount: 1`, emitir evento `handoff` no `trace`, retornar delta parcial `{ supervisorDecision, cycleCount: 1, trace: [handoffEvent], llCalls: 1, promptTokens, modelUsed }`
- [X] T009 [US1] Implementar nó `analystNode` em `src/team/analyst.ts`: receber `brief` de `state.supervisorDecision`, invocar LLM com `createAnalystTools(state.store)` via `invokeWithResilience`, instrução de sistema proibindo propostas de ação, retornar delta `{ analysis: string, trace: [...eventos], llCalls: 1, promptTokens, modelUsed }`
- [X] T010 [US1] Implementar nó `plannerNode` em `src/team/planner.ts`: receber `state.analysis` e `state.supervisorDecision.brief`, invocar LLM **sem tool bindings** via `invokeWithResilience`, instrução de sistema exigindo plano textual numerado, retornar delta `{ plan: string, trace: [...eventos], llCalls: 1, promptTokens, modelUsed }`
- [X] T011 [US1] Implementar nó `executorNode` em `src/team/executor.ts`: receber `state.plan` e `state.supervisorDecision.brief`, invocar LLM com `createExecutorTools(state.store)` via `invokeWithResilience`, instrução de sistema exigindo leitura do `plan` antes de agir, retornar delta `{ executionResult: string, trace: [...eventos], llCalls: 1, promptTokens, modelUsed }`
- [X] T012 [US1] Montar o grafo em `src/team/graph.ts` usando `StateGraph(TeamState)`: adicionar nós `supervisor`, `analyst`, `planner`, `executor`; adicionar edge `START → supervisor`; adicionar `addConditionalEdges("supervisor", routingFn, { analyst: "analyst", planner: "planner", executor: "executor", END: END })`; adicionar edges de retorno `analyst → supervisor`, `planner → supervisor`, `executor → supervisor`; compilar com `graph.compile()`
- [X] T013 [US1] Implementar `routingFn` em `src/team/graph.ts`: retornar `state.supervisorDecision?.next ?? "END"` com guard contra `cycleCount >= state.maxSteps` que força retorno `"END"` diretamente
- [X] T014 [US1] Implementar função `runTeam(input: TeamRequest, conversations: ConversationStore, store?: OperationalRepository): Promise<TeamResult>` em `src/team/graph.ts`: criar/retomar `conversationId` via `SqliteConversationStore`, carregar histórico com `lastMessages`, invocar `compiledGraph.invoke(initialState)`, persistir resposta final na conversa, retornar `TeamResult` com `answer`, `conversationId`, `requestId`, `trace` e `metrics`
- [X] T015 [US1] Registrar rota `app.post("/team", ...)` em `src/http/server.ts`: validar body com `teamRequestSchema.safeParse`, retornar 400/422 em caso de falha, chamar `runTeam`, tratar `ConversationNotFoundError` (404), `ModelUnavailableError` (503), timeout de 180s (504), resposta de sucesso com `teamResponseSchema.parse(result)`
- [X] T016 [US1] Escrever testes em `tests/team-graph.test.ts`: (a) mock do LLM retornando `SupervisorDecision` fixo `{ next: "analyst", brief: "..." }`; verificar que `trace` contém evento `handoff`; (b) testar encerramento por `maxSteps: 1`; (c) testar `next: "invalid"` → grafo encerra via `"END"`
- [X] T017 [US1] Escrever testes HTTP em `tests/team-endpoint.test.ts`: (a) `message` vazia → 400; (b) `maxSteps: 99` → 422; (c) `conversationId` inexistente → 404; (d) mock do `runTeam` retornando sucesso → 200 com campos obrigatórios

**Checkpoint**: `POST /team` funciona end-to-end. `npm test` verde. `npm run typecheck` 0 erros.

---

## Phase 4: User Story 2 — Restrições de Papel Respeitadas (Priority: P2)

**Goal**: Enforcement verificável das restrições por papel — analista sem propostas, planejador sem tools, executor via blackboard.

**Independent Test**: `npm test` com os testes de isolamento de nó em `tests/team-graph.test.ts` todos passando, cobrindo os 3 cenários de violação de papel.

### Implementação — User Story 2

- [X] T018 [US2] Adicionar guard pós-LLM no `analystNode` (`src/team/analyst.ts`): filtrar da resposta do LLM qualquer trecho que comece com verbos imperativos de ação ("Execute", "Abra", "Resolva", "Feche", "Escale"); retornar somente a análise descritiva; adicionar evento `{ type: "thought", content: "[analyst] proposta removida" }` ao trace quando filtro ativo
- [X] T019 [US2] Verificar no `plannerNode` (`src/team/planner.ts`) que o modelo é instanciado **sem** chamar `.bindTools()`; adicionar assertion no `plannerNode` que lança `Error("planner não pode invocar tools")` se `state.supervisorDecision` contiver campo `tool_calls`
- [X] T020 [US2] Adicionar guard no `executorNode` (`src/team/executor.ts`): verificar `state.plan.trim().length > 0` antes de invocar o LLM; se `state.plan` estiver vazio, retornar `{ executionResult: "Sem plano disponível — execução recusada", trace: [{ type: "thought", content: "[executor] plano ausente, execução bloqueada" }] }` sem chamar o LLM
- [X] T021 [US2] Adicionar testes de isolamento de papel em `tests/team-graph.test.ts`: (a) analista: mock LLM retorna texto com "Execute X" → verificar que `analysis` resultante não contém "Execute"; (b) planejador: verificar que a instância do modelo não tem `boundTools`; (c) executor: estado com `plan: ""` → verificar que LLM não é chamado e `executionResult` contém a mensagem de recusa

**Checkpoint**: Restrições verificáveis por teste automatizado. `npm test` verde.

---

## Phase 5: User Story 3 — Visibilidade do Raciocínio na Interface Web (Priority: P3)

**Goal**: Painel "Ver Raciocínio" na interface web renderiza eventos `handoff` como linha do tempo.

**Independent Test**: Abrir a interface web, enviar mensagem via rota Team, clicar em "Ver Raciocínio" e verificar que cada evento `handoff` aparece com `from`, `to` e `brief` visíveis.

### Implementação — User Story 3

- [X] T022 [P] [US3] Localizar o componente de raciocínio na interface web (buscar por "Ver Raciocínio" ou "trace" nos arquivos `web/**`); identificar onde os eventos do `trace` são renderizados
- [X] T023 [US3] Adicionar branch para `type === "handoff"` no parser/renderer de trace da interface web: exibir ícone de seta, papel `from` → papel `to` em negrito e texto do `brief` em itálico; preservar a ordem de inserção do array (não reordenar)
- [X] T024 [US3] Adicionar seletor de rota "Team" na interface web (se ainda não existir): botão ou dropdown que direciona o POST para `/team` em vez de `/chat`; exibir campo de `maxSteps` (input numérico 1–8, padrão 8) na UI de team
- [X] T025 [US3] Verificar que o painel "Ver Raciocínio" já existente aceita o novo tipo `handoff` sem exibir erros de "tipo desconhecido"; adicionar fallback visual (cinza, prefixo `[handoff]`) caso o componente não reconheça o tipo — sem alterar a renderização dos tipos existentes

**Checkpoint**: Interface renderiza handoffs. Testes existentes de UI (se houver) continuam passando.

---

## Phase 6: Polish & Preocupações Transversais

**Purpose**: Qualidade final, rastreabilidade e validação de todos os critérios de sucesso.

- [X] T026 [P] Executar `npm run typecheck` e corrigir todos os erros de tipo introduzidos pela extensão de `TraceEvent` e pelos novos arquivos `src/team/`
- [X] T027 [P] Executar `npm test` completo e garantir 0 falhas (incluindo testes de regressão dos módulos existentes)
- [X] T028 Executar os 5 cenários do `quickstart.md` manualmente contra o servidor local (`npm run dev`) e registrar resultados como comentários no arquivo `specs/015-team-mode/quickstart.md`
- [X] T029 [P] Atualizar `src/agents/trace.ts`: garantir que `formatTrace` e `formatTraceEvent` exportam o branch `handoff` com formato `[handoff] {from} → {to}: {brief}` (verificar se T002 foi aplicado corretamente no contexto final do módulo)
- [X] T030 Revisar o `createServer` em `src/http/server.ts` e garantir que a rota `/team` usa as mesmas dependências injetáveis (`conversations`, `observability`) que a rota `/chat`, para facilitar testes de integração com mocks

---

## Dependências & Ordem de Execução

### Dependências entre Fases

```
Phase 1 (Setup)        → sem dependências — iniciar imediatamente
Phase 2 (Foundational) → depende de Phase 1 completa — bloqueia todas as US
Phase 3 (US1 - P1)    → depende de Phase 2 — MVP
Phase 4 (US2 - P2)    → depende de Phase 3 (T009, T010, T011 implementados)
Phase 5 (US3 - P3)    → depende de Phase 3 (endpoint /team funcional)
Phase 6 (Polish)       → depende de Phase 3, 4 e 5
```

### Dependências Internas (Phase 3 — US1)

```
T001, T002              → desbloqueiam T003, T004, T005, T006
T003, T004, T005, T006  → desbloqueiam T007
T007                    → desbloqueia T008, T009, T010, T011 (paralelos)
T008, T009, T010, T011  → desbloqueiam T012
T012                    → desbloqueia T013
T013                    → desbloqueia T014
T014                    → desbloqueia T015, T016, T017 (paralelos)
```

### Dependências Internas (Phase 4 — US2)

```
T009 (analystNode)   → desbloqueia T018
T010 (plannerNode)   → desbloqueia T019
T011 (executorNode)  → desbloqueia T020
T018, T019, T020     → desbloqueiam T021
```

---

## Oportunidades de Paralelismo

```bash
# Phase 1 — T003 e T004 em paralelo (arquivos distintos):
Task: "Criar src/team/types.ts com TeamRole, SupervisorDecision, TeamRequest, TeamResult"
Task: "Criar src/team/tools.ts com createAnalystTools e createExecutorTools"

# Phase 3 — T008, T009, T010, T011 em paralelo (arquivos distintos):
Task: "Implementar supervisorNode em src/team/supervisor.ts"
Task: "Implementar analystNode em src/team/analyst.ts"
Task: "Implementar plannerNode em src/team/planner.ts"
Task: "Implementar executorNode em src/team/executor.ts"

# Phase 3 — T016 e T017 em paralelo (arquivos distintos):
Task: "Testes do grafo em tests/team-graph.test.ts"
Task: "Testes HTTP em tests/team-endpoint.test.ts"
```

---

## Estratégia de Implementação

### MVP (somente User Story 1 — Phase 1 + 2 + 3)

1. Completar Phase 1: T001 → T004
2. Completar Phase 2: T005 → T007
3. Completar Phase 3: T008 → T017
4. **PARAR E VALIDAR**: executar `npm test`, `npm run typecheck`, cenário 1 do `quickstart.md`
5. Se tudo verde → demo do endpoint `/team` funcional

### Entrega Incremental

1. Setup + Foundational (T001–T007) → base tipada
2. US1 (T008–T017) → endpoint funcional + testes → **MVP entregável**
3. US2 (T018–T021) → enforcement de papéis verificável
4. US3 (T022–T025) → visibilidade na interface
5. Polish (T026–T030) → qualidade final

---

## Notes

- `[P]` = paralelizável (arquivos distintos, sem dependência de tarefa incompleta)
- `[USn]` = rastreia a tarefa à user story correspondente
- Cada nó do grafo (`supervisor`, `analyst`, `planner`, `executor`) reside em arquivo próprio — minimiza conflitos de merge
- O padrão `invokeWithResilience` de `src/agents/model.ts` DEVE ser reutilizado em todos os nós — não criar novo mecanismo de fallback
- O `SqliteConversationStore` e `SqliteOperationalStore` existentes são injetados — não instanciar dentro dos nós
- Commit recomendado após cada checkpoint de fase
