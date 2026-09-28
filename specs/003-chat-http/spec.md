# Feature Specification: API HTTP de Chat

**Feature Branch**: `003-chat-http`

**Created**: 2026-09-23

**Status**: Draft

**Input**: User description: "POST /chat em src/http/server.ts (ou padrão do express): body {message, strategy?, reflect?} validado com zod; default react. 200 { answer, trace, metrics }; 400 body inválido (issues do zod); 422 estratégia desconhecida; timeout 180s -> 504. Registry em src/agents/index.ts (nome -> estratégia; reflect aplica withReflection). Teste de integração com estratégia fake determinística, sem rede"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enviar uma solicitação de plantão (Priority: P1)

Como consumidor da API, quero enviar uma mensagem de operação e receber a resposta da estratégia de raciocínio, seu trace e suas métricas em uma única resposta HTTP.

**Why this priority**: Este é o caminho principal para integrar o OpssPilot a clientes HTTP e disponibilizar o raciocínio operacional.

**Independent Test**: Enviar um corpo válido contendo apenas `message` usando uma estratégia fake determinística e verificar o status 200 e o contrato completo da resposta.

**Acceptance Scenarios**:

1. **Given** que a API está disponível e recebe `{ "message": "quantos alertas estão disparando?" }`, **When** o processamento termina, **Then** responde 200 com `answer`, `trace` e `metrics`, usando `react` como estratégia padrão.
2. **Given** que o corpo informa uma estratégia válida, **When** a requisição é processada, **Then** o registry executa a estratégia solicitada e a resposta preserva o resultado produzido por ela.
3. **Given** que `reflect` está habilitado, **When** a estratégia base é executada, **Then** o processamento aplica a reflexão e a resposta inclui o trace e as métricas acumuladas da execução refletida.

### User Story 2 - Receber erros de entrada compreensíveis (Priority: P2)

Como consumidor da API, quero receber códigos HTTP e detalhes consistentes quando envio dados inválidos, para corrigir a requisição sem interpretar uma falha genérica.

**Why this priority**: Validação previsível evita chamadas ambíguas ao agente e permite que clientes automatizem o tratamento de erros.

**Independent Test**: Fazer requisições com corpo ausente, `message` inválida e tipos incorretos, sem executar uma estratégia, e verificar status 400 com os `issues` da validação.

**Acceptance Scenarios**:

1. **Given** um corpo ausente ou malformado, **When** `POST /chat` é chamado, **Then** responde 400 com os problemas de validação do corpo.
2. **Given** um corpo sem `message` ou com `message` vazia/não textual, **When** a requisição é validada, **Then** responde 400 contendo os `issues` correspondentes ao campo inválido.
3. **Given** uma estratégia que não existe no registry, **When** a requisição é recebida, **Then** responde 422 identificando a estratégia desconhecida.

### User Story 3 - Encerrar processamento excedente (Priority: P3)

Como consumidor da API, quero que uma execução que exceda o tempo máximo seja encerrada com um erro explícito, para não manter uma requisição HTTP indefinidamente aberta.

**Why this priority**: O limite protege a disponibilidade do serviço e fornece um comportamento operacional previsível para chamadas lentas.

**Independent Test**: Registrar uma estratégia fake que nunca conclui, chamar `POST /chat` e verificar que a API responde 504 após o timeout configurado.

**Acceptance Scenarios**:

1. **Given** uma estratégia que excede 180 segundos, **When** o limite de processamento é atingido, **Then** responde 504 com um erro de timeout.
2. **Given** uma estratégia que termina antes do limite, **When** o resultado fica disponível, **Then** responde normalmente sem emitir erro de timeout.

### Edge Cases

