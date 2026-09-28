# Feature Specification: Conversas Persistentes

**Feature Branch**: `004-persistent-conversations`

**Created**: 2026-09-24

**Status**: Draft

**Input**: User description: "Conversa persistente: ConversationStore (append/lastMessages/create) + tabela messages como no PostgresOpssStore; /chat: conversationId opcional, devolvido na resposta; 12 últimas mensagens no prompt via composição; métrica historyMessages; testes ':memory:' + fake"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Continuar uma conversa de plantão (Priority: P1)

Como plantonista, quero enviar mensagens relacionadas à mesma conversa e permitir que o copiloto use o contexto recente para responder de forma coerente.

**Why this priority**: A continuidade é essencial para investigar um incidente em várias interações sem repetir todo o contexto.

**Independent Test**: Criar uma conversa em um armazenamento em memória, adicionar mensagens e executar duas requisições fake usando o mesmo `conversationId`, verificando que a segunda recebe as mensagens anteriores.

**Acceptance Scenarios**:

1. **Given** uma requisição sem `conversationId`, **When** `POST /chat` é processado, **Then** uma conversa é criada e seu identificador é devolvido na resposta.
2. **Given** um `conversationId` existente, **When** uma nova mensagem é enviada, **Then** a mensagem é associada à mesma conversa e o histórico recente é usado na composição do prompt.
3. **Given** uma conversa com mensagens anteriores, **When** o agente responde, **Then** a resposta mantém o contrato existente de `answer`, `trace` e `metrics` e inclui `conversationId`.

### User Story 2 - Persistir e recuperar mensagens (Priority: P2)

Como sistema, quero armazenar mensagens de usuário e do assistente e recuperar apenas o contexto recente para manter conversas persistentes e prompts limitados.

**Why this priority**: A separação do armazenamento permite trocar a implementação em memória por SQLite sem alterar o contrato do endpoint.

**Independent Test**: Usar um armazenamento `:memory:`, criar uma conversa, executar `append` para mensagens de usuário e assistente e verificar `lastMessages` em ordem cronológica.

**Acceptance Scenarios**:

1. **Given** um armazenamento vazio, **When** `create` é chamado, **Then** retorna um identificador único de conversa persistível.
2. **Given** mensagens anexadas a uma conversa, **When** `lastMessages` é chamado com limite 12, **Then** retorna no máximo as 12 mensagens mais recentes em ordem de composição.
3. **Given** mensagens de conversas diferentes, **When** o histórico de uma conversa é consultado, **Then** nenhuma mensagem de outra conversa é retornada.
4. **Given** um identificador inexistente, **When** uma mensagem é anexada ou o histórico é consultado, **Then** o sistema retorna um erro de domínio explícito, sem criar dados silenciosamente.

### User Story 3 - Medir o contexto usado (Priority: P3)

Como operador, quero saber quantas mensagens históricas foram usadas em cada resposta para acompanhar o custo e a qualidade do contexto enviado ao agente.

**Why this priority**: A métrica torna visível o impacto do histórico na execução e permite validar o limite de contexto.

**Independent Test**: Executar o endpoint com zero, cinco e mais de doze mensagens anteriores e verificar `metrics.historyMessages` com os valores 0, 5 e 12.

**Acceptance Scenarios**:

1. **Given** uma conversa sem histórico anterior, **When** o agente responde, **Then** `historyMessages` é 0.
2. **Given** uma conversa com cinco mensagens anteriores, **When** o agente responde, **Then** `historyMessages` é 5.
3. **Given** uma conversa com mais de doze mensagens anteriores, **When** o agente responde, **Then** somente 12 mensagens são compostas e `historyMessages` é 12.

### Edge Cases

