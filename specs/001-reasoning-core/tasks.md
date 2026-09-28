---

description: "Task list for the OpssPilot reasoning core"
---

# Tasks: Núcleo de raciocínio do OpssPilot

**Input**: Design documents from `/specs/001-reasoning-core/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/`, `quickstart.md`

**Organization**: Tasks are grouped by user story so each story can be
implemented and tested independently after the foundational phase.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar scripts, diretórios e configuração comum sem alterar
comportamento de produção existente.

- [X] T001 Atualizar `package.json` com os scripts `test` e `seed`, preservando os scripts existentes `dev`, `arena`, `bench`, `text` e `typecheck`
- [X] T002 [P] Criar a estrutura de diretórios `src/agents`, `src/models`, `src/services`, `src/scripts` e `test` conforme `specs/001-reasoning-core/plan.md`
- [X] T003 [P] Confirmar em `tsconfig.json` que `src/**/*.ts` usa TypeScript ESM com `strict: true` e permanece compatível com Node.js 22

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Construir os tipos, validações, erros e store que bloqueiam todas
as estratégias e ferramentas.

**⚠️ CRITICAL**: Nenhuma história deve começar antes desta fase.

- [X] T004 [P] Definir entidades, schemas Zod, enums de estado e erros de domínio em `src/models/domain.ts`, incluindo `Service`, `Alert`, `Incident`, estados `firing/resolved` e `open/resolved`, e a regra de que IDs e referências devem ser válidos
- [X] T005 [P] Definir `TraceEvent`, `Metrics`, `ReasoningResult`, `ReasoningInput` e `ReasoningStrategy` em `src/agents/types.ts`, mantendo os eventos `thought`, `action`, `observation`, `plan`, `critique` e `answer`
- [X] T006 [P] Implementar formatadores determinísticos dos eventos e resultados em `src/agents/trace.ts`, preservando ordem, tipo e campos de ação `tool`/`args`
- [X] T007 Implementar `OperationalStore` em `src/models/store.ts` com operações atômicas para serviços, alertas e incidentes, validação de referências, listagem por status e clone/snapshot isolável
- [X] T008 [P] Implementar funções puras de seed em `src/models/seed.ts` com exatamente cinco serviços e seis alertas, sendo exatamente três `firing` e três `resolved`
- [X] T009 [P] Criar os modelos/adaptador relacional em `src/models/sqlite.ts`, encapsulando a persistência SQLite sem tornar o store em memória dependente de banco
- [X] T010 [P] Implementar os serviços de domínio para listar alertas, abrir incidente e resolver incidente em `src/services/incidents.ts`, traduzindo falhas de store em erros de domínio explícitos

**Checkpoint**: tipos, store, seed, persistência e serviços de domínio estão
prontos; as histórias podem ser implementadas em paralelo.

---

## Phase 3: User Story 1 - Investigar alertas com uma estratégia (Priority: P1) 🎯 MVP

**Goal**: Executar uma estratégia operacional com resposta, trace completo,
métricas, ferramentas validadas e limites de iteração.

**Independent Test**: Com um `OperationalStore` seedado, executar uma estratégia
com uma solicitação sobre alertas e verificar resposta, trace ordenado, ações
com argumentos e métricas; repetir com payload inválido e verificar que não há
mutação.

### Tests for User Story 1

- [X] T011 [P] [US1] Criar testes determinísticos do store e das operações de domínio em `test/store.test.ts`, cobrindo seed 5/6, distribuição 3/3, filtragem, abertura, resolução, erros e isolamento por clone
- [X] T012 [P] [US1] Criar testes determinísticos de formatação de trace em `test/trace.test.ts`, cobrindo todos os tipos de evento, ordem e serialização dos argumentos de ação

### Implementation for User Story 1

