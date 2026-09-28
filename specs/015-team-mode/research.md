# Research: Team Mode — Multi-Agent Copilot de Plantão

**Feature**: 015-team-mode  
**Date**: 2026-09-28  
**Phase**: 0 — Outline & Research

---

## Decision 1: Saída estruturada do supervisor

**Decision**: Usar `model.withStructuredOutput(supervisorSchema)` onde `supervisorSchema` é um objeto Zod com `{ next: z.enum([...TeamRole, "END"]), brief: z.string() }`, envolto em `invokeWithResilience` para herdar resiliência de fallback.

**Rationale**: O padrão de saída estruturada já está estabelecido em `plan-and-execute.ts` (ex.: `plannerSchema`, `replannerSchema`). Usar `withStructuredOutput` garante que o supervisor nunca retorne um `next` fora do enum de papéis.

**Alternatives considered**:
- Parsing manual de JSON via prompt: descartado por fragilidade e duplicação de lógica de validação.
- `zodResponseFormat` sem `invokeWithResilience`: descartado por perder a resiliência de fallback já implementada.

---

## Decision 2: Modelagem do Blackboard (TeamState)

**Decision**: Usar `Annotation.Root` do LangGraph com reducers aditivos para `messages`, `trace` e `handoffs`, e reducer de substituição para `analysis`, `plan` e `cycleCount`. O estado nunca é mutado in-place; cada nó retorna delta parcial.

**Rationale**: Padrão idêntico ao `PEState` em `plan-and-execute.ts`. Reducers aditivos garantem que o histórico de handoffs cresce monotonicamente. `cycleCount` é incrementado com reducer `(left, right) => left + right` igual ao `iterations` do PEState.

**Alternatives considered**:
- Store externo (Redis/SQLite) como blackboard: descartado por adicionar dependência desnecessária. O `SqliteConversationStore` já persiste o contexto entre turnos.
- Estado mutável via referência: descartado por violar o modelo de execução do LangGraph.

---

## Decision 3: Evento `handoff` no TraceEvent

**Decision**: Estender a union `TraceEvent` em `src/agents/types.ts` com um novo membro: `{ type: "handoff"; from: string; to: string; brief: string; node?: string }`. Os helpers `formatTraceEvent` e `formatTrace` em `trace.ts` recebem um branch adicional para esse tipo.

**Rationale**: Extensão aditiva da union não quebra nenhum dos tipos existentes (TypeScript discriminated union com `type` literal). O `productionTraceEventSchema` em `production-graph.ts` e o parser da UI consomem o trace como array genérico, então o novo evento é transparente para os consumidores existentes.

**Alternatives considered**:
- Tipo separado `HandoffEvent` em `src/team/types.ts` sem estender a union: descartado porque o campo `trace: TraceEvent[]` no `ReasoningResult` não aceitaria o novo tipo sem cast.
- Campo `handoffs` separado do `trace`: descartado por exigir mudança no contrato do `ReasoningResult` e no endpoint `/chat`.

---

## Decision 4: Roteamento condicional do supervisor

**Decision**: Usar `addConditionalEdges(supervisorNode, routingFn, { analyst: "analyst", planner: "planner", executor: "executor", END: END })`. A `routingFn` lê `state.supervisorDecision.next` e retorna o nome do nó de destino.

**Rationale**: Padrão já usado em `production-graph.ts` com `addConditionalEdges`. O mapa de rotas torna explícito quais estados de saída são válidos.

**Alternatives considered**:
- Edges diretos fixos (supervisor → analyst → planner → executor): descartado por não permitir que o supervisor decida dinamicamente a ordem ou repita papéis.

---

## Decision 5: Restrições de papel

**Decision**:
- **Analista**: recebe um modelo sem tool bindings. As únicas ferramentas disponíveis são `list_alerts` (somente leitura). A instrução de sistema proíbe explicitamente propostas de ação.
- **Planejador**: recebe um modelo sem bindings de ferramenta. A instrução de sistema instrui a produzir exclusivamente um plano textual em lista numerada.
- **Executor**: recebe um modelo com `createTools(store)` completo (sem `forget_preference`, que é de usuário), mas a instrução de sistema exige que leia o `plan` do blackboard antes de agir.

**Rationale**: Restrições via instrução de sistema são verificáveis por testes unitários de prompt (mock do LLM retorna proposta → verifica que o nó descarta). Restrições estruturais (sem tool bindings) são enforcement técnico que não depende do comportamento do modelo.

**Alternatives considered**:
- Guard no pós-processamento do analista para remover propostas: complementar, não substituto.
- Ferramentas separadas por papel via `createAnalystTools` / `createExecutorTools`: adotado — `createTools` já aceita subsets implicitamente; criaremos funções dedicadas em `src/team/tools.ts`.

---

## Decision 6: Módulo `src/team/` e rota `/api/team`

**Decision**: O módulo reside inteiramente em `src/team/` com 7 arquivos: `types.ts`, `tools.ts`, `supervisor.ts`, `analyst.ts`, `planner.ts`, `executor.ts`, `graph.ts`. A rota é registrada em `src/http/server.ts` como `app.post("/team", ...)`, seguindo o padrão da rota `/chat`.

**Rationale**: Isolamento total em `src/team/` evita poluir os agentes existentes. A rota `/team` (sem prefixo `/api/`) é consistente com `/chat` e `/incidents` já expostos.

**Alternatives considered**:
- Adicionar o grafo de equipe como nova estratégia no registry do `production-graph.ts`: descartado por misturar responsabilidades e porque o grafo de equipe tem assinatura de entrada/saída diferente.
