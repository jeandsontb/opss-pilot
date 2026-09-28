# Feature Specification: Observabilidade Persistida

**Feature Branch**: `012-observabilidade-persistida`

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "Trace persistido + logs JSON:

- /chat: requestId no corpo e no header X-Request-Id.
- SQLite: requests (métricas) e trace_events (node, payloads).
- src/obs/logger.ts: 1 linha JSON por evento, só metadados.
- GET /requests/:id registro + trace ordenado."

## User Scenarios & Testing

### User Story 1 - Identificar cada requisição de chat (Priority: P1)

Como operador de plantão, quero que cada chamada de chat tenha um identificador
correlacionável para localizar a resposta e investigar um incidente específico.

**Why this priority**: Sem um identificador estável, não é possível relacionar
uma resposta HTTP, seus eventos e seus logs de forma confiável.

**Independent Test**: Enviar uma chamada válida a `/chat` e verificar que o
mesmo `requestId` aparece no corpo da resposta e no header `X-Request-Id`.

**Acceptance Scenarios**:

1. **Given** uma chamada válida sem identificador informado, **When** `/chat`
   responde, **Then** o sistema gera um `requestId` não vazio e o retorna no
   corpo e no header `X-Request-Id`.
2. **Given** uma chamada válida com `requestId` informado no corpo, **When**
   `/chat` responde, **Then** o sistema preserva esse identificador no corpo e
   no header, desde que ele seja válido.
3. **Given** um `requestId` vazio ou inválido, **When** a chamada é recebida,
   **Then** a entrada é rejeitada com erro de validação sem criar um registro
   parcial.

---

### User Story 2 - Persistir métricas e trace de execução (Priority: P1)

Como pessoa investigando um incidente, quero consultar as métricas e o trace
completo de uma requisição depois que ela termina para reconstruir o que
aconteceu.

**Why this priority**: A investigação operacional depende de dados persistidos,
inclusive quando a resposta já não está disponível no processo que a produziu.

**Independent Test**: Executar uma estratégia fake determinística, consultar a
persistência pelo `requestId` e verificar métricas, eventos, nós e payloads sem
acesso à rede.

**Acceptance Scenarios**:

1. **Given** uma execução concluída com trace, **When** ela é persistida, **Then**
   existe um registro de requisição com métricas e os eventos mantêm sua ordem
   original.
2. **Given** eventos de nós diferentes, **When** o trace é consultado, **Then**
   cada evento informa seu `node` e seus payloads tipados sem perder eventos.
3. **Given** uma falha durante a execução, **When** a requisição termina,
   **Then** o registro mantém o `requestId`, o estado de erro e os metadados
   disponíveis, sem persistir segredos ou mensagens sensíveis.

---

### User Story 3 - Consultar execução e logs estruturados (Priority: P1)

Como operador de plantão, quero consultar uma execução por identificador e
receber logs estruturados para automatizar diagnóstico e auditoria.

**Why this priority**: Uma consulta única e logs legíveis por máquina reduzem o
tempo para encontrar falhas e permitem integração com ferramentas operacionais.

**Independent Test**: Persistir uma execução fake, chamar `GET /requests/:id` e
verificar o registro, o trace ordenado e linhas JSON contendo apenas metadados.

**Acceptance Scenarios**:

1. **Given** um `requestId` persistido, **When** `GET /requests/:id` é chamado,
   **Then** a resposta contém o registro de métricas e o trace ordenado por
   sequência de emissão.
2. **Given** um `requestId` inexistente, **When** a consulta é chamada, **Then**
   o endpoint responde 404 com corpo validado e sem detalhes internos.
3. **Given** um evento de execução, **When** ele é registrado, **Then** o logger
   emite exatamente uma linha JSON contendo apenas metadados permitidos, como
   `requestId`, tipo, nó, timestamp e duração.

### Edge Cases

- Um `requestId` repetido não deve sobrescrever silenciosamente uma execução
  anterior; a política padrão é rejeitar o conflito com erro explícito.
- Uma resposta 4xx de validação não cria um registro de execução incompleto.
- Uma falha 5xx ainda deve persistir o máximo de métricas e trace disponível,
  mas não deve transformar a falha em resposta de sucesso.