- Uma requisição sem `conversationId` deve criar exatamente uma nova conversa para aquela execução.
- Um `conversationId` vazio, inválido ou com tipo incorreto deve ser rejeitado antes de consultar o armazenamento.
- O limite de histórico é 12 mensagens, mesmo quando existem mais mensagens persistidas.
- A mensagem atual do usuário não deve ser contada como mensagem histórica.
- Falhas ao persistir a mensagem não podem produzir resposta 200 com histórico incompleto.
- A mensagem do usuário e a resposta do assistente devem permanecer na mesma conversa quando a execução termina com sucesso.
- O teste de integração deve usar armazenamento `:memory:` e estratégia fake determinística, sem rede, credenciais ou OpenRouter.
- O campo `historyMessages` deve coexistir com `llCalls` e `latencyMs`, sem substituir métricas existentes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST oferecer um `ConversationStore` com operações `create`, `append` e `lastMessages`.
- **FR-002**: O sistema MUST persistir mensagens associadas a uma conversa, distinguindo ao menos mensagens do usuário e do assistente.
- **FR-003**: O armazenamento MUST fornecer uma tabela `messages` com identificador da mensagem, identificador da conversa, papel, conteúdo e ordenação temporal.
- **FR-004**: O sistema MUST suportar uma implementação de armazenamento em memória compatível com testes `:memory:`.
- **FR-005**: O endpoint `POST /chat` MUST aceitar `conversationId` opcional além de `message`, `strategy` e `reflect`.
- **FR-006**: O endpoint MUST criar uma conversa quando `conversationId` não for informado.
- **FR-007**: O endpoint MUST reutilizar a conversa indicada por um `conversationId` válido e retornar esse identificador em toda resposta 200.
- **FR-008**: Antes de executar a estratégia, o sistema MUST compor o prompt com no máximo as 12 mensagens anteriores da conversa, em ordem cronológica.
- **FR-009**: A composição MUST deixar explícita a separação entre histórico e mensagem atual para a estratégia.
- **FR-010**: O sistema MUST registrar a mensagem atual do usuário e a resposta do assistente na conversa após uma execução bem-sucedida.
- **FR-011**: A resposta 200 MUST conter `conversationId`, `answer`, `trace` e `metrics`.
- **FR-012**: `metrics` MUST preservar `llCalls` e `latencyMs` e MUST incluir `historyMessages`.
- **FR-013**: `historyMessages` MUST representar a quantidade efetiva de mensagens históricas compostas no prompt, limitada a 12.
- **FR-014**: O sistema MUST validar `conversationId`, a requisição e a resposta na fronteira HTTP.
- **FR-015**: O sistema MUST retornar erro explícito para conversa inexistente ou falha de persistência, sem produzir um sucesso falso.
- **FR-016**: Os testes MUST cobrir `create`, `append`, `lastMessages`, continuidade via `conversationId`, limite de 12 mensagens, métrica `historyMessages` e persistência de usuário/assistente usando fake determinístico e armazenamento `:memory:`.

### Key Entities

- **Conversation**: Identificador lógico que agrupa as mensagens de uma sessão de plantão.
- **Message**: Conteúdo persistido de uma interação, com papel de usuário ou assistente, conversa associada e ordem temporal.
- **ConversationStore**: Contrato de persistência para criar conversas, anexar mensagens e recuperar o histórico recente.
- **ComposedPrompt**: Entrada enviada à estratégia contendo o histórico limitado e a mensagem atual.
- **ChatResponse**: Resultado HTTP acrescido de `conversationId` e da métrica `historyMessages`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das requisições fake sem `conversationId` retornam um `conversationId` utilizável.
- **SC-002**: 100% das requisições fake com `conversationId` válido reutilizam a conversa e preservam a ordem das mensagens.
- **SC-003**: Em todos os testes com mais de 12 mensagens anteriores, exatamente 12 mensagens são usadas no prompt e reportadas em `historyMessages`.
- **SC-004**: 100% dos testes de armazenamento `:memory:` passam sem rede, credenciais ou serviço externo.
- **SC-005**: 100% das respostas bem-sucedidas preservam `answer`, `trace`, `llCalls` e `latencyMs`, adicionando `conversationId` e `historyMessages`.
- **SC-006**: Mensagens persistidas por uma conversa nunca aparecem no histórico de outra conversa nos testes de isolamento.

## Assumptions

- O papel da mensagem será limitado a `user` e `assistant` nesta primeira versão; eventos detalhados do trace não serão persistidos como mensagens separadas.
- O limite de 12 considera mensagens anteriores à mensagem atual, independentemente do papel.
- A criação automática de conversa ocorre somente quando `conversationId` estiver ausente; identificadores informados devem existir.
- A persistência SQLite seguirá o padrão de armazenamento local usado pelo projeto, enquanto os testes usarão uma implementação isolada em memória.
- Não haverá autenticação, compartilhamento de conversa ou expiração automática nesta feature.
- Falhas de estratégia não persistem uma resposta de assistente parcial.