- [X] T013 [P] [US1] Implementar a fábrica única do modelo OpenRouter em `src/agents/model.ts`, lendo `OPENROUTER_API_KEY` e `OPENROUTER_MODEL`, usando a base URL do OpenRouter e `temperature: 0`, com erro explícito para configuração ausente
- [X] T014 [US1] Implementar schemas e wrappers LangChain das ferramentas `list_alerts(status)`, `open_incident(title, service, severity)` e `resolve_incident(id)` em `src/agents/tools.ts`, rejeitando campos desconhecidos e preservando a grafia `severity`
- [X] T015 [US1] Implementar contador de chamadas de LLM, medição de `latencyMs`, limite de `maxIterations` e retorno parcial em `src/agents/execution.ts`
- [X] T016 [US1] Implementar a estratégia ReAct usando o agente ReAct pré-construído de LangGraph em `src/agents/react.ts`, conectando as tools, registrando `thought`, `action`, `observation` e `answer` e respeitando o limite de iterações
- [X] T017 [US1] Implementar o script de seed executável em `src/scripts/seed.ts`, inicializando o store local, aplicando o seed e imprimindo contagens verificáveis de serviços e alertas
- [X] T018 [US1] Integrar `OperationalStore`, tools, ReAct e tipos comuns em `src/agents/index.ts` ou exportações equivalentes para que uma estratégia possa ser executada sem conhecer detalhes de persistência

**Checkpoint**: a estratégia ReAct e o caminho de ferramentas são executáveis
isoladamente, com testes offline para store e trace.

---

## Phase 4: User Story 2 - Comparar estratégias no mesmo cenário (Priority: P2)

**Goal**: Oferecer Plan-and-execute e uma arena que executa estratégias
selecionadas sobre estados equivalentes, imprime traces e métricas e valida
limites.

**Independent Test**: Executar a arena com `react,plan-and-execute` e uma entrada
única; confirmar um bloco por estratégia, estado inicial isolado, trace,
resposta e métricas, e confirmar encerramento ao atingir `--max-iterations`.

### Tests for User Story 2

- [X] T019 [P] [US2] Adicionar testes sem rede para o executor de planos e limites em `test/plan-and-execute.test.ts`, cobrindo máximo de oito passos, um passo por iteração, replanejamento e encerramento sem passos restantes
- [X] T020 [P] [US2] Adicionar testes da validação e formatação da arena em `test/arena.test.ts`, cobrindo seleção de uma ou mais estratégias, entrada compartilhada, flags inválidas e output com trace/métricas

### Implementation for User Story 2

- [X] T021 [US2] Implementar o grafo Plan-and-execute em `src/agents/plan-and-execute.ts`, com planner de saída estruturada em lista, executor de um passo por vez, replanner após cada passo e teto absoluto de oito passos
- [X] T022 [US2] Instrumentar planner, executor e replanner para contar toda chamada de LLM, registrar `plan`, `action`, `observation`, `critique` e `answer`, e retornar resultado parcial em `src/agents/plan-and-execute.ts`
- [X] T023 [US2] Implementar parsing Zod da CLI, seleção de estratégias, criação de store isolado por estratégia e impressão de resultados em `src/arena.ts`, aceitando `--strategies` e `--max-iterations`
- [X] T024 [US2] Atualizar `package.json` e exports necessários para executar `npm run arena -- --strategies react,plan-and-execute --max-iterations 8 "entrada"` sem expor secrets
- [X] T025 [US2] Garantir em `src/arena.ts` que uma estratégia não contamina o estado inicial da seguinte por meio de snapshot/clone restaurável, mantendo a mesma entrada para todas

**Checkpoint**: as duas estratégias são selecionáveis e comparáveis na arena,
com limites e métricas observáveis.

---

## Phase 5: User Story 3 - Reproduzir um cenário local sem rede (Priority: P3)

**Goal**: Tornar o seed e os testes offline reproduzíveis e documentar uma
execução de validação completa.

