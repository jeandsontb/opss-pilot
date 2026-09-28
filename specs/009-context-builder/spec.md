# Feature Specification: ContextBuilder com Orçamento por Seção

**Feature Branch**: `009-context-builder`

**Created**: 2026-09-25

**Status**: Ready for planning

**Input**: User description: "ContextBuilder com orçamento por seção: src/context/context-builder.ts monta o prompt de TODAS as estratégias com teto por seção via env CONTEXT_BUDGET_*: system e mensagem intocáveis, resumo 200, janela 1200 (corta as mais antigas), memórias 300 (corta menor score). Teste: tetos baixos cortam na ordem certa"

## User Scenarios & Testing

### User Story 1 - Construir contexto único para todas as estratégias (Priority: P1)

Como operador, quero que todas as estratégias recebam o mesmo contexto montado pelo sistema, para que limites de contexto sejam aplicados de forma consistente e previsível.

**Why this priority**: Sem um construtor compartilhado, cada estratégia pode enviar fontes diferentes ou ignorar limites, causando comportamento e custo inconsistentes.

**Independent Test**: Uma estratégia fake de cada tipo recebe o prompt produzido pelo `ContextBuilder` e os prompts têm a mesma ordem de seções e as mesmas fontes preservadas.

**Acceptance Scenarios**:

1. **Given** system, resumo, janela, memórias e mensagem atual, **When** qualquer estratégia é executada, **Then** o prompt é construído pelo mesmo contrato de seções.
2. **Given** budgets configurados, **When** o contexto é construído, **Then** todas as estratégias respeitam os mesmos tetos sem alterar system ou mensagem.
3. **Given** nenhuma memória ou resumo disponível, **When** o prompt é construído, **Then** as seções permanecem válidas e indicam ausência sem erro.

### User Story 2 - Aplicar cortes determinísticos por seção (Priority: P1)

Como operador, quero controlar o orçamento de resumo, janela e memórias, para preservar as fontes mais relevantes quando o contexto exceder os limites.

**Why this priority**: Cortes determinísticos tornam o crescimento do contexto observável e permitem ajustar custo sem modificar o conteúdo essencial da solicitação.

**Independent Test**: Com tetos baixos, um teste fake verifica que o resumo respeita 200 tokens, a janela remove primeiro as mensagens mais antigas e as memórias removem primeiro as de menor score.

**Acceptance Scenarios**:

1. **Given** uma janela acima do orçamento, **When** o contexto é montado, **Then** as mensagens mais antigas são removidas primeiro e as mais recentes permanecem na ordem original.
2. **Given** memórias acima do orçamento, **When** o contexto é montado, **Then** memórias com menor score são removidas primeiro e as de maior score permanecem.
3. **Given** resumo acima do orçamento, **When** o contexto é montado, **Then** o resumo é reduzido ao teto configurado sem modificar system ou mensagem.

### User Story 3 - Configurar budgets por ambiente (Priority: P2)

Como responsável pela operação, quero configurar os tetos por variáveis de ambiente, para adaptar o contexto a diferentes modelos e limites sem alterar código.

**Why this priority**: Budgets variáveis permitem ajustes operacionais e testes de regressão sem duplicar a lógica de composição.

**Independent Test**: Um teste injeta valores de `CONTEXT_BUDGET_*`, constrói o mesmo contexto e confirma os valores aplicados; valores ausentes usam os padrões documentados.

**Acceptance Scenarios**:

1. **Given** `CONTEXT_BUDGET_SUMMARY=200`, `CONTEXT_BUDGET_WINDOW=1200` e `CONTEXT_BUDGET_MEMORIES=300`, **When** o contexto é montado, **Then** esses valores são usados por suas respectivas seções.
2. **Given** uma variável ausente, **When** o contexto é montado, **Then** o default da seção é usado.
3. **Given** uma variável inválida ou negativa, **When** a configuração é lida, **Then** a entrada é rejeitada explicitamente em vez de produzir um orçamento silencioso.

## Edge Cases

- System prompt e mensagem atual nunca são truncados, mesmo quando os budgets das outras seções forem zero.
- Um budget zero remove todo conteúdo opcional daquela seção, mantendo o marcador de seção válido.
- Empates de score entre memórias são resolvidos pela ordem original, preservando determinismo.
- Mensagens com conteúdo vazio não causam erro nem alteram a ordem das demais.
- Resumo ausente, janela vazia ou memórias vazias produzem contexto válido.
- O corte de cada seção ocorre independentemente; exceder um budget não autoriza cortar outra seção.
- A estimativa de tokens usada para budgets é determinística e não substitui o usage real reportado nas métricas.
- Valores de ambiente fracionários, não numéricos ou com sinal negativo falham na validação.