- Um corpo JSON válido com propriedades desconhecidas deve ser rejeitado pela validação, ou seu tratamento deve ser explicitamente consistente com o schema adotado.
- `strategy` ausente deve selecionar `react`; `reflect` ausente deve permanecer desabilitado.
- `reflect` deve ser aceito apenas como booleano; valores textuais ou numéricos devem resultar em 400.
- Uma estratégia válida que falha durante a execução deve usar o tratamento de erro já adotado pela aplicação, sem ser convertida em resposta 200.
- O timeout deve impedir que uma resposta 504 seja seguida por uma segunda resposta quando a estratégia concluir tardiamente.
- O teste de integração deve usar uma estratégia fake determinística e não pode depender de credenciais, rede ou OpenRouter.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST disponibilizar `POST /chat` no servidor HTTP da aplicação.
- **FR-002**: O sistema MUST aceitar um corpo com `message` obrigatório, `strategy` opcional e `reflect` opcional.
- **FR-003**: O sistema MUST validar o corpo de entrada com um schema explícito e rejeitar entradas inválidas antes de executar uma estratégia.
- **FR-004**: O sistema MUST usar `react` quando `strategy` não for informada.
- **FR-005**: O sistema MUST usar um registry central que associe nomes públicos às estratégias disponíveis.
- **FR-006**: O sistema MUST retornar 200 com um objeto contendo `answer`, `trace` e `metrics` quando a execução terminar com sucesso.
- **FR-007**: O sistema MUST preservar no resultado HTTP o trace tipado e as métricas produzidas pela estratégia selecionada.
- **FR-008**: O sistema MUST aplicar `withReflection` à estratégia base quando `reflect` for verdadeiro.
- **FR-009**: O sistema MUST retornar 400 para corpo inválido e incluir os `issues` produzidos pela validação.
- **FR-010**: O sistema MUST retornar 422 quando o nome de estratégia não existir no registry.
- **FR-011**: O sistema MUST encerrar uma execução que ultrapasse 180 segundos e retornar 504 indicando timeout.
- **FR-012**: O sistema MUST impedir respostas duplicadas quando o processamento terminar depois de um timeout.
- **FR-013**: O sistema MUST incluir teste de integração para sucesso, validação, estratégia desconhecida, reflexão e timeout usando uma estratégia fake determinística sem rede.
- **FR-014**: A saída 200 MUST ser validada antes de ser enviada ao cliente, preservando o contrato de `answer`, `trace` e `metrics`.

### Key Entities

- **ChatRequest**: Pedido HTTP com `message`, estratégia opcional e flag opcional de reflexão.
- **ChatResponse**: Resultado público com resposta textual, eventos do trace e métricas da execução.
- **StrategyRegistry**: Catálogo de nomes públicos e estratégias de raciocínio disponíveis para o endpoint.
- **ValidationError**: Erro de entrada que contém os `issues` associados aos campos inválidos.
- **StrategyNotFoundError**: Erro de seleção que identifica o nome de estratégia não registrado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das requisições válidas do teste de integração retornam status 200 e um corpo com `answer`, `trace` e `metrics`.
- **SC-002**: 100% dos corpos inválidos cobertos pelo teste retornam 400 com pelo menos um issue identificável.
- **SC-003**: 100% das estratégias desconhecidas cobertas pelo teste retornam 422 sem iniciar execução de agente.
- **SC-004**: 100% das execuções fake que excedem 180 segundos são encerradas com status 504 e sem resposta duplicada.
- **SC-005**: O teste de integração executa sem rede, credenciais ou dependência de disponibilidade de modelo externo.
- **SC-006**: O tempo de resposta de uma estratégia fake que conclui imediatamente permanece abaixo de 1 segundo em execução local, excluindo inicialização do processo de testes.

## Assumptions

- O servidor Express existente será reutilizado; esta feature não cria autenticação, versionamento ou documentação OpenAPI.
- Os nomes públicos iniciais do registry correspondem às estratégias já disponíveis, incluindo `react` e `plan-and-execute`.
- `strategy` aceita somente nomes registrados; aliases ou seleção por modelo ficam fora do escopo.
- O timeout de 180 segundos é aplicado por requisição e não altera o limite interno de iterações das estratégias.
- A resposta de erro terá uma forma JSON consistente com a convenção existente do servidor, contendo status e detalhes relevantes.
- O teste fake poderá ser injetado no registry ou no servidor sem fazer chamadas ao OpenRouter.
