# Feature Specification: Grafo Unificado de Raciocínio

**Feature Branch**: `010-grafo-unificado`

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "Grafo unificado:

- production-graph.ts: nós contexto, roteador, as 3 estratégias como nós e resposta.
- Roteador: withStructuredOutput (route, reason); tabela no promp; evento "route" e campo nodeem todo evento de trace.
- /chat: strategy opcional (se vier, é override no trace)"

## User Scenarios & Testing

### User Story 1 - Roteamento automático para a estratégia adequada (Priority: P1)

Como operador de plantão, quero enviar uma pergunta sem escolher uma estratégia
para que o sistema selecione automaticamente o fluxo de raciocínio mais adequado
e mantenha essa decisão visível no trace.

**Why this priority**: O grafo unificado deve ser o ponto de entrada único para
o raciocínio e precisa preservar a capacidade atual de escolher entre as
estratégias sem exigir conhecimento interno do operador.

**Independent Test**: Executar o grafo com uma mensagem e um roteador fake que
retorna cada rota válida; verificar que somente o nó da estratégia selecionada
é executado, a resposta é produzida e o trace contém um evento `route` com
rota e justificativa.

**Acceptance Scenarios**:

1. **Given** uma mensagem sem estratégia explícita e um roteador que seleciona
   ReAct, **When** o grafo é executado, **Then** o contexto é construído antes
   do roteamento, o nó ReAct é executado e a resposta contém o trace completo.
2. **Given** uma decisão de roteamento com rota e motivo estruturados, **When**
   a decisão é aceita, **Then** o trace registra a rota, o motivo e a
   estratégia efetivamente executada.
3. **Given** uma rota inválida ou uma decisão estruturada inválida, **When** o
   grafo tenta rotear, **Then** a execução falha explicitamente sem produzir
   uma resposta com aparência de sucesso.

### User Story 2 - Forçar uma estratégia pelo endpoint de chat (Priority: P1)

Como operador ou integração automatizada, quero informar uma estratégia
opcional no pedido de chat para forçar o fluxo desejado, sem perder o trace da
decisão de override.

**Why this priority**: Reprodutibilidade operacional e testes de incidentes
exigem que uma estratégia possa ser escolhida diretamente, enquanto o caminho
automático continua disponível quando o campo não é enviado.

**Independent Test**: Enviar pedidos com e sem `strategy` para `/chat` usando
estratégias fake e verificar, respectivamente, execução forçada e roteamento
automático, incluindo o evento correspondente no trace.

**Acceptance Scenarios**:

1. **Given** um pedido com `strategy` válida, **When** `/chat` é chamado,
   **Then** a estratégia indicada é executada mesmo que o roteador escolheria
   outra, e o trace identifica a estratégia como override.
2. **Given** um pedido sem `strategy`, **When** `/chat` é chamado, **Then** o
   roteador decide a estratégia e o trace não registra um override inexistente.
3. **Given** um pedido com `strategy` desconhecida, **When** `/chat` é chamado,
   **Then** o endpoint responde com erro de validação/roteamento explícito e não
   executa uma estratégia diferente silenciosamente.

### User Story 3 - Trace uniforme e auditável (Priority: P1)

Como pessoa investigando um incidente, quero identificar o nó que gerou cada
evento do trace para reconstruir o caminho percorrido pelo grafo.

**Why this priority**: A auditabilidade é necessária para comparar estratégias,
diagnosticar roteamentos e explicar como uma resposta operacional foi produzida.

**Independent Test**: Executar cada estratégia com eventos de todos os tipos
suportados e verificar que todos os eventos retornados possuem `node`, enquanto
o evento `route` contém a rota e o motivo.

**Acceptance Scenarios**:

1. **Given** qualquer evento de pensamento, ação, observação, plano, crítica ou
   resposta, **When** ele é emitido por um nó, **Then** o evento inclui o nome
   do nó de origem.
2. **Given** uma execução automática completa, **When** o trace é formatado,
   **Then** o evento `route` aparece antes dos eventos da estratégia escolhida.
3. **Given** uma execução com override, **When** o trace é retornado, **Then**
   o evento de override identifica a estratégia solicitada e não é confundido
   com uma decisão automática do roteador.

## Edge Cases

- O roteador pode retornar uma rota válida que não esteja registrada; o grafo
  deve falhar explicitamente com erro de estratégia desconhecida.
- A saída estruturada pode omitir `route`, `reason` ou conter tipos inválidos;
  isso deve ser rejeitado antes da execução de uma estratégia.
- O modelo do roteador pode falhar ou exceder o limite de tempo; o erro deve
  chegar à borda HTTP sem resposta sintética.
- Uma estratégia pode retornar um trace legado sem `node`; o adaptador deve
  normalizar o evento para o nó executor ou rejeitar a saída conforme o
  contrato de validação, sem remover eventos.
