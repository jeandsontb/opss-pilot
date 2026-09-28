# Feature Specification: Team Mode — Multi-Agent Copilot de Plantão

**Feature Branch**: `015-team-mode`

**Created**: 2026-09-28

**Status**: Draft

**Input**: User description: "Modo equipe em src/team/: supervisor com withStructuredOutput({ next, brief}) sobre um blackboard no estado. Papéis: analista (só leitura, não propõe), planejador (sem tools), executor (incidentes, sem bypass). Evento "handoff" no trace, renderizado no "ver raciocínio". Rota "team", teto 8"

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Triagem Automática de Alerta via Equipe (Priority: P1)

O operador de plantão recebe um alerta crítico e, em vez de acionar um agente único, aciona o modo equipe. O supervisor lê o alerta, decide qual papel deve agir primeiro, emite um `brief` e transfere o controle. O analista lê os dados de observabilidade, o planejador traça um plano de resposta e o executor aplica as ações de incidente. Cada troca de controle gera um evento `handoff` visível na interface de raciocínio.

**Why this priority**: É o fluxo primário do produto. Sem ele a feature não entrega valor algum.

**Independent Test**: Pode ser testado via `POST /api/team` com um alerta simulado e verificação dos eventos `handoff` no campo `trace` da resposta.

**Acceptance Scenarios**:

1. **Given** um alerta com severidade `critical`, **When** o operador envia `POST /api/team` com o alerta no corpo, **Then** a resposta contém um campo `answer` com a análise final e um campo `trace` com pelo menos dois eventos `handoff` registrados na sequência correta (analista → planejador → executor).

2. **Given** uma conversa ativa com ID válido, **When** o operador envia uma mensagem de acompanhamento para `/api/team`, **Then** o grafo retoma o contexto anterior e os eventos `handoff` do turno atual são adicionados ao histórico existente.

3. **Given** que o teto de 8 ciclos do supervisor é atingido, **When** o supervisor tenta iniciar um novo ciclo, **Then** o grafo encerra a execução graciosamente e retorna a resposta parcial acumulada até aquele ponto.

---

### User Story 2 — Restrições de Papel Respeitadas (Priority: P2)

O sistema garante que cada papel opera somente dentro de suas responsabilidades definidas: o analista nunca propõe ações, o planejador nunca chama ferramentas externas, e o executor nunca ignora as decisões do planejador.

**Why this priority**: Sem controle de papel, o modo equipe equivale a um único agente sem estrutura, perdendo o diferencial arquitetural.

**Independent Test**: Testes unitários para cada nó do grafo verificam que tentativas de violação de papel são rejeitadas ou ignoradas.

**Acceptance Scenarios**:

1. **Given** o nó analista em execução, **When** o LLM retorna uma resposta que contém uma recomendação de ação, **Then** o analista descarta a recomendação e retorna apenas a análise de observabilidade sem proposta.

2. **Given** o nó planejador em execução, **When** existe uma tool disponível no ambiente, **Then** o planejador não invoca a tool e produz somente o plano textual.

3. **Given** o nó executor em execução, **When** o operador tenta passar uma instrução direta não derivada do planejador, **Then** o executor recusa e aguarda a instrução correta do blackboard.

---

### User Story 3 — Visibilidade do Raciocínio da Equipe na Interface (Priority: P3)

O operador pode abrir o painel "Ver Raciocínio" na interface web e visualizar, passo a passo, quais papéis foram acionados, em que ordem, e qual `brief` foi emitido pelo supervisor em cada handoff.

**Why this priority**: Transparência é essencial para auditoria e confiança em sistemas de decisão autônomos.

**Independent Test**: A interface web renderiza os eventos `handoff` extraídos do campo `trace` da resposta HTTP sem necessitar de endpoint adicional.

**Acceptance Scenarios**:

1. **Given** uma resposta `/api/team` com eventos `handoff` no `trace`, **When** o operador clica em "Ver Raciocínio", **Then** o painel exibe uma linha do tempo com o nome do papel acionado e o texto do `brief` correspondente para cada handoff.

2. **Given** uma execução com 8 ciclos (teto máximo), **When** o painel de raciocínio é aberto, **Then** são exibidos no máximo 8 eventos de handoff, sem duplicações ou gaps.

---

### Edge Cases

