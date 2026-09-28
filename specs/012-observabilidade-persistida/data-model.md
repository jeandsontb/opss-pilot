# Data Model: Observabilidade Persistida

## RequestRecord

| Campo | Tipo | Regra |
|---|---|---|
| `requestId` | string | obrigatório, único, 1–128 caracteres, sem controle |
| `status` | `"running" \| "succeeded" \| "failed"` | transição explícita |
| `createdAt` | ISO datetime | obrigatório |
| `completedAt` | ISO datetime opcional | presente quando termina |
| `conversationId` | string opcional | id sanitizado da conversa |
| `answer` | string opcional | somente em sucesso |
| `error` | string opcional | categoria/mensagem genérica sanitizada |
| `llCalls` | inteiro não negativo opcional | métrica disponível |
| `latencyMs` | inteiro não negativo opcional | métrica disponível |
| `promptTokens` | inteiro não negativo ou null | usage real quando disponível |
| `modelUsed` | string opcional | modelo lógico, sem credenciais |

## TraceEventRecord

| Campo | Tipo | Regra |
|---|---|---|
| `requestId` | string | referência a `RequestRecord` |
| `sequence` | inteiro não negativo | único por request, crescente |
| `type` | enum de trace | validado pelo schema existente |
| `node` | string | obrigatório, não vazio |
| `payload` | JSON | serializável e sanitizado |
| `createdAt` | ISO datetime | momento de persistência/emissão |

## StructuredLogEvent

Campos permitidos: `timestamp`, `requestId`, `event`, `type`, `node`,
`sequence`, `status`, `durationMs` e `errorKind`. Payloads, prompts, headers,
tokens de autenticação e mensagens brutas de provedores são proibidos.

## Invariants

- Todo `TraceEventRecord` pertence a um `RequestRecord` existente.
- `sequence` começa em zero e a consulta retorna ordem crescente.
- `requestId` duplicado não substitui registro existente.
- Registros `failed` não possuem resposta apresentada como sucesso.
- Logger e armazenamento nunca recebem secrets ou payloads não sanitizados.
