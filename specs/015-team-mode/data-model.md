# Data Model: Team Mode

**Feature**: 015-team-mode  
**Date**: 2026-09-28  
**Phase**: 1 — Design & Contracts

---

## Entities

### TeamRole (enum)

Enumeração dos papéis válidos na equipe.

```
analyst | planner | executor
```

---

### SupervisorDecision

Saída estruturada emitida pelo supervisor a cada ciclo.

| Campo  | Tipo                              | Descrição                                      |
|--------|-----------------------------------|------------------------------------------------|
| `next` | `TeamRole \| "END"`               | Próximo nó a executar, ou "END" para encerrar  |
| `brief`| `string` (mín 1 char)             | Instrução contextual para o nó destinatário    |

**Validation rules**:
- `next` DEVE ser um valor do enum `TeamRole` ou a string literal `"END"`.
- `brief` NÃO PODE ser vazia.
- Se o LLM retornar `next` inválido, o nó supervisor trata como `"END"` e registra erro no trace.

---

### HandoffEvent

Evento registrado no trace a cada transição de papel, estendendo a union `TraceEvent`.

| Campo       | Tipo                    | Descrição                                            |
|-------------|-------------------------|------------------------------------------------------|
| `type`      | `"handoff"` (literal)   | Discriminante da union `TraceEvent`                  |
| `from`      | `string`                | Papel remetente (ou `"supervisor"` no primeiro ciclo)|
| `to`        | `string`                | Papel destinatário ou `"END"`                        |
| `brief`     | `string`                | Cópia do `brief` emitido pelo supervisor             |
| `node?`     | `string`                | Nome do nó LangGraph que emitiu o evento             |

**Constraints**:
- `from` e `to` NUNCA podem ser iguais no mesmo evento (o supervisor é o intermediário).
- `timestamp` NÃO é incluído no tipo TypeScript pois o `trace` já é ordenado por posição de inserção; a ordem de array é a ordem de ocorrência.

---

### TeamState (Blackboard)

Estado compartilhado imutável do grafo LangGraph.

| Campo                | Tipo                  | Reducer                   | Default       | Descrição                                 |
|----------------------|-----------------------|---------------------------|---------------|-------------------------------------------|
| `input`              | `string`              | substituição              | `""`          | Mensagem original do operador             |
| `conversationId`     | `string`              | substituição              | `""`          | ID da conversa para persistência          |
| `history`            | `BaseMessage[]`       | substituição              | `[]`          | Histórico de mensagens da conversa        |
| `supervisorDecision` | `SupervisorDecision \| null` | substituição       | `null`        | Última decisão do supervisor              |
| `analysis`           | `string`              | substituição              | `""`          | Resultado do analista (observabilidade)   |
| `plan`               | `string`              | substituição              | `""`          | Plano de resposta do planejador           |
| `executionResult`    | `string`              | substituição              | `""`          | Resultado das ações do executor           |
| `trace`              | `TraceEvent[]`        | aditivo (`left.concat(right)`) | `[]`   | Eventos de raciocínio acumulados          |
| `cycleCount`         | `number`              | aditivo (`left + right`)  | `0`           | Contador de ciclos do supervisor          |
| `maxSteps`           | `number`              | substituição              | `8`           | Teto configurável de ciclos (1–8)         |
| `llCalls`            | `number`              | aditivo                   | `0`           | Total de chamadas LLM                     |
| `promptTokens`       | `number \| null`      | aditivo (null-safe)       | `null`        | Total de tokens de prompt                 |
| `modelUsed`          | `string \| undefined` | substituição              | `undefined`   | Último modelo utilizado                   |
| `store`              | `OperationalRepository` | substituição            | (injetado)    | Store de incidentes para o executor       |

**Immutability**: Cada nó retorna apenas as chaves que alterou. Reducers aditivos garantem que `trace` e contadores crescem monotonicamente sem mutação direta.

---

### TeamRequest (HTTP Input)

Entrada validada por Zod na borda do endpoint `POST /team`.

| Campo            | Tipo      | Obrigatório | Padrão | Descrição                                        |
|------------------|-----------|-------------|--------|--------------------------------------------------|
| `message`        | `string`  | Sim         | —      | Texto do operador (mín 1 char)                   |
| `conversationId` | `string`  | Não         | `null` | ID de conversa existente para retomada           |
| `maxSteps`       | `number`  | Não         | `8`    | Teto de ciclos (inteiro, 1–8)                    |
| `requestId`      | `string`  | Não         | UUID   | ID de rastreamento da requisição                 |

---

### TeamResponse (HTTP Output)

Resposta serializada pelo endpoint `POST /team`.

| Campo            | Tipo           | Descrição                                              |
|------------------|----------------|--------------------------------------------------------|
| `answer`         | `string`       | Resposta final compilada pelo grafo                    |
| `conversationId` | `string`       | ID da conversa (nova ou retomada)                      |
| `requestId`      | `string`       | ID de rastreamento                                     |
| `trace`          | `TraceEvent[]` | Todos os eventos de raciocínio, incluindo `handoff`s   |
| `metrics`        | `Metrics`      | Métricas de desempenho (llCalls, latencyMs, tokens)    |

---

## State Transitions

```
START
  └─► supervisor (ciclo N)
        ├─► analyst    → supervisor (ciclo N+1)
        ├─► planner    → supervisor (ciclo N+1)
        ├─► executor   → supervisor (ciclo N+1)
        └─► END        → compila answer → FIM
              ↑
              └─ (também via cycleCount >= maxSteps)
```

**Transição de encerramento**: Se `cycleCount >= maxSteps` antes da execução do supervisor, o grafo usa a edge condicional para ir direto a `END` sem invocar o LLM.

---

## Relacionamento com Entidades Existentes

- **`TraceEvent`** (`src/agents/types.ts`): `HandoffEvent` é adicionado como novo membro da union discriminada. Não altera membros existentes.
- **`SqliteConversationStore`**: persiste o histórico de mensagens da conversa de equipe. Nenhuma mudança de esquema; o `conversationId` é o mesmo tipo `string` já utilizado.
- **`OperationalRepository`** (`src/models/store.ts`): injetado no `TeamState` para uso exclusivo do executor.
- **`ReasoningResult`** (`src/agents/types.ts`): `TeamResult` estende essa interface adicionando `conversationId` e `requestId`, seguindo o padrão de `ChatResult` em `src/services/chat.ts`.
