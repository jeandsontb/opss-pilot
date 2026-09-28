# Feature Specification: Sumarização de Histórico (Pruning)

**Feature Branch**: `008-summary-pruning`

**Created**: 2026-09-24

**Status**: Ready for planning

**Input**: User description: "Sumarização de histórico (pruning): tabela conversation_summaries; o que sai das 8 mensagens recentes vira resumo de ~150 tokens preservando decisões, fatos e pendências, MESCLADO ao resumo anterior e persistido - refeito só quando 8 novas saem da janela, nunca a cada request. Resumo entra no contexto; evento 'summarize'. Com teste fake"

## User Scenarios & Testing

### User Story 1 - Preservar contexto antigo em resumo (Priority: P1)

Como operador, quero que conversas longas mantenham decisões, fatos e pendências antigas mesmo depois que as mensagens saiam da janela recente, para que o copiloto continue respondendo com contexto útil.

**Why this priority**: Sem o resumo, o limite de mensagens recentes elimina informações importantes e causa respostas inconsistentes em conversas prolongadas.

**Independent Test**: Uma conversa com mais de oito mensagens pode ser executada com um sumarizador fake e o histórico removido é convertido em um resumo persistido, que aparece no próximo contexto.

**Acceptance Scenarios**:

1. **Given** uma conversa com mensagens além das oito mais recentes, **When** o chat processa o próximo turno, **Then** as mensagens removidas são resumidas preservando decisões, fatos e pendências relevantes.
2. **Given** um resumo anterior e oito novas mensagens removidas, **When** a sumarização ocorre, **Then** o novo resumo incorpora o resumo anterior em vez de substituí-lo.
3. **Given** uma conversa ainda sem oito novas mensagens removidas desde o último resumo, **When** o chat recebe uma nova requisição, **Then** nenhum novo resumo é gerado.

### User Story 2 - Expor sumarização no trace e no armazenamento (Priority: P1)

Como operador, quero identificar quando o histórico foi sumarizado e consultar o resumo persistido, para auditar a redução de contexto e diagnosticar respostas.

**Why this priority**: O evento explícito torna a alteração de contexto observável e o armazenamento garante que o resumo sobreviva entre requisições.

**Independent Test**: Um teste com dependências fake verifica o registro em `conversation_summaries`, a reutilização do resumo e um evento tipado `summarize` no trace da resposta que disparou a operação.

**Acceptance Scenarios**:

1. **Given** uma sumarização concluída, **When** a resposta é produzida, **Then** o trace contém um evento `summarize` indicando que mensagens antigas foram compactadas.
2. **Given** um resumo persistido para uma conversa, **When** uma nova resposta é gerada, **Then** o resumo é incluído no contexto antes da mensagem atual e das mensagens recentes.
3. **Given** falha no sumarizador, **When** o chat tenta compactar o histórico, **Then** o erro é explícito e o sistema não grava um resumo parcial ou inválido.

### User Story 3 - Controlar custo de sumarização (Priority: P2)

Como responsável pela operação, quero que a sumarização seja limitada a aproximadamente 150 tokens e não seja executada a cada requisição, para reduzir custo sem perder o controle do contexto.

**Why this priority**: O valor da feature depende de reduzir o crescimento do prompt e de evitar chamadas extras desnecessárias.

**Independent Test**: Um cenário determinístico conta chamadas ao sumarizador ao longo de vários turnos e confirma que só há uma chamada por grupo de oito mensagens removidas, com saída limitada ao tamanho acordado.

**Acceptance Scenarios**:

1. **Given** um conjunto de mensagens removidas, **When** o sumarizador é chamado, **Then** sua saída respeita o alvo aproximado de 150 tokens e contém somente informações de contexto durável.
2. **Given** sete ou menos mensagens novas removidas desde o último resumo, **When** novas requisições são processadas, **Then** a contagem de chamadas de sumarização permanece inalterada.
3. **Given** dezesseis mensagens novas removidas desde o último resumo, **When** a conversa é processada, **Then** a sumarização ocorre em duas unidades de oito, sem gerar uma chamada por request.

## Edge Cases

- Conversas com menos de oito mensagens não geram resumo.
- Uma conversa existente sem resumo anterior usa um resumo vazio como base.
- Mensagens vazias ou inválidas não entram na janela nem no resumo.
- O resumo deve permanecer associado à conversa correta e nunca vazar para outra conversa.
- Se o resumo fake retornar conteúdo vazio, a operação falha explicitamente e não persiste uma versão vazia.
- Se houver mais de oito mensagens fora da janela, cada bloco completo de oito deve ser contabilizado; mensagens restantes aguardam o próximo gatilho.
- A sumarização não deve remover as oito mensagens recentes usadas no contexto atual.

