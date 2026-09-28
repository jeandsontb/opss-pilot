# API & Interaction Contract: War Room Web ↔ OpssPilot

**Feature**: `013-war-room-web`  
**Date**: 2026-09-25  
**Spec**: [spec.md](../spec.md)

---

## 1. Endpoint: `POST /chat`

Submissão de mensagem do operador e recepção da resposta do copiloto.

### Request

```http
POST /chat HTTP/1.1
Host: localhost:3000
Content-Type: application/json
Accept: application/json

{
  "message": "me chame de Thiago e abra um low no auth",
  "conversationId": "7bc0994c-e106-43c7-9c66-df2820f4a3ca",
  "userId": "user-operador-1"
}
```

---

### Resposta Padrão de Sucesso: `200 OK`

```json
{
  "requestId": "58a01dc0-73f1-4719-bf64-7a2db1b76434",
  "conversationId": "7bc0994c-e106-43c7-9c66-df2820f4a3ca",
  "answer": "Incidente registrado com sucesso no serviço de autenticação com severidade baixa.",
  "trace": [
    {
      "type": "route",
      "route": "react",
      "reason": "Investigação com uso de ferramenta",
      "source": "router",
      "node": "router"
    },
    {
      "type": "action",
      "tool": "open_incident",
      "args": { "service": "auth", "severity": "low", "title": "Falha de autenticação" },
      "node": "react"
    },
    {
      "type": "observation",
      "content": "{\"id\":\"inc-123\",\"status\":\"open\"}",
      "node": "react"
    },
    {
      "type": "answer",
      "content": "Incidente registrado com sucesso...",
      "node": "react"
    }
  ],
  "metrics": {
    "llCalls": 3,
    "latencyMs": 2450,
    "promptTokens": 380,
    "modelUsed": "openai/gpt-4o-mini"
  }
}
```

---

### Resposta de Ação Sensível Pendente: `202 Accepted`

Quando uma operação solicita aprovação prévia do operador humano (Human-in-the-loop).

```http
HTTP/1.1 202 Accepted
Content-Type: application/json

{
  "requestId": "7e2a91b4-2391-4df2-bc51-0a12e845c110",
  "conversationId": "7bc0994c-e106-43c7-9c66-df2820f4a3ca",
  "answer": "Uma ação crítica foi proposta e necessita da sua autorização para prosseguir.",
  "pendingAction": {
    "id": "act-restart-auth",
    "title": "Reiniciar Pods do Serviço Auth",
    "description": "Reinicialização graciosa de 3 réplicas para mitigar pico de latência.",
    "payload": {
      "service": "auth",
      "severity": "critical",
      "action": "restart_deployment"
    }
  },
  "trace": [
    {
      "type": "route",
      "route": "react",
      "reason": "Detecção de ação crítica de infraestrutura",
      "source": "router",
      "node": "router"
    }
  ]
}
```

---

## 2. Endpoint: `GET /health`

Utilizado pelo modal de configurações para verificar a conectividade com a API.

### Resposta: `200 OK`

```json
{
  "status": "ok"
}
```

---

## 3. Contrato de Cabeçalhos CORS (Cross-Origin Resource Sharing)

Para todas as respostas e requisições preflight:

```http
OPTIONS /chat HTTP/1.1
Host: localhost:3000
Origin: http://localhost:5173
Access-Control-Request-Method: POST
Access-Control-Request-Headers: content-type, x-request-id

HTTP/1.1 204 No Content
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Request-Id
Access-Control-Max-Age: 86400
```
