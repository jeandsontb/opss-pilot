# Feature Specification: Núcleo de raciocínio do OpssPilot

**Feature Branch**: `001-reasoning-core`

**Created**: 2026-09-21

**Status**: Draft

**Input**: User description: "Núcleo de raciocínio do opssPilot:

- interface comum ReasoningStrategy: name + run(input) -> (answer,trace, metrics). trace = eventos tipados (thought | action | observation | plan | critique | answer; action carrega (tool, args)). metrics = (llCalls, latencyMs) 
Fábrica única em src/agents/model.ts lend OPENROUTER_API_KEY e OPENROUTER_MODEL (baseURL do OpenRouter), temperature 0. 
- Ferramentas mocks em src/agents/tools.ts sobre um store in-memory pré populado ( o seed primário: 5 serviços, 6 alertas variados - 3 firing, 3 resolved (crie um script para rodar o seed e execute ele no final desse prompt )): list_alerts(status), open_incident(title, service, serverity), resolve_incident(id). Schemas zod, banco postgres usando sequelize.
- estratégia ReAct em src/agents/react.ts usando agente ReAct pré construído do LandGraph com essas tools, capturando o trace completo.
- Estratégia Plan-and-execute em src/agents/plan-and-execute.ts como grafo: planner (saída estruturada: lista de passos), executor (um passo por vez com as tools), replanner (revisa o restante após cada passo; encerra quando não resta nada). Máximo 8 passos
- Toda estratégia respeira o limite de iterações e conta chamadas de LLM.
Arena minima em src/arena.ts: roda 1+ estratégias sobre o mesmo input e imprime traces e métricas (flags --strategies e --max-iterations)
- Testes: store e formatação de trace (deterministicos, sem rede)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Investigar alertas com uma estratégia (Priority: P1)

Como pessoa de plantão, quero enviar uma solicitação operacional e receber uma resposta acompanhada do raciocínio observável e das ações executadas, para entender por que o OpssPilot chegou àquela conclusão e agir com segurança.

**Why this priority**: A investigação de alertas é o valor central do copiloto e precisa funcionar antes da comparação entre estratégias.

**Independent Test**: Executar uma estratégia com uma solicitação sobre alertas e verificar que ela retorna uma resposta, eventos de trace ordenados e métricas de chamadas e duração, sem depender de outra estratégia.

**Acceptance Scenarios**:

1. **Given** uma solicitação operacional válida e o catálogo inicial de alertas, **When** a pessoa executa uma estratégia, **Then** o sistema retorna uma resposta não vazia, um trace ordenado e métricas com chamadas de modelo e latência.
2. **Given** uma estratégia que precisa consultar ou alterar um incidente, **When** ela decide usar uma ferramenta, **Then** o trace registra uma ação com o nome da ferramenta e seus argumentos, seguida da observação do resultado.
3. **Given** uma entrada inválida para uma ferramenta, **When** a estratégia tenta executá-la, **Then** a chamada é rejeitada com erro explícito e não altera o estado do catálogo.

### User Story 2 - Comparar estratégias no mesmo cenário (Priority: P2)

Como pessoa desenvolvedora ou avaliadora, quero executar várias estratégias sobre a mesma entrada e ver seus traces e métricas lado a lado, para comparar qualidade, custo e comportamento de raciocínio.

**Why this priority**: A comparação orienta a evolução do agente, mas depende do contrato comum e das estratégias individuais.

**Independent Test**: Iniciar a arena com duas estratégias e uma entrada única, verificando que cada resultado é identificado pelo nome da estratégia e contém resposta, trace e métricas próprios.

**Acceptance Scenarios**:

1. **Given** uma lista de estratégias válida, **When** a arena recebe uma entrada, **Then** todas as estratégias selecionadas são executadas sobre a mesma entrada e seus resultados são impressos separadamente.
2. **Given** as opções de limite de iterações, **When** a arena é executada, **Then** nenhuma estratégia excede o limite configurado e o resultado informa quando a execução foi encerrada por esse limite.
3. **Given** uma estratégia que excede o limite máximo de passos do planejamento, **When** o executor tenta continuar, **Then** ele encerra sem executar passos adicionais e mantém as métricas e o trace já produzidos.

### User Story 3 - Reproduzir um cenário local sem rede (Priority: P3)

Como pessoa desenvolvedora, quero carregar um catálogo inicial previsível de serviços e alertas e testar o armazenamento e a apresentação do trace sem acesso à rede, para validar o núcleo rapidamente e de forma determinística.

**Why this priority**: A reproducibilidade reduz o custo de desenvolvimento e evita que testes dependam de credenciais ou disponibilidade de serviços externos.

**Independent Test**: Executar o seed local e os testes do store e da formatação do trace em ambiente sem rede, verificando os registros e a saída esperados.

**Acceptance Scenarios**:

1. **Given** um store vazio, **When** o seed primário é executado, **Then** ficam disponíveis cinco serviços e seis alertas, sendo três em estado firing e três em estado resolved.
2. **Given** o store populado, **When** a pessoa lista alertas por estado, **Then** recebe somente os alertas daquele estado e a consulta não modifica o store.
3. **Given** um trace com eventos de pensamento, plano, ação, observação, crítica e resposta, **When** ele é formatado, **Then** a saída preserva a ordem, o tipo e os dados relevantes de cada evento de maneira determinística.

### Edge Cases

