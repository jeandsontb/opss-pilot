# Feature Specification: Resiliência de Modelo

**Feature Branch**: `011-resiliencia-modelo`

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "Resiliência de modelo:

- .env: OPENROUTER_MODEL_FALLBACK
- fábrica model.ts: withRetry no primário; withFallbacks([reserva])
- Trace: evento "fallback"; metrics.modelUsed.
- Caso nada funcione, 503"

## User Scenarios & Testing

### User Story 1 - Recuperar falhas transitórias do modelo (Priority: P1)

Como operador de plantão, quero que falhas transitórias do modelo sejam
tentadas novamente para que uma instabilidade momentânea não interrompa uma
resposta operacional.

**Why this priority**: A continuidade da resposta é essencial durante
incidentes, quando indisponibilidade temporária de um provedor é mais provável
e o custo de uma falha é alto.

**Independent Test**: Executar uma chamada com um modelo primário fake que falha
transitoriamente e depois responde; verificar que a resposta final é produzida
sem acionar o modelo reserva.

**Acceptance Scenarios**:

1. **Given** o modelo primário falha de forma transitória, **When** a chamada é
   executada, **Then** o sistema repete a tentativa dentro do limite
   configurado e retorna a resposta quando uma tentativa posterior funciona.
2. **Given** o modelo primário responde na primeira tentativa, **When** a
   chamada é executada, **Then** nenhuma tentativa de fallback é feita e o
   comportamento atual é preservado.
3. **Given** todas as tentativas do primário falham, **When** existe um modelo
   reserva configurado, **Then** o sistema tenta o reserva antes de declarar a
   indisponibilidade.

### User Story 2 - Tornar o fallback observável (Priority: P1)

Como pessoa investigando um incidente, quero saber quando e qual modelo foi
usado para produzir uma resposta para distinguir degradação de comportamento
normal.

**Why this priority**: Sem visibilidade, uma resposta produzida por um modelo
reserva pode ser confundida com uma resposta normal e dificultar diagnóstico,
auditoria e análise de qualidade.

**Independent Test**: Executar cenários de sucesso primário e fallback com
modelos fake; verificar `metrics.modelUsed` e a presença de um evento
`fallback` somente quando houver troca de modelo.

**Acceptance Scenarios**:

1. **Given** o primário responde, **When** a resposta é retornada, **Then**
   `metrics.modelUsed` identifica o modelo primário e não existe evento
   `fallback`.
2. **Given** o primário esgota suas tentativas e o reserva responde, **When** a
   resposta é retornada, **Then** `metrics.modelUsed` identifica o reserva e o
   trace contém um evento `fallback` com origem, destino e motivo.
3. **Given** uma estratégia faz chamadas adicionais de modelo, **When** a
   resposta é consolidada, **Then** a identificação do modelo e o evento de
   fallback permanecem associados à chamada que sofreu a troca sem apagar os
   demais eventos.

### User Story 3 - Responder explicitamente quando todos os modelos falham (Priority: P1)

Como consumidor do endpoint de chat, quero receber um erro explícito quando
nenhum modelo disponível consegue responder para que eu possa sinalizar
indisponibilidade em vez de tratar uma resposta vazia como sucesso.

**Why this priority**: Um erro claro permite retry externo, alerta operacional e
evita decisões baseadas em uma resposta sintética ou incompleta.

**Independent Test**: Configurar primário e reserva fake para falhar em todas as
tentativas e chamar `/chat`; verificar status HTTP 503, corpo de erro validado e
ausência de resposta com formato de sucesso.

**Acceptance Scenarios**:

1. **Given** o primário e o reserva falham em todas as tentativas, **When**
   `/chat` é chamado, **Then** o endpoint responde `503` com erro explícito de
   indisponibilidade do modelo.
2. **Given** nenhum modelo reserva está configurado, **When** o primário falha
   definitivamente, **Then** o endpoint responde `503` sem tentar uma
   configuração inexistente.
3. **Given** a falha ocorre durante uma chamada de roteamento ou estratégia,
   **When** o erro chega à borda HTTP, **Then** o mesmo contrato 503 é aplicado
   sem expor credenciais, prompts internos ou detalhes sensíveis.

## Edge Cases

- `OPENROUTER_MODEL_FALLBACK` ausente deve deixar o primário funcionar
  normalmente e produzir 503 somente quando ele falhar definitivamente.
- Um valor de fallback vazio ou somente com espaços deve ser tratado como não
  configurado e rejeitado antes de criar uma chamada inválida.
- Falhas transitórias não devem gerar um evento `fallback` se a nova tentativa
  do mesmo modelo funcionar.
- O evento `fallback` deve ser emitido uma vez por troca efetiva de modelo,
  mesmo que a chamada reserva também precise de novas tentativas.
