# Contract: POST /team

**Feature**: 015-team-mode  
**Date**: 2026-09-28  
**Type**: HTTP REST Endpoint

---

## Endpoint

```
POST /team
Content-Type: application/json
```

---

## Request Body

```json
{
  "message": "string (required, min 1 char)",
  "conversationId": "string (optional, UUID)",
  "maxSteps": "integer (optional, 1–8, default 8)",
  "requestId": "string (optional, UUID — gerado pelo server se omitido)"
}
```

### Validation Errors (HTTP 422)

Retornado quando `maxSteps` está fora da faixa [1, 8] ou `message` está vazia:

```json
{
  "issues": [{ "code": "too_small", "path": ["maxSteps"], "message": "..." }]
}
```

---

## Success Response (HTTP 200)

```json
{
  "answer": "string — resposta final compilada pela equipe",
  "conversationId": "string — UUID da conversa (nova ou retomada)",
  "requestId": "string — UUID de rastreamento",
  "trace": [
    {
      "type": "thought",
      "content": "string",
      "node": "supervisor"
    },
    {
      "type": "handoff",
      "from": "supervisor",
      "to": "analyst",
      "brief": "Analise os alertas ativos e métricas do serviço X.",
      "node": "supervisor"
    },
    {
      "type": "observation",
      "content": "string",
      "node": "analyst"
    },
    {
      "type": "handoff",
      "from": "analyst",
      "to": "planner",
      "brief": "Com base na análise, elabore plano de resposta.",
      "node": "supervisor"
    },
    {
      "type": "plan",
      "steps": ["Passo 1", "Passo 2"],
      "node": "planner"
    },
    {
      "type": "handoff",
      "from": "planner",
      "to": "executor",
      "brief": "Execute o plano de resposta.",
      "node": "supervisor"
    },
    {
      "type": "action",
      "tool": "open_incident",
      "args": { "title": "...", "service": "...", "severity": "high" },
      "node": "executor"
    },
    {
      "type": "answer",
      "content": "string",
      "node": "executor"
    }
  ],
  "metrics": {
    "llCalls": 4,
    "latencyMs": 12500,
    "promptTokens": 3200,
    "modelUsed": "openai/gpt-4o-mini"
  }
}
```

---

## Error Responses

| Status | Condition                                         | Body                                              |
|--------|---------------------------------------------------|---------------------------------------------------|
| 400    | Body inválido (JSON malformado ou campos errados) | `{ "issues": [...] }`                             |
| 404    | `conversationId` fornecido não existe no store    | `{ "requestId": "...", "error": "Conversation not found" }` |
| 422    | `maxSteps` fora do range, `message` vazia         | `{ "issues": [...] }`                             |
| 503    | Modelo LLM indisponível                           | `{ "requestId": "...", "error": "Model service unavailable" }` |
| 504    | Timeout do grafo (> 180s)                         | `{ "requestId": "...", "error": "Team graph timed out" }` |
| 500    | Erro interno não tratado                          | `{ "error": "Internal server error" }`            |

---

## Headers

| Header           | Direction | Description                               |
|------------------|-----------|-------------------------------------------|
| `X-Request-Id`   | Response  | UUID de rastreamento (igual ao `requestId` no body) |
| `Content-Type`   | Request   | `application/json`                        |
| `Access-Control-Allow-Origin` | Response | `*` (mesma política CORS do servidor) |

---

## Idempotência

O endpoint NÃO é idempotente. Cada chamada pode criar ou modificar incidentes no `SqliteOperationalStore`. O `requestId` serve apenas para rastreamento de observabilidade.

---

## Compatibilidade com Trace Existente

Os eventos `handoff` no array `trace` são um novo tipo discriminado por `"type": "handoff"`. Consumidores que não reconhecem esse tipo devem ignorá-lo graciosamente (padrão de union aberta).

O campo `trace` segue exatamente o mesmo schema do `trace` retornado por `POST /chat`, garantindo compatibilidade com o componente "Ver Raciocínio" da interface web.