- Payloads de trace ausentes ou não serializáveis devem ser representados de
  forma validada, sem derrubar o endpoint de consulta.
- O trace retornado deve permanecer ordenado mesmo quando eventos são gravados
  em momentos distintos.
- Logs e payloads não devem conter `OPENROUTER_API_KEY`, prompts internos,
  headers de autenticação, tokens ou mensagens brutas de provedores.

## Requirements

### Functional Requirements

- **FR-001**: O sistema MUST aceitar um `requestId` opcional no corpo de
  `/chat` e gerar um identificador único quando ele não for informado.
- **FR-002**: O sistema MUST retornar o `requestId` no corpo de toda resposta de
  `/chat` e no header `X-Request-Id`.
- **FR-003**: O sistema MUST validar o `requestId` na fronteira HTTP como uma
  string não vazia, limitada a 128 caracteres e sem conteúdo de controle.
- **FR-004**: O sistema MUST persistir um registro `requests` por execução,
  incluindo identificador, estado, timestamps, resposta de erro sanitizada e
  métricas disponíveis.
- **FR-005**: O sistema MUST persistir cada evento em `trace_events`, incluindo
  `requestId`, sequência, tipo, `node` e payload validado.
- **FR-006**: O sistema MUST preservar a ordem de emissão dos eventos ao
  persistir e consultar um trace.
- **FR-007**: O sistema MUST fornecer `GET /requests/:id` com o registro da
  requisição e o trace ordenado.
- **FR-008**: O sistema MUST responder 404 para identificadores inexistentes
  sem expor detalhes de armazenamento.
- **FR-009**: O sistema MUST emitir uma linha JSON por evento em
  `src/obs/logger.ts`, contendo apenas metadados permitidos e sem segredos.
- **FR-010**: O sistema MUST incluir no registro métricas como `llCalls`,
  `latencyMs`, `promptTokens` quando disponíveis e `modelUsed` quando houver.
- **FR-011**: O sistema MUST persistir falhas com estado e erro sanitizado sem
  retornar um formato de sucesso indevido.
- **FR-012**: O armazenamento local MUST funcionar deterministicamente em testes
  offline e manter isolamento entre requisições.
- **FR-013**: O sistema MUST rejeitar conflito de `requestId` explicitamente,
  sem sobrescrever a execução anterior.
- **FR-014**: O sistema MUST validar as respostas de `/chat` e
  `GET /requests/:id` antes de enviá-las.

### Key Entities

- **RequestRecord**: uma execução de `/chat`, identificada por `requestId`, com
  estado, timestamps, erro sanitizado e métricas.
- **TraceEventRecord**: evento tipado associado a uma requisição, com sequência,
  tipo, nó e payload serializável.
- **StructuredLogEvent**: metadados permitidos de um evento emitido como uma
  única linha JSON.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% das respostas válidas de `/chat` exibem o mesmo `requestId`
  no corpo e no header `X-Request-Id`.
- **SC-002**: 100% das execuções concluídas em teste têm seu registro e todos os
  eventos recuperáveis por `GET /requests/:id` na ordem original.
- **SC-003**: 100% das consultas de identificadores inexistentes retornam 404
  com corpo validado e sem detalhes internos.
- **SC-004**: 100% das linhas produzidas pelo logger são JSON válido de uma linha
  e não contêm credenciais, prompts internos ou tokens.
- **SC-005**: Pelo menos 99% das execuções que falham persistem estado e
  metadados disponíveis sem impedir a sinalização da falha ao consumidor.
- **SC-006**: A consulta de um trace local com até 1.000 eventos retorna os
  eventos completos e ordenados em menos de 200 ms em testes de referência.

## Assumptions

- O armazenamento SQLite é local à aplicação e pode usar uma conexão ou banco
  temporário injetável nos testes.
- O `requestId` enviado no corpo tem precedência sobre qualquer identificador
  gerado internamente; não há suporte adicional a um header de entrada nesta
  versão.
- A retenção e expurgo de registros estão fora do escopo desta feature.
- Payloads persistidos representam apenas dados de trace já sanitizados pela
  aplicação.
- O endpoint de consulta exige apenas o identificador e não adiciona paginação
  nesta primeira versão.