- O que acontece quando o supervisor seleciona o mesmo papel consecutivamente? O grafo deve permitir repetição, mas o contador de ciclos deve ser decrementado a cada iteração.
- O que acontece se o analista não encontrar dados de observabilidade relevantes? Deve retornar análise vazia com indicação explícita de ausência de dados, sem bloquear o grafo.
- O que acontece se o LLM retornar um `next` inválido (papel inexistente)? O supervisor deve tratar o valor inválido como `END` e encerrar o grafo com erro controlado.
- O que acontece em caso de falha de modelo durante a execução de um nó? O erro deve ser capturado, o grafo encerrado e o erro propagado com status HTTP adequado (503/504).
- O que acontece se `conversationId` for enviado mas não existir no store? O sistema deve retornar 404 com mensagem clara, sem criar conversa fantasma.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE expor um endpoint `POST /api/team` que aceita `message`, `conversationId` opcional e `maxSteps` (1–8, padrão 8), retornando `answer`, `conversationId` e `trace`.
- **FR-002**: O supervisor DEVE usar saída estruturada com os campos `next` (papel a acionar) e `brief` (instrução contextual) a cada ciclo.
- **FR-003**: O estado compartilhado (blackboard) DEVE ser visível a todos os nós do grafo e atualizado a cada etapa sem violação de imutabilidade do estado LangGraph.
- **FR-004**: O nó analista DEVE ter acesso apenas a ferramentas de leitura de dados (alertas, métricas, logs) e DEVE ser impedido de emitir propostas de ação.
- **FR-005**: O nó planejador DEVE receber o resultado do analista via blackboard e produzir um plano de resposta textual, sem invocar tools externas.
- **FR-006**: O nó executor DEVE consumir o plano do blackboard e acionar as tools de gerenciamento de incidentes disponíveis no projeto, sem possibilidade de bypass do fluxo de aprovação.
- **FR-007**: Cada transição entre papéis DEVE registrar um evento `handoff` no trace contendo: `from`, `to`, `brief` e `timestamp`.
- **FR-008**: O grafo DEVE encerrar quando o supervisor emitir `next: "END"` ou quando o número de ciclos atingir `maxSteps`.
- **FR-009**: O endpoint `/api/team` DEVE validar todas as entradas com schema Zod antes de iniciar o grafo.
- **FR-010**: O módulo de equipe DEVE residir em `src/team/` e ser composto por: `supervisor.ts`, `analyst.ts`, `planner.ts`, `executor.ts`, `graph.ts` e `types.ts`.
- **FR-011**: O sistema DEVE reutilizar o `SqliteConversationStore` existente para persistência de contexto das conversas de equipe.
- **FR-012**: A interface web DEVE renderizar os eventos `handoff` do `trace` no painel "Ver Raciocínio" como uma linha do tempo ordenada por `timestamp`.

### Key Entities

- **TeamState (Blackboard)**: Estado compartilhado imutável do grafo; contém histórico de mensagens, resultado de análise, plano de resposta, lista de eventos `handoff` e contagem de ciclos.
- **HandoffEvent**: Evento registrado a cada transição de papel; atributos: `from`, `to`, `brief`, `timestamp`.
- **SupervisorDecision**: Saída estruturada do supervisor; atributos: `next` (enum de papéis + "END"), `brief` (string).
- **TeamRole**: Enumeração dos papéis disponíveis: `analyst`, `planner`, `executor`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uma conversa de equipe com alerta crítico completa o ciclo completo (analista → planejador → executor) em menos de 60 segundos no ambiente de desenvolvimento.
- **SC-002**: O campo `trace` retornado pelo endpoint `/api/team` contém pelo menos um evento `handoff` para cada transição de papel ocorrida.
- **SC-003**: `npm test` permanece 100% verde após a implementação do módulo `src/team/`, sem regressão nos testes existentes.
- **SC-004**: `npm run typecheck` retorna 0 erros após a implementação completa.
- **SC-005**: O painel "Ver Raciocínio" renderiza os eventos `handoff` sem alteração nos endpoints existentes, apenas estendendo o parser de trace.
- **SC-006**: Nenhum papel ultrapassa suas restrições definidas em 100% dos cenários de teste, verificado por testes unitários de isolamento de nó.
- **SC-007**: O sistema suporta o teto configurável de 1 a 8 ciclos, rejeitando valores fora dessa faixa com erro de validação Zod (HTTP 422).

---

## Assumptions

- O `SqliteConversationStore` existente é suficiente para persistir o contexto das conversas de equipe sem modificação de esquema.
- Os modelos de LLM disponíveis via OpenRouter suportam `withStructuredOutput` com o schema `{ next, brief }` sem prompt adicional de coerção.
- A interface web já possui o componente "Ver Raciocínio" e o campo `trace` é compatível com extensão de novos tipos de evento sem refatoração estrutural.
- O endpoint `/api/team` seguirá o mesmo padrão de autenticação e middleware já estabelecido pelos endpoints `/api/chat` e `/api/incidents`.
- As tools de incidentes disponíveis para o executor são as já implementadas em `src/agents/` e acessíveis via o `SqliteOperationalStore`.
- Suporte mobile e internacionalização estão fora do escopo desta feature.
- A configuração do modelo LLM (provider, temperatura) será herdada do sistema de modelos existente em `src/agents/model.ts`.
