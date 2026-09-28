# Feature Specification: Refletor de Aprendizado

**Feature Branch**: `006-refletor-aprendizado`

**Created**: 2026-09-24

**Status**: Ready for planning

**Input**: User description: "Refletor de aprendizado: após cada resposta, um withStructuredOutput({ hasLearning, fact }) lê a ultima mensagem do usuário e destila fatos duráveis (nunca pedido pontual, nunca segredo) -> memories.remember assíncrono; tool forget_preference"

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Aprender fatos duráveis após uma resposta (Priority: P1)

Como operador, quero que o copiloto reconheça fatos duráveis que compartilho durante a conversa, para que respostas futuras possam ser personalizadas sem eu repetir preferências ou contexto estável.

**Why this priority**: O aprendizado automático é o objetivo central da funcionalidade e transforma o recall semântico existente em memória útil sem exigir uma ação adicional do usuário.

**Independent Test**: Uma resposta concluída pode ser seguida por uma reflexão com provider fake; um fato durável é salvo para o `userId`, enquanto um pedido pontual e um segredo não são salvos.

**Acceptance Scenarios**:

1. **Given** uma mensagem do usuário que declara uma preferência durável, **When** a resposta é concluída, **Then** o refletor identifica `hasLearning=true` e salva somente o fato normalizado para o usuário.
2. **Given** uma mensagem do usuário que contém apenas um pedido operacional pontual, **When** a resposta é concluída, **Then** o refletor identifica `hasLearning=false` e nenhuma memória é criada.
3. **Given** uma mensagem do usuário com uma credencial, token, segredo ou dado explicitamente sensível, **When** a resposta é concluída, **Then** o fato não é salvo, mesmo que o refletor tenha produzido uma sugestão de aprendizado.

---

### User Story 2 - Executar o aprendizado sem atrasar o chat (Priority: P1)

Como usuário, quero receber a resposta sem esperar a etapa de aprendizado, para que a personalização não aumente a latência percebida do atendimento.

**Why this priority**: O refletor é um pós-processamento; bloquear a resposta degradaria o principal fluxo operacional do copiloto.

**Independent Test**: Com um refletor artificialmente lento, a resposta HTTP é entregue antes da conclusão do aprendizado, e uma falha do refletor não altera a resposta já produzida.

**Acceptance Scenarios**:

1. **Given** uma estratégia que produziu uma resposta válida, **When** o refletor é disparado, **Then** a resposta é retornada sem aguardar o resultado de `remember`.
2. **Given** que o provider estruturado ou o armazenamento falha, **When** o aprendizado assíncrono termina, **Then** o erro é registrado e não derruba nem altera a resposta do usuário.

---

### User Story 3 - Remover uma preferência aprendida (Priority: P2)

Como usuário, quero esquecer uma preferência aprendida, para manter controle sobre o que o copiloto guarda sobre mim.

**Why this priority**: O controle de remoção é necessário para que a memória automática seja reversível e confiável.

**Independent Test**: Dado um fato salvo, a ferramenta `forget_preference` remove-o para o mesmo `userId`; uma tentativa de usar outro usuário não remove a memória.

**Acceptance Scenarios**:

1. **Given** uma preferência pertencente ao usuário atual, **When** `forget_preference` recebe seu identificador, **Then** a preferência deixa de aparecer em recalls futuros.
2. **Given** um identificador inexistente ou pertencente a outro usuário, **When** `forget_preference` é chamado, **Then** nenhuma memória é removida e a ferramenta retorna um resultado explícito de não encontrado.

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right edge cases.
-->