- O identificador do modelo usado deve permanecer disponível quando a chamada
  termina com sucesso; em falha total, o erro não deve parecer uma resposta
  válida.
- Erros não relacionados à disponibilidade do modelo devem manter o tratamento
  existente e não ser convertidos silenciosamente em fallback.
- Estratégias fake e testes offline devem poder injetar modelos sem acessar
  OpenRouter.

## Requirements

### Functional Requirements

- **FR-001**: O sistema MUST permitir configurar um modelo reserva por meio de
  `OPENROUTER_MODEL_FALLBACK`.
- **FR-002**: O sistema MUST repetir falhas transitórias do modelo primário
  antes de tentar o modelo reserva.
- **FR-003**: O sistema MUST limitar as tentativas para evitar loops indefinidos
  e não duplicar uma chamada bem-sucedida.
- **FR-004**: Após esgotar as tentativas do primário, o sistema MUST tentar o
  modelo reserva quando ele estiver configurado e válido.
- **FR-005**: O sistema MUST emitir um evento de trace `fallback` em toda troca
  efetiva do primário para o reserva, contendo modelo de origem, modelo de
  destino e motivo não sensível.
- **FR-006**: O sistema MUST incluir `modelUsed` nas métricas de uma resposta
  bem-sucedida, identificando o modelo que produziu a resposta.
- **FR-007**: O sistema MUST acumular chamadas, latência, tokens reais,
  `modelUsed` e eventos de fallback sem remover o trace da estratégia.
- **FR-008**: Quando primário e reserva falharem definitivamente, o endpoint
  `/chat` MUST responder HTTP 503 com corpo de erro validado.
- **FR-009**: Quando não houver reserva configurado, o sistema MUST responder
  HTTP 503 após a falha definitiva do primário, sem executar uma configuração
  inexistente.
- **FR-010**: O sistema MUST preservar o comportamento de sucesso do primário,
  inclusive quando nenhum fallback for necessário.
- **FR-011**: Falhas não classificadas como transitórias ou de disponibilidade
  MUST ser propagadas conforme o tratamento de erros existente, sem fallback
  silencioso.
- **FR-012**: A configuração e os erros MUST NOT expor chaves, prompts
  internos, cabeçalhos ou outros segredos na resposta HTTP ou no trace.
- **FR-013**: O mecanismo MUST permitir testes determinísticos com modelos fake
  e não exigir acesso à rede.

### Key Entities

- **ModelConfiguration**: configuração do modelo primário e, opcionalmente, do
  modelo reserva, sem armazenar chaves em traces ou respostas.
- **ModelAttempt**: uma tentativa de chamada, seu resultado, latência e
  classificação de falha.
- **FallbackEvent**: evento auditável de troca entre modelos, com origem,
  destino e motivo sanitizado.
- **ModelMetrics**: métricas da resposta, incluindo `llCalls`, latência, tokens
  reais e `modelUsed`.
- **ModelUnavailableError**: erro de domínio traduzido para HTTP 503 quando
  nenhum modelo consegue produzir uma resposta.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% das falhas transitórias simuladas do primário são
  reintentadas dentro do limite definido, sem loops infinitos.
- **SC-002**: 100% das trocas efetivas para o reserva registram exatamente um
  evento `fallback` com origem, destino e motivo não sensível.
- **SC-003**: 100% das respostas bem-sucedidas informam `modelUsed` igual ao
  modelo que efetivamente produziu a resposta.
- **SC-004**: 100% dos cenários de falha total retornam HTTP 503 e nenhum
  cenário retorna corpo de sucesso vazio ou sintético.
- **SC-005**: O caminho de sucesso do primário mantém as métricas e traces
  anteriores quando nenhum fallback é necessário.
- **SC-006**: A suíte offline cobre retry, sucesso primário, fallback,
  ausência de reserva, falha total, sanitização e integração HTTP.

## Assumptions

- O valor de `OPENROUTER_MODEL_FALLBACK` é um identificador de modelo já
  disponível no mesmo provedor do primário.
- O limite e a classificação de retry seguem os padrões já usados pela fábrica
  de modelos e podem ser parametrizados para testes sem alterar a configuração
  pública.
- O fallback aplica-se às chamadas de roteamento, estratégias e reflection que
  utilizam a fábrica compartilhada.
- `modelUsed` identifica o nome lógico do modelo, não a chave ou credenciais
  usadas para acessá-lo.
- HTTP 503 é o contrato único para indisponibilidade total do modelo nesta
  versão; detalhes de retry externo ficam fora do escopo.
- Persistência de tentativas e dashboards de métricas fora do trace da resposta
  ficam fora do escopo.