- Uma lista de alertas sem resultados deve retornar uma coleção vazia e uma resposta que não invente alertas.
- Tentativas de abrir incidente para serviço inexistente, resolver incidente inexistente ou usar status inválido devem produzir erro de domínio explícito e preservar o estado anterior.
- Chamadas de modelo sem credencial ou modelo configurado devem falhar de forma explícita na borda de configuração; a execução não deve simular sucesso.
- Uma estratégia que atinja o limite de iterações deve retornar o trace parcial e métricas acumuladas, indicando encerramento por limite.
- Argumentos de ferramentas devem permanecer serializáveis e validados; campos desconhecidos ou grafia inválida, como `serverity`, não devem ser aceitos silenciosamente.
- A execução de várias estratégias deve evitar que alterações feitas por uma estratégia contaminem a avaliação das demais sobre a mesma entrada.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST expor um contrato comum de estratégia com nome identificável e uma operação de execução que retorne resposta, trace tipado e métricas.
- **FR-002**: O sistema MUST suportar eventos de trace dos tipos `thought`, `action`, `observation`, `plan`, `critique` e `answer`; eventos de ação MUST incluir ferramenta e argumentos validados.
- **FR-003**: O sistema MUST registrar nas métricas o número de chamadas de modelo e a latência total da execução.
- **FR-004**: O sistema MUST disponibilizar uma única fábrica de modelo que use a configuração externa do provedor OpenRouter, mantenha temperatura zero e não exponha credenciais.
- **FR-005**: O sistema MUST disponibilizar as ferramentas `list_alerts(status)`, `open_incident(title, service, severity)` e `resolve_incident(id)`, com entradas e saídas validadas e erros explícitos.
- **FR-006**: O sistema MUST manter serviços, alertas e incidentes em um armazenamento compatível com persistência relacional e oferecer um modo inicial local em memória para os testes determinísticos.
- **FR-007**: O seed primário MUST criar cinco serviços e seis alertas variados, com exatamente três alertas firing e três resolved, e MUST ser executável por um script dedicado.
- **FR-008**: O sistema MUST oferecer uma estratégia ReAct que use as ferramentas disponíveis e capture o trace completo, incluindo raciocínio observável, ações e observações.
- **FR-009**: O sistema MUST oferecer uma estratégia Plan-and-execute composta por planejamento estruturado em passos, execução sequencial de um passo por vez e replanejamento após cada passo.
- **FR-010**: A estratégia Plan-and-execute MUST limitar a oito passos de planejamento/executáveis e encerrar quando não houver passos restantes.
- **FR-011**: Toda estratégia MUST respeitar o limite de iterações recebido pela execução e retornar o resultado parcial quando o limite for atingido.
- **FR-012**: A arena MUST executar uma ou mais estratégias selecionadas sobre a mesma entrada e imprimir, para cada uma, nome, resposta, trace e métricas.
- **FR-013**: A arena MUST aceitar as opções `--strategies` e `--max-iterations`, validar seus valores e rejeitar configurações inválidas com mensagem explícita.
- **FR-014**: O sistema MUST incluir testes determinísticos, sem rede, para o armazenamento local e para a formatação dos eventos de trace.
- **FR-015**: A execução de estratégias sobre uma mesma entrada MUST usar estado isolado ou restaurável, de modo que uma estratégia não altere os dados observados pela seguinte.

### Key Entities

- **ReasoningStrategy**: Estratégia nomeada que transforma uma entrada operacional em resposta, eventos de trace e métricas.
- **TraceEvent**: Evento tipado e ordenado que representa uma etapa do raciocínio, plano, ação de ferramenta, observação, crítica ou resposta.
- **Metrics**: Medidas da execução, incluindo quantidade de chamadas de modelo e latência em milissegundos.
- **Service**: Serviço monitorado ao qual alertas e incidentes podem estar associados.
- **Alert**: Sinal operacional com estado firing ou resolved, associado a um serviço.
- **Incident**: Registro operacional aberto por uma estratégia e resolvido por identificador.
- **Tool**: Operação validada que consulta ou altera o estado operacional.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das execuções válidas de estratégia retornam os três componentes do contrato: resposta, trace e métricas.
- **SC-002**: 100% dos testes do store e da formatação de trace passam sem acesso à rede e produzem o mesmo resultado para a mesma entrada.
- **SC-003**: O seed local produz exatamente cinco serviços e seis alertas, com a distribuição 3 firing/3 resolved, em todas as execuções limpas.
- **SC-004**: Nenhuma execução ultrapassa o limite de iterações informado, e nenhum plano executa mais de oito passos.
- **SC-005**: Em uma rodada da arena, todas as estratégias selecionadas recebem a mesma entrada e cada resultado pode ser distinguido por nome, trace e métricas.
- **SC-006**: Entradas inválidas de ferramentas e da arena são rejeitadas antes de alterar o estado ou iniciar uma execução de estratégia.
- **SC-007**: Uma pessoa avaliadora consegue identificar, a partir do output da arena, cada chamada de ferramenta, sua observação correspondente e as métricas de custo/latência sem consultar logs adicionais.

## Assumptions

- O usuário da arena é uma pessoa desenvolvedora ou avaliadora com acesso ao processo local; autenticação e autorização ficam fora do escopo desta feature.
- O provedor de modelo é necessário para executar estratégias reais; testes determinísticos cobrem apenas store e formatação e não exigem rede.
- O banco relacional é o destino de persistência da aplicação, enquanto o store em memória é um adaptador de teste e seed local.
- O isolamento entre estratégias pode ser obtido por cópia, snapshot/restauração ou novo store equivalente, desde que o comportamento observado seja o mesmo.
- A grafia correta do parâmetro de severidade é `severity`; entradas com nomes alternativos devem ser rejeitadas.
- O formato textual exato da arena pode evoluir, mas deve permanecer legível, determinístico para os mesmos resultados e conter todos os campos exigidos.
