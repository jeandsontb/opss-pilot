# Feature Specification: Memória Semântica

**Feature Branch**: `005-semantic-memory`

**Created**: 2026-09-24

**Status**: Draft

**Input**: User description: "Memória semântica: MemoryStore por userId - remember (dedup > 0.92), recall top-3 por produto escalar (min 0.3), forget; tabela memories, embedding all-MiniLM-L6-v2 local em BLOB; /chat ganha userId e injeta o recall no prompt; teste: recall acha fato sem palavra em comum. user: @huggingface/transformers com pooling: mean + normaliza: true e lazy singleton src/memory/embeddings.ts e src/memory/memory-store.ts. As colunas de memories (id, user_id, fact, embedding, created_at"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar fatos do usuário (Priority: P1)

Como usuário do OpssPilot, quero registrar fatos relevantes sobre mim ou sobre meu contexto operacional para que possam ser usados em conversas futuras.

**Why this priority**: Sem a gravação confiável dos fatos, a memória não pode melhorar a continuidade das interações.

**Independent Test**: Usar um `MemoryStore` isolado, registrar um fato para um `userId` e verificar que ele pode ser recuperado posteriormente.

**Acceptance Scenarios**:

1. **Given** um `userId` válido e um fato não vazio, **When** `remember` é chamado, **Then** o fato é armazenado com seu embedding e data de criação.
2. **Given** um fato semanticamente duplicado com similaridade maior que 0,92 para o mesmo usuário, **When** `remember` é chamado, **Then** nenhum novo fato duplicado é criado.
3. **Given** o mesmo fato para dois `userId` diferentes, **When** cada usuário consulta sua memória, **Then** cada usuário acessa somente sua própria memória.

### User Story 2 - Recuperar contexto semanticamente relacionado (Priority: P1)

Como agente de plantão, quero recuperar os fatos mais relacionados à mensagem atual mesmo quando não há palavras idênticas, para responder usando contexto persistido.

**Why this priority**: A busca semântica é o valor central da memória e permite recuperar fatos equivalentes expressos com vocabulário diferente.

**Independent Test**: Armazenar um fato e consultar uma frase semanticamente equivalente sem palavras em comum, verificando que o fato aparece entre os resultados.

**Acceptance Scenarios**:

1. **Given** fatos armazenados para um usuário, **When** `recall` recebe uma consulta, **Then** retorna no máximo os três fatos com maior produto escalar.
2. **Given** um resultado com similaridade inferior a 0,3, **When** `recall` é executado, **Then** esse resultado não é retornado.
3. **Given** fatos de usuários diferentes, **When** `recall` é executado para um usuário, **Then** resultados de outros usuários não são retornados.
4. **Given** uma consulta semanticamente equivalente sem palavras em comum, **When** `recall` é executado, **Then** o fato relacionado é encontrado no teste determinístico.

### User Story 3 - Usar memória no chat (Priority: P2)

Como usuário, quero que o chat use automaticamente minhas memórias relevantes quando informo meu identificador, sem precisar repetir fatos conhecidos.

**Why this priority**: Integrar o recall ao chat transforma o armazenamento em uma capacidade útil para o agente e preserva a experiência conversacional.

**Independent Test**: Chamar `/chat` com `userId`, uma memória fake e uma estratégia fake, verificando que o prompt contém o recall e que o resultado mantém o contrato atual.

**Acceptance Scenarios**:

1. **Given** um `userId` com memórias relacionadas, **When** `/chat` recebe uma mensagem, **Then** o prompt da estratégia inclui os fatos recuperados.
2. **Given** um `userId` sem memórias relacionadas, **When** `/chat` é chamado, **Then** a estratégia executa normalmente sem contexto de memória.
3. **Given** uma requisição sem `userId`, **When** `/chat` é chamada, **Then** o comportamento conversacional existente permanece disponível sem consultar memória.

### User Story 4 - Esquecer um fato (Priority: P3)

Como usuário ou operador autorizado, quero remover um fato da memória para corrigir informações antigas ou retirar dados que não devem mais ser usados.

**Why this priority**: A remoção é necessária para manter a memória correta e permitir controle sobre dados persistidos.

**Independent Test**: Registrar um fato, executar `forget`, e verificar que ele não aparece mais em `recall`.

**Acceptance Scenarios**:

1. **Given** um fato existente pertencente ao usuário, **When** `forget` é chamado, **Then** o fato é removido e não é retornado por novas consultas.
2. **Given** um identificador inexistente ou pertencente a outro usuário, **When** `forget` é chamado, **Then** nenhum fato de outro usuário é removido e um resultado explícito é retornado.

### Edge Cases