**Independent Test**: Rodar o seed em store limpo e executar os testes de store
e trace sem credenciais ou rede, obtendo sempre as mesmas contagens e output.

- [X] T026 [P] [US3] Criar teste de regressão do seed executável em `test/seed.test.ts`, verificando cinco serviços, seis alertas e exatamente três alertas em cada status
- [X] T027 [US3] Criar teste de erro de configuração do modelo em `test/model.test.ts`, usando injeção/isolamento de ambiente sem chamada de rede e confirmando falha explícita quando a configuração obrigatória falta
- [X] T028 [US3] Documentar comandos de seed, testes, typecheck e arena em `specs/001-reasoning-core/quickstart.md`, incluindo a restrição de não usar `.env` nem rede nos testes
- [X] T029 [US3] Verificar que o script `src/scripts/seed.ts` é idempotente sobre store limpo e que falhas de validação não deixam estado parcialmente populado

**Checkpoint**: o cenário local é reproduzível e validável sem infraestrutura
externa.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verificar a entrega completa, documentação e qualidade transversal.

- [X] T030 [P] Atualizar `specs/001-reasoning-core/contracts/strategy.md` e `specs/001-reasoning-core/contracts/tools-and-arena.md` para refletir qualquer ajuste compatível feito nas assinaturas reais
- [X] T031 [P] Adicionar mensagens de erro explícitas e sanitizadas para configuração ausente, argumentos inválidos, estratégia desconhecida e limite atingido em `src/agents`, `src/services` e `src/arena.ts`
- [X] T032 Executar `npm test` e corrigir falhas relacionadas à feature sem introduzir dependência de rede
- [X] T033 Executar `npm run typecheck` e corrigir todos os erros TypeScript introduzidos pela feature
- [X] T034 Executar os cenários do `specs/001-reasoning-core/quickstart.md`, incluindo o script de seed, arena com uma estratégia e arena com duas estratégias

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: depende da Setup e bloqueia todas as histórias.
- **User Story 1 (Phase 3)**: depende da Foundation e é o MVP recomendado.
- **User Story 2 (Phase 4)**: depende da Foundation; a integração completa da arena usa a ReAct da US1.
- **User Story 3 (Phase 5)**: depende da Foundation e pode ser iniciada após o seed/infraestrutura; a regressão da arena usa US1/US2.
- **Polish (Phase 6)**: depende das histórias desejadas.

### User Story Dependencies

- **US1 (P1)**: independente após Phase 2.
- **US2 (P2)**: funcionalmente depende da infraestrutura da US1 para comparar ReAct, mas o Plan-and-execute pode ser desenvolvido em paralelo após os tipos/tools.
- **US3 (P3)**: independente para store, seed e testes offline; a validação completa da arena depende de US1/US2.

### Parallel Opportunities

- T002/T003 podem ser executadas em paralelo.
- T004/T005/T006/T008/T009/T010 podem ser executadas em paralelo antes de T007 quando não dependerem da implementação concreta do store.
- T011 e T012 podem ser executadas em paralelo.
- T013/T014/T017 podem ser executadas em paralelo; T016 depende de T013/T014/T015.
- T019 e T020 podem ser executadas em paralelo.
- T026/T027/T028 podem ser executadas em paralelo.
- T030/T031 podem ser executadas em paralelo antes de T032/T033/T034.

## Implementation Strategy

1. Entregar o MVP pela Phase 1, Phase 2 e US1: store seedado, tools validadas,
   ReAct, trace, métricas e testes offline.
2. Adicionar US2 para comparação e controle operacional de custo.
3. Fechar US3 com reprodução do seed e documentação executável.
4. Rodar a fase de polish e os gates `npm test`/`npm run typecheck`.

## Format Validation

Todas as tarefas usam `- [ ]`, ID sequencial `T###`, marcador `[P]` somente
quando paralelizáveis, rótulo `[USn]` em fases de história e caminho de arquivo
explícito na descrição.