- O campo `strategy` vazio, com espaços ou desconhecido não deve acionar
  fallback silencioso.
- O roteamento deve respeitar o limite de iterações da estratégia escolhida e
  não criar ciclos adicionais.

## Requirements

### Functional Requirements

- **FR-001**: O sistema MUST expor um grafo unificado em
  `src/agents/production-graph.ts` com nós de contexto, roteador, três nós de
  estratégia e resposta.
- **FR-002**: O nó de contexto MUST construir o prompt compartilhado antes de
  qualquer roteamento ou execução de estratégia.
- **FR-003**: O roteador MUST aceitar uma decisão estruturada contendo
  `route` e `reason`, rejeitando saídas que não cumpram esse formato.
- **FR-004**: O roteador MUST apresentar ao modelo uma tabela explícita com as
  estratégias disponíveis, seus nomes e critérios de seleção.
- **FR-005**: O grafo MUST executar exatamente o nó correspondente à rota
  selecionada e encaminhar sua resposta ao nó final de resposta.
- **FR-006**: O grafo MUST emitir um evento de trace `route` antes dos eventos
  da estratégia, contendo a rota selecionada e o motivo da decisão.
- **FR-007**: Todo evento de trace MUST conter o campo `node`, inclusive eventos
  de ação, pensamento, observação, plano, crítica, resposta e roteamento.
- **FR-008**: O endpoint `/chat` MUST aceitar `strategy` como campo opcional.
- **FR-009**: Quando `strategy` for informado e válido, o endpoint MUST tratá-lo
  como override do roteador e registrar essa decisão no trace.
- **FR-010**: Quando `strategy` não for informado, o endpoint MUST usar o
  roteador do grafo unificado.
- **FR-011**: Estratégia desconhecida, decisão inválida, falha do roteador e
  timeout MUST produzir erros explícitos na borda HTTP, sem fallback silencioso.
- **FR-012**: O grafo MUST preservar as métricas existentes, incluindo chamadas
  de modelo, latência, tokens reais e breakdown de contexto.
- **FR-013**: O grafo MUST respeitar os limites de iteração das estratégias e
  não executar nós de estratégia adicionais além da rota escolhida.
- **FR-014**: A validação de entrada e saída do endpoint MUST continuar
  rejeitando mensagens inválidas e traces que não cumpram o contrato.
- **FR-015**: O comportamento do caminho de estratégia explícita MUST ser
  determinístico quando usado com estratégias fake, sem exigir rede.

### Key Entities

- **ProductionGraph**: fluxo único que coordena contexto, roteamento,
  estratégia escolhida e resposta final.
- **RouteDecision**: decisão estruturada com `route` e `reason`.
- **TraceEvent**: evento auditável com tipo, conteúdo específico do evento e
  `node` de origem.
- **StrategyOverride**: escolha opcional enviada pelo consumidor do chat que
  substitui a decisão automática do roteador.
- **StrategyCatalogEntry**: nome e descrição operacional de cada uma das três
  estratégias disponíveis para roteamento.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% das execuções válidas sem override registram exatamente um
  evento `route` antes do primeiro evento da estratégia executada.
- **SC-002**: 100% dos eventos retornados por cada estratégia e pelo grafo
  unificado contêm um `node` não vazio.
- **SC-003**: 100% dos pedidos com estratégia válida executam somente a
  estratégia solicitada e registram o override no trace.
- **SC-004**: Decisões inválidas, rotas desconhecidas e entradas inválidas
  produzem erro explícito em 100% dos testes determinísticos correspondentes.
- **SC-005**: O caminho unificado preserva os valores de métricas produzidos
  pela estratégia, sem substituir tokens reais por estimativas.
- **SC-006**: Testes offline cobrem as três rotas, o override, o trace com
  `node`, falhas de roteamento e compatibilidade do endpoint.

## Assumptions

- As três estratégias são as três entradas atualmente expostas pelo produto:
  ReAct, Plan-and-execute e Reflection sobre uma estratégia base.
- O nome enviado em `strategy` usa o identificador registrado no catálogo,
  incluindo `react`, `plan-and-execute` e `reflection` conforme o registro final.
- O roteador usa uma decisão estruturada e uma tabela textual de critérios,
  mas a seleção continua sujeita à validação do catálogo antes da execução.
- O evento de override usa o mesmo tipo `route`, com indicação explícita de que
  a origem foi `strategy` do pedido, para manter o trace uniforme.
- O contexto construído pelo `ContextBuilder` existente é a entrada comum dos
  nós de estratégia.
- Persistência de decisões de roteamento fora do trace e mudanças no formato
  público de métricas estão fora do escopo desta versão.