- `userId` e fato vazios ou somente com espaços devem ser rejeitados.
- Embeddings inválidos, vazios ou com dimensão incompatível não devem ser persistidos.
- O vetor deve ser normalizado antes do armazenamento, garantindo que o produto escalar represente similaridade de vetores normalizados.
- `recall` sem memórias deve retornar uma lista vazia, não erro.
- `recall` deve aplicar o filtro mínimo de 0,3 antes de limitar aos três melhores resultados.
- A deduplicação deve ser restrita ao `userId` atual.
- O modelo de embedding deve ser carregado sob demanda uma única vez por processo.
- Falhas no carregamento do modelo local devem ser reportadas explicitamente, sem resultados semânticos falsos.
- A ausência de `userId` no chat não deve criar nem consultar uma memória implícita.
- O teste sem palavras em comum deve ser determinístico e não depender de rede ou credenciais.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST oferecer um `MemoryStore` particionado por `userId`.
- **FR-002**: O sistema MUST oferecer `remember(userId, fact)`, `recall(userId, query)` e `forget(userId, memoryId)`.
- **FR-003**: `remember` MUST rejeitar `userId` e `fact` vazios e persistir o fato com embedding normalizado.
- **FR-004**: `remember` MUST evitar duplicatas quando o produto escalar com uma memória existente do mesmo usuário for maior que 0,92.
- **FR-005**: `recall` MUST calcular similaridade por produto escalar entre vetores normalizados.
- **FR-006**: `recall` MUST descartar resultados abaixo de 0,3 e retornar no máximo os três melhores resultados.
- **FR-007**: O sistema MUST restringir remember, recall e forget ao `userId` informado.
- **FR-008**: `forget` MUST remover somente a memória pertencente ao `userId` informado e retornar um resultado explícito quando o registro não existir.
- **FR-009**: O sistema MUST persistir memórias em uma tabela `memories` com as colunas `id`, `user_id`, `fact`, `embedding` e `created_at`.
- **FR-010**: O embedding MUST ser gerado localmente pelo modelo `all-MiniLM-L6-v2`, sem dependência de rede durante o uso normal após disponibilização do modelo.
- **FR-011**: O sistema MUST aplicar pooling mean e normalização ao vetor produzido pelo modelo de embedding.
- **FR-012**: O carregamento do modelo de embedding MUST ser lazy e singleton por processo.
- **FR-013**: O endpoint `POST /chat` MUST aceitar `userId` opcional.
- **FR-014**: Quando `userId` estiver presente, o chat MUST executar `recall` e injetar os fatos recuperados no prompt antes da mensagem atual.
- **FR-015**: Quando `userId` não estiver presente, o chat MUST preservar o comportamento existente sem consultar memória.
- **FR-016**: A integração MUST preservar o contrato existente de `conversationId`, `answer`, `trace` e `metrics`.
- **FR-017**: Os testes MUST usar armazenamento e estratégia fake determinísticos, incluindo um caso em que o recall encontra um fato sem palavra em comum com a consulta.

### Key Entities

- **Memory**: Fato persistido para um usuário, com identificador, texto, embedding normalizado e data de criação.
- **MemoryStore**: Serviço que gerencia fatos por usuário, deduplicação, recuperação semântica e remoção.
- **EmbeddingProvider**: Componente lazy singleton que gera vetores locais usando pooling mean e normalização.
- **MemoryRecall**: Resultado de uma busca, contendo o fato e sua similaridade.
- **ChatRequest**: Pedido HTTP acrescido de `userId` opcional.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos testes com duplicatas semanticamente maiores que 0,92 resultam em uma única memória por fato.
- **SC-002**: 100% dos recalls retornam no máximo três resultados e nenhum resultado abaixo de 0,3.
- **SC-003**: O teste determinístico sem palavras em comum recupera o fato correto entre os três primeiros resultados.
- **SC-004**: 100% das memórias retornadas pertencem ao `userId` consultado.
- **SC-005**: 100% das requisições de chat com `userId` e memória relacionada enviam o recall no prompt da estratégia fake.
- **SC-006**: O modelo local é inicializado no máximo uma vez durante o ciclo de vida do processo.
- **SC-007**: 100% dos testes da feature executam sem OpenRouter, rede externa ou credenciais.

## Assumptions

- `userId` é um identificador fornecido por um sistema externo; autenticação e autorização ficam fora do escopo desta feature.
- O embedding é persistido como BLOB binário com dimensão fixa produzida pelo modelo escolhido.
- A implementação de `MemoryStore` em memória será usada nos testes; a tabela `memories` é utilizada para persistência SQLite.
- A deduplicação compara somente memórias do mesmo usuário.
- O recall será injetado no prompt junto ao histórico conversacional existente, sem alterar o formato público do trace.
- `forget` recebe o identificador da memória, não o texto do fato.
- O modelo local e seus artefatos estarão disponíveis no ambiente de execução; baixar ou gerenciar pesos em produção está fora do escopo.