## Requirements

### Functional Requirements

- **FR-001**: O sistema MUST fornecer um `ContextBuilder` compartilhado em `src/context/context-builder.ts` para montar o prompt usado por todas as estratégias.
- **FR-002**: O sistema MUST manter system prompt e mensagem atual intactos, sem aplicar cortes ou budgets a essas seções.
- **FR-003**: O sistema MUST aplicar budget à seção de resumo, usando default de 200 tokens quando `CONTEXT_BUDGET_SUMMARY` não estiver definido.
- **FR-004**: O sistema MUST aplicar budget à janela recente, usando default de 1200 tokens quando `CONTEXT_BUDGET_WINDOW` não estiver definido.
- **FR-005**: Ao exceder o budget da janela, o sistema MUST remover as mensagens mais antigas primeiro e preservar a ordem cronológica das mensagens restantes.
- **FR-006**: O sistema MUST aplicar budget às memórias, usando default de 300 tokens quando `CONTEXT_BUDGET_MEMORIES` não estiver definido.
- **FR-007**: Ao exceder o budget de memórias, o sistema MUST remover primeiro as memórias de menor score, mantendo empates na ordem original.
- **FR-008**: O sistema MUST ler, validar e expor configuração de budgets por `CONTEXT_BUDGET_*`, rejeitando valores negativos, fracionários ou não numéricos.
- **FR-009**: Todas as estratégias MUST consumir o mesmo resultado do `ContextBuilder`, sem manter composição de prompt divergente.
- **FR-010**: O sistema MUST manter seções válidas para fontes vazias e budgets zero, sem transformar ausência de fonte em erro.
- **FR-011**: O cálculo de budget MUST ser determinístico e separado do usage real de prompt retornado pelo modelo.
- **FR-012**: Os testes MUST cobrir defaults, configuração por ambiente, budgets baixos, ordem de corte da janela, ordem de corte das memórias, conteúdo intocável e integração com todas as estratégias.

### Key Entities

- **ContextBudget**: Configuração validada dos tetos de resumo, janela e memórias.
- **ContextInput**: Fontes do prompt, incluindo system, resumo, mensagens recentes, memórias com score e mensagem atual.
- **BuiltContext**: Prompt final e metadados das seções preservadas/cortadas.
- **ScoredMemory**: Memória recuperada com seu fato, score e ordem original.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% das estratégias testadas usam a mesma ordem de seções e os mesmos cortes para uma entrada idêntica.
- **SC-002**: Em 100% dos testes com janela excedente, as mensagens mais antigas são removidas antes das recentes.
- **SC-003**: Em 100% dos testes com memórias excedentes, as memórias de menor score são removidas antes das de maior score.
- **SC-004**: 100% dos testes confirmam que system e mensagem atual permanecem byte a byte inalterados.
- **SC-005**: Budgets ausentes produzem defaults 200/1200/300 e budgets válidos de ambiente substituem somente suas respectivas seções.
- **SC-006**: Valores inválidos de ambiente produzem erro explícito em 100% dos testes correspondentes.
- **SC-007**: Contextos com fontes vazias ou budget zero permanecem serializáveis e válidos sem cortar fontes intocáveis.
- **SC-008**: A instrumentação não altera answer, trace, `llCalls`, `latencyMs`, `promptTokens` ou demais métricas existentes além dos cortes previstos no prompt.

## Assumptions

- Budgets são medidos na mesma estimativa determinística de tokens já usada pelo projeto (`chars / 4`), exclusivamente para diagnóstico e corte.
- Os nomes de ambiente são `CONTEXT_BUDGET_SUMMARY`, `CONTEXT_BUDGET_WINDOW` e `CONTEXT_BUDGET_MEMORIES`.
- O texto do resumo é cortado de forma determinística quando excede o budget; a janela remove itens inteiros, começando pelos mais antigos.
- Memórias são ordenadas para seleção por score decrescente, mas empates preservam a ordem de recuperação.
- System prompt e mensagem atual fazem parte do contrato da estratégia e não participam do orçamento configurável.
- A primeira versão não introduz budgets separados para ferramentas, trace ou output da resposta.
- A implementação preserva a injeção de dependências existente e permite testes sem OpenRouter.