## Requirements

### Functional Requirements

- **FR-001**: O sistema MUST persistir um resumo por conversa na entidade `conversation_summaries`, incluindo identificador da conversa, conteúdo do resumo, contagem de mensagens incorporadas e timestamps.
- **FR-002**: O sistema MUST manter as oito mensagens mais recentes como janela ativa do contexto.
- **FR-003**: O sistema MUST selecionar mensagens que saíram da janela recente em blocos de oito para sumarização.
- **FR-004**: O sistema MUST gerar um resumo com alvo aproximado de 150 tokens, preservando decisões, fatos e pendências e descartando detalhes transitórios sem valor futuro.
- **FR-005**: Quando já existir resumo, o sistema MUST mesclar o resumo anterior com o novo bloco antes de persistir a versão atualizada.
- **FR-006**: O sistema MUST disparar nova sumarização somente quando oito mensagens adicionais tiverem saído da janela desde a última sumarização, nunca em toda requisição por padrão.
- **FR-007**: O sistema MUST incluir o resumo persistido no contexto antes do histórico recente e da mensagem atual.
- **FR-008**: O trace MUST aceitar e emitir um evento tipado `summarize` com informação suficiente para identificar a compactação realizada.
- **FR-009**: O sistema MUST manter isolamento por `conversationId`, impedindo que resumos sejam lidos ou gravados em outra conversa.
- **FR-010**: Falhas do sumarizador MUST ser traduzidas em erro explícito, sem persistir conteúdo parcial e sem ocultar a causa na camada de serviço.
- **FR-011**: A interface de sumarização MUST ser substituível por uma implementação fake para testes sem rede.
- **FR-012**: Entradas e saídas externas do armazenamento e da fronteira HTTP MUST ser validadas com os schemas já adotados pelo projeto.
- **FR-013**: Os testes MUST cobrir janela de oito mensagens, persistência, mesclagem, limiar de oito novas mensagens, evento `summarize`, isolamento e falha do sumarizador.

### Key Entities

- **ConversationSummary**: Resumo persistido de uma conversa, com `id`, `conversationId`, `summary`, `summarizedMessageCount`, `createdAt` e `updatedAt`.
- **SummaryInput**: Bloco de mensagens antigas e resumo anterior usado para produzir o próximo resumo.
- **SummarizeTraceEvent**: Evento de trace que registra a compactação, incluindo quantidade de mensagens processadas e indicação de resumo atualizado.
- **ConversationContext**: Contexto composto pelo resumo persistido, pelas oito mensagens recentes e pela mensagem atual.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Em 100% dos testes com oito mensagens removidas, um resumo válido é persistido e aparece no contexto subsequente.
- **SC-002**: Em uma sequência de requisições sem oito novas mensagens removidas, a sumarização é chamada zero vezes após o resumo mais recente.
- **SC-003**: Em uma sequência com dezesseis mensagens removidas, são realizadas no máximo duas sumarizações, nunca uma por request, e o resumo final incorpora o anterior.
- **SC-004**: 100% das respostas que realizam pruning registram um evento `summarize` no trace.
- **SC-005**: 100% dos testes de isolamento confirmam que resumos de uma conversa não alteram o contexto de outra.
- **SC-006**: Falhas do sumarizador deixam o armazenamento sem resumo parcial e produzem erro observável para o consumidor da operação.
- **SC-007**: O resumo gerado permanece próximo do alvo de 150 tokens conforme a tolerância definida pelos testes fake, sem impedir a preservação dos três tipos de informação durável.
- **SC-008**: A janela recente continua limitada a oito mensagens, reduzindo o histórico enviado ao modelo sem alterar a ordem das mensagens recentes.

## Assumptions

- A janela de oito mensagens substitui o limite anterior de histórico para o contexto que será sumarizado; mensagens recentes continuam sendo armazenadas integralmente.
- O gatilho é baseado em mensagens que ficaram fora da janela desde o último resumo, não em quantidade de requisições.
- Um bloco pode conter mensagens de usuário e assistente; ambas são relevantes para decisões, fatos e pendências.
- A contagem persistida mede mensagens incorporadas no resumo, permitindo calcular quantas novas mensagens já saíram da janela.
- O resumo é texto em linguagem natural e a validação de aproximadamente 150 tokens pode usar uma estimativa determinística em testes, não faturamento real.
- A primeira versão não exige recuperação ou edição manual de resumos por endpoint separado.
- A operação de sumarização pode adicionar chamadas de modelo às métricas da resposta, mas não altera o comportamento das estratégias além do contexto e do trace.
- O armazenamento deve permitir implementação SQLite em produção e uma implementação em memória para testes determinísticos.

