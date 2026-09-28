# Feature Specification: Instrumentação de Tokens e Contexto

**Feature Branch**: `007-instrumenta-tokens-contexto`

**Created**: 2026-09-24

**Status**: Ready for planning

**Input**: User description: "Instrumente a medição de contexto: src/context/tokens.ts com estimateTokens (chars/4) e o usage real do LangChain; métricas do /chat com promptTokens real e contextBreakdown estimado por fontes; conversa-longa.sh imprime o promptTokens por turno. Com testes"

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

### User Story 1 - Medir tokens reais no chat (Priority: P1)

Como operador, quero saber quantos tokens de prompt foram realmente enviados ao modelo, para avaliar custo, contexto e comportamento de conversas longas.

**Why this priority**: O uso real do modelo é a fonte mais confiável para acompanhar consumo e deve estar disponível diretamente na resposta do `/chat`.

**Independent Test**: Uma estratégia fake que expõe metadados de uso produz uma resposta HTTP cujo `metrics.promptTokens` corresponde ao uso real reportado, sem depender de rede.

**Acceptance Scenarios**:

1. **Given** uma chamada de modelo com uso de prompt disponível, **When** o chat termina, **Then** a resposta inclui `metrics.promptTokens` com o valor real reportado.
2. **Given** uma estratégia composta por várias chamadas de modelo, **When** o chat termina, **Then** `promptTokens` representa a soma das chamadas relevantes da execução.
3. **Given** uma estratégia sem metadados de uso, **When** o chat termina, **Then** o campo permanece explícito como indisponível ou segue o fallback documentado, sem apresentar um valor real inventado.

---

### User Story 2 - Decompor o contexto por fonte (Priority: P1)

Como operador, quero visualizar uma estimativa de tokens por fonte do contexto, para identificar se o crescimento vem da mensagem atual, histórico ou memórias recuperadas.

**Why this priority**: A decomposição transforma uma métrica agregada em uma ferramenta de diagnóstico para prompts extensos.

**Independent Test**: Dado um prompt composto com mensagem, histórico e memórias conhecidas, a decomposição retorna cada fonte usando a regra documentada de caracteres divididos por quatro.

**Acceptance Scenarios**:

1. **Given** mensagem atual, histórico e memórias no prompt, **When** o chat calcula as métricas, **Then** `contextBreakdown` contém contagens estimadas separadas para cada fonte.
2. **Given** uma fonte vazia, **When** as métricas são geradas, **Then** sua contagem é zero e as demais fontes permanecem inalteradas.
3. **Given** fontes com caracteres Unicode, **When** a estimativa é calculada, **Then** a regra é aplicada de modo determinístico conforme a contagem de caracteres do runtime.

---

### User Story 3 - Acompanhar crescimento em conversas longas (Priority: P2)

Como desenvolvedor, quero executar um cenário de conversa longa e ver `promptTokens` por turno, para detectar crescimento inesperado de contexto e regressões.

**Why this priority**: O script de diagnóstico torna a medição repetível e facilita comparar mudanças no limite de histórico.

**Independent Test**: O script executa múltiplos turnos contra uma estratégia determinística e imprime uma linha por turno com o valor de `promptTokens`.

**Acceptance Scenarios**:

1. **Given** uma conversa com vários turnos, **When** o script é executado, **Then** cada turno imprime seu índice e `promptTokens`.
2. **Given** uma resposta sem uso real disponível, **When** o script processa o turno, **Then** imprime um marcador explícito para indisponibilidade em vez de um número enganoso.

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right edge cases.
-->

- O provedor pode não devolver metadados de uso; isso deve ser distinguido de zero tokens.
- O uso pode aparecer em formatos diferentes entre mensagens e modelos; somente campos validados devem ser considerados.
- Estratégias que fazem fallback de modelo não devem perder ou duplicar o uso já observado.
- O cálculo estimado não deve substituir o uso real quando o uso real existir.
- O script deve continuar reportando turnos posteriores quando um turno individual falhar, se isso for suportado pelo cenário.
- A decomposição é estimativa diagnóstica e não precisa somar exatamente ao uso real.

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: O sistema MUST expor uma função `estimateTokens` que estime tokens como caracteres divididos por quatro, com resultado determinístico e não negativo.
- **FR-002**: O sistema MUST extrair e validar o uso real de prompt reportado pelo LangChain sem confundir ausência de metadados com zero.
- **FR-003**: A resposta do `/chat` MUST incluir `metrics.promptTokens` quando houver uso real disponível.
- **FR-004**: O sistema MUST somar `promptTokens` de chamadas de modelo pertencentes à mesma execução do chat, sem contar duas vezes uma mesma chamada.
- **FR-005**: A resposta do `/chat` MUST incluir `metrics.contextBreakdown` com estimativas separadas para mensagem atual, histórico da conversa e memórias relevantes.
- **FR-006**: O sistema MUST aplicar a estimativa `chars/4` a cada fonte de forma independente e documentar os nomes e unidades dos campos.
- **FR-007**: O uso real MUST ter precedência sobre qualquer estimativa no campo `promptTokens`.
- **FR-008**: O script `conversa-longa.sh` MUST imprimir o número de `promptTokens` por turno e um marcador explícito quando o valor estiver indisponível.
- **FR-009**: Toda entrada de uso externo e toda saída HTTP alterada MUST ser validada com o padrão de schemas do projeto.
- **FR-010**: Testes MUST cobrir estimativa determinística, uso real, ausência de uso, soma de múltiplas chamadas, decomposição por fonte e saída do script sem rede.

### Key Entities *(include if feature involves data)*

- **TokenUsage**: Uso validado de uma chamada de modelo, incluindo prompt tokens quando disponível.
- **ContextBreakdown**: Estimativas de tokens por fonte, incluindo mensagem atual, histórico e memórias.
- **ChatMetrics**: Métricas existentes do chat acrescidas de `promptTokens` e `contextBreakdown`.
- **LongConversationRun**: Saída diagnóstica por turno do script de conversa longa.

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: 100% das respostas de chat com uso real válido expõem o mesmo `promptTokens` reportado pelo modelo, sem substituição por estimativa.
- **SC-002**: 100% das execuções determinísticas sem uso real distinguem `indisponível` de zero.
- **SC-003**: 100% dos prompts compostos testados apresentam decomposição não negativa e determinística para mensagem, histórico e memórias.
- **SC-004**: O script de conversa longa imprime uma linha de métricas para cada turno concluído.
- **SC-005**: A instrumentação não altera `answer`, trace, `llCalls`, `latencyMs`, `historyMessages` ou o status HTTP existentes.

## Assumptions

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right assumptions based on reasonable defaults
  chosen when the feature description did not specify certain details.
-->

- O runtime LangChain continua sendo a fonte do uso real quando os metadados estão disponíveis.
- `promptTokens` ausente será representado como `null` na resposta HTTP, para não confundir ausência com zero.
- `contextBreakdown` usará os campos `currentMessage`, `history` e `memories`, todos em tokens estimados.
- O script será um artefato de diagnóstico local e usará uma estratégia fake nos testes para evitar OpenRouter.
- A instrumentação não introduz persistência adicional nem altera o limite de 12 mensagens.
