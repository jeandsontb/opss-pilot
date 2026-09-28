# Data Model & State Specifications: War Room Web OpssPilot

**Feature**: `013-war-room-web`  
**Date**: 2026-09-25  
**Spec**: [spec.md](./spec.md)

---

## 1. Entidades de Frontend e Domínio

### 1.1 `ChatMessage`
Representa um item no histórico de mensagens do War Room.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `string` | Identificador único local da mensagem (UUID v4). |
| `role` | `'user' \| 'assistant'` | Remetente da mensagem. |
| `content` | `string` | Conteúdo textual da mensagem ou resposta. |
| `timestamp` | `string` | Data e hora ISO 8601 de envio/recebimento. |
| `conversationId` | `string?` | Identificador da conversa retornado pela API. |
| `requestId` | `string?` | Identificador de rastreabilidade da requisição HTTP. |
| `trace` | `TraceEvent[]?` | Lista de eventos de raciocínio retornados pela API. |
| `metrics` | `ChatMetrics?` | Métricas de execução (tokens, latência, chamadas de modelo). |
| `pendingDecision` | `DecisionAction?` | Dados de ação aguardando decisão quando status foi HTTP 202. |
| `status` | `'sending' \| 'success' \| 'error'` | Estado de entrega da mensagem no cliente. |
| `errorMessage` | `string?` | Mensagem de erro contextual em caso de falha. |

---

### 1.2 `TraceEvent` (União Discriminada)
Representa um nó ou passo executado pelo agente durante o atendimento.

| Tipo (`type`) | Campos Adicionais | Significado |
|---|---|---|
| `'route'` | `route: string, reason: string, source: 'router' \| 'override', node: string` | Decisão de roteamento da estratégia. |
| `'thought'` | `content: string, node: string` | Raciocínio interno ou dedução do agente. |
| `'action'` | `tool: string, args: Record<string, unknown>, node: string` | Chamada de ferramenta operacional. |
| `'observation'` | `content: string, node: string` | Retorno da execução da ferramenta ou dado coletado. |
| `'plan'` | `steps: string[], node: string` | Plano passo a passo traçado pela estratégia. |
| `'critique'` | `content: string, node: string` | Avaliação da reflexão ou encerramento de ciclo. |
| `'answer'` | `content: string, node: string` | Resposta final sintetizada. |
| `'fallback'` | `fromModel: string, toModel: string, reason: string, node: string` | Alternância de contingência entre modelos de IA. |

---

### 1.3 `DecisionCardState`
Representa o estado do cartão de ação que requer intervenção humana (gerado a partir de HTTP 202).

| Campo | Tipo | Descrição |
|---|---|---|
| `actionId` | `string` | Identificador da ação sensível proposta. |
| `title` | `string` | Título legível da ação (ex: *"Abertura de Incidente Crítico"*). |
| `description` | `string` | Detalhes operacionais e justificativa. |
| `payload` | `Record<string, unknown>` | Parâmetros da operação (serviço, severidade, etc.). |
| `status` | `'pending' \| 'approved' \| 'denied'` | Estado da decisão do operador. |
| `decidedAt` | `string?` | Timestamp em que o operador aprovou ou negou a ação. |

---

### 1.4 `ApiConfiguration`
Representa os parâmetros de conectividade do cliente web, persistidos no `localStorage`.

| Campo | Tipo | Descrição | Default |
|---|---|---|---|
| `baseUrl` | `string` | URL base do backend Express OpssPilot. | `http://localhost:3000` |
| `timeoutMs` | `number` | Tempo limite de espera para requisições de chat. | `180000` (3 min) |
| `theme` | `'dark' \| 'light' \| 'system'` | Preferência de tema visual da interface. | `'dark'` |

---

## 2. Schemas de Validação de Fronteira (Zod)

Para garantir que nenhuma resposta não-validada da API alcance os componentes React:

```typescript
import { z } from "zod";

export const traceEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("route"), route: z.string(), reason: z.string(), source: z.enum(["router", "override"]), node: z.string() }),
  z.object({ type: z.literal("thought"), content: z.string(), node: z.string() }),
  z.object({ type: z.literal("action"), tool: z.string(), args: z.record(z.string(), z.unknown()), node: z.string() }),
  z.object({ type: z.literal("observation"), content: z.string(), node: z.string() }),
  z.object({ type: z.literal("plan"), steps: z.array(z.string()), node: z.string() }),
  z.object({ type: z.literal("critique"), content: z.string(), node: z.string() }),
  z.object({ type: z.literal("answer"), content: z.string(), node: z.string() }),
  z.object({ type: z.literal("fallback"), fromModel: z.string(), toModel: z.string(), reason: z.string(), node: z.string() }),
]);

export const chatResponseSchema = z.object({
  requestId: z.string().uuid(),
  conversationId: z.string().min(1),
  answer: z.string(),
  trace: z.array(traceEventSchema).default([]),
  metrics: z.object({
    llCalls: z.number().int().nonnegative(),
    latencyMs: z.number().nonnegative(),
    promptTokens: z.number().int().nonnegative().nullable(),
    modelUsed: z.string().optional(),
  }).optional(),
  pendingAction: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    payload: z.record(z.string(), z.unknown()).default({}),
  }).optional(),
});
```