- Se a mensagem não tiver `userId`, o refletor não tenta aprender nem salvar memória.
- Se a última mensagem estiver vazia ou exceder o limite de entrada do refletor, ela é ignorada com resultado `hasLearning=false`.
- Se a saída estruturada não contiver um fato não vazio quando `hasLearning=true`, nenhuma memória é salva.
- Segredos incluem credenciais, tokens, chaves, senhas e outros valores cujo armazenamento possa permitir acesso indevido; eles devem ser rejeitados antes de `remember`.
- Uma falha assíncrona de reflexão ou persistência não pode rejeitar a resposta principal.
- O refletor deve considerar somente a última mensagem do usuário, não o prompt composto com histórico ou memórias.

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: O sistema MUST executar, após uma resposta bem-sucedida, uma reflexão estruturada sobre a última mensagem original do usuário.
- **FR-002**: A reflexão MUST produzir os campos `hasLearning` (booleano) e `fact` (texto opcional), rejeitando saídas que não respeitem essa estrutura.
- **FR-003**: O sistema MUST salvar o fato somente quando `hasLearning=true`, o fato não estiver vazio, houver `userId` e o conteúdo passar pela política de exclusão de pedidos pontuais e segredos.
- **FR-004**: O salvamento MUST usar a operação existente de memória por `userId`, preservando deduplicação e embeddings definidos pela memória semântica.
- **FR-005**: A reflexão e o salvamento MUST ser disparados de modo assíncrono após o início da resposta, sem bloquear a resposta principal.
- **FR-006**: Falhas do refletor, do provider estruturado ou do armazenamento MUST ser observáveis por logging estruturado e MUST NOT alterar o status ou conteúdo da resposta principal.
- **FR-007**: O sistema MUST impedir que pedidos pontuais, comandos operacionais, credenciais, tokens, senhas, chaves e segredos sejam persistidos como memória aprendida.
- **FR-008**: A ferramenta `forget_preference` MUST receber `userId` e `memoryId`, remover somente uma memória pertencente ao usuário e retornar um resultado explícito para remoção ou não encontrado.
- **FR-009**: A ferramenta `forget_preference` MUST validar seus argumentos antes de acessar o armazenamento.
- **FR-010**: O refletor MUST operar apenas sobre a última mensagem do usuário associada à resposta atual e MUST ignorar histórico, memórias recuperadas e mensagens de outras conversas.
- **FR-011**: O fluxo MUST manter inalterados `answer`, `trace`, `conversationId`, `llCalls`, `latencyMs` e `historyMessages` da resposta principal.

### Key Entities *(include if feature involves data)*

- **LearningReflection**: Resultado estruturado da análise pós-resposta, com `hasLearning` e um possível `fact`.
- **Memory**: Fato durável associado a um `userId`, reutilizando a entidade de memória semântica existente.
- **ForgetPreferenceRequest**: Solicitação validada contendo `userId` e `memoryId`.

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: Em testes determinísticos, 100% dos fatos duráveis elegíveis são encaminhados para `remember` e 100% dos pedidos pontuais e segredos são rejeitados.
- **SC-002**: A resposta principal é entregue sem aguardar uma reflexão configurada para durar até 2 segundos além do tempo da estratégia.
- **SC-003**: Uma falha simulada em 100% das chamadas de reflexão não altera o status, conteúdo ou métricas da resposta principal.
- **SC-004**: Após uma reflexão elegível concluída, o fato aparece no recall do mesmo usuário em até uma nova consulta.
- **SC-005**: `forget_preference` remove 100% das memórias válidas solicitadas pelo proprietário e 0 memórias quando chamado por outro usuário.

## Assumptions

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right assumptions based on reasonable defaults
  chosen when the feature description did not specify certain details.
-->

- O `userId` já é fornecido pelo cliente e é a fronteira de isolamento usada pela memória semântica existente.
- A reflexão ocorre somente depois de respostas bem-sucedidas; respostas de erro, timeout ou validação não geram aprendizado.
- O provider estruturado usa o mesmo modelo configurado para o agente, com temperatura determinística, e pode ser substituído por um fake em testes.
- A política de exclusão trata padrões claros de segredo e comandos pontuais como não elegíveis; classificação ambígua prefere não salvar.
- A ferramenta `forget_preference` será disponibilizada às estratégias como ferramenta de domínio, sem criar nesta feature uma nova rota HTTP.
- Logs de falha não incluem a mensagem inteira, o fato ou credenciais.
