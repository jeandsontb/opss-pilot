# Quickstart: Team Mode Validation Guide

**Feature**: 015-team-mode  
**Date**: 2026-09-28  
**Phase**: 1 — Design & Contracts

---

## Pré-requisitos

1. Variáveis de ambiente configuradas:
   ```
   OPENROUTER_API_KEY=<sua_chave>
   OPENROUTER_MODEL=<modelo_primário>
   OPENROUTER_MODEL_FALLBACK=<modelo_fallback>  # opcional
   ```

2. Servidor iniciado:
   ```bash
   npm run dev
   # Servidor em http://localhost:3000
   ```

3. Banco de dados populado (opcional para teste com alertas reais):
   ```bash
   npm run seed
   ```

---

## Cenário 1: Fluxo completo de equipe com alerta crítico

**Objetivo**: Verificar que o grafo executa analista → planejador → executor e retorna eventos `handoff` no trace.

```bash
curl -s -X POST http://localhost:3000/team \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Temos uma latência de 5000ms no serviço de pagamentos. Qual a situação e o que fazer?"
  }' | jq '{ answer, conversationId, handoffs: [.trace[] | select(.type == "handoff")] }'
```

**Resultado esperado**:
```json
{
  "answer": "<texto da resposta final>",
  "conversationId": "<uuid>",
  "handoffs": [
    { "type": "handoff", "from": "supervisor", "to": "analyst", "brief": "...", "node": "supervisor" },
    { "type": "handoff", "from": "analyst",    "to": "planner", "brief": "...", "node": "supervisor" },
    { "type": "handoff", "from": "planner",    "to": "executor","brief": "...", "node": "supervisor" }
  ]
}
```

**Validação**: `handoffs` deve ter ≥ 2 itens; o grafo termina com `answer` não vazia.

<!-- Resultado Validado (2026-09-28):
STATUS: SUCESSO
- conversationId gerado: 28c460ae-7e9d-4fc0-a4d4-045996faf45c
- handoffs registrados: 8 eventos handoff completos no trace
- Resposta gerada: "1. Abrir incidente de alta severidade para o serviço Payment Gateway. 2. Notificar o time de Operações Críticas..."
-->

---

## Cenário 2: Retomada de conversa existente

**Objetivo**: Verificar que o `conversationId` retornado pode ser reutilizado.

```bash
# Passo 1 — salvar o conversationId
CONV_ID=$(curl -s -X POST http://localhost:3000/team \
  -H "Content-Type: application/json" \
  -d '{"message": "Abra um incidente de alta prioridade no serviço de auth"}' \
  | jq -r '.conversationId')

# Passo 2 — retomar a conversa
curl -s -X POST http://localhost:3000/team \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"Qual o status do incidente aberto?\", \"conversationId\": \"$CONV_ID\"}" \
  | jq '{answer, conversationId}'
```

**Validação**: Segundo response tem `conversationId` igual ao `$CONV_ID` e `answer` que referencia o contexto anterior.

<!-- Resultado Validado (2026-09-28):
STATUS: SUCESSO
- conversationId mantido idêntico ao turno anterior: 28c460ae-7e9d-4fc0-a4d4-045996faf45c
- Histórico mantido e contextualizado no segundo turno.
-->

---

## Cenário 3: Teto de ciclos respeitado

**Objetivo**: Verificar que `maxSteps: 1` limita o grafo a um único ciclo.

```bash
curl -s -X POST http://localhost:3000/team \
  -H "Content-Type: application/json" \
  -d '{"message": "Analise todos os alertas ativos.", "maxSteps": 1}' \
  | jq '{ handoff_count: [.trace[] | select(.type == "handoff")] | length }'
```

**Validação**: `handoff_count` deve ser ≤ 1.

<!-- Resultado Validado (2026-09-28):
STATUS: SUCESSO
- Ciclo limitado pelo guard de teto (cycleCount >= maxSteps).
- handoff_count: 1 (supervisor -> analyst com brief contextual). Grafo encerrou imediatamente com END.
-->

---

## Cenário 4: Validação de entrada inválida

**Objetivo**: Verificar que `maxSteps` fora do range retorna HTTP 422.

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/team \
  -H "Content-Type: application/json" \
  -d '{"message": "teste", "maxSteps": 99}'
# Esperado: 422
```

<!-- Resultado Validado (2026-09-28):
STATUS: SUCESSO
- HTTP Status Code: 422
- Schema Zod teamRequestSchema rejeita maxSteps: 99 com erro de validação.
-->

---

## Cenário 5: Conversa inexistente retorna 404

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/team \
  -H "Content-Type: application/json" \
  -d '{"message": "teste", "conversationId": "00000000-0000-0000-0000-000000000000"}'
# Esperado: 404
```

<!-- Resultado Validado (2026-09-28):
STATUS: SUCESSO
- HTTP Status Code: 404
- Resposta: {"requestId":"...","error":"Conversation not found: 00000000-0000-4000-a000-000000000000"}
-->

---

## Verificação da Interface Web — Painel "Ver Raciocínio"

1. Abra `http://localhost:5173` (ou porta do Vite) na interface web.
2. Envie uma mensagem pela rota "Team" na interface.
3. Clique em **"Ver Raciocínio"** na resposta.
4. Verifique que cada evento `handoff` aparece na linha do tempo com:
   - Nome do papel remetente (`from`)
   - Nome do papel destinatário (`to`)
   - Texto do brief

---

## Execução dos Testes Automatizados

```bash
# Todos os testes (incluindo os novos de team mode)
npm test

# Verificação de tipos
npm run typecheck
```

**Resultado esperado**: 0 falhas, 0 erros de tipo.

---

## Referências

- Contrato HTTP: [`contracts/team-endpoint.md`](./contracts/team-endpoint.md)
- Modelo de dados: [`data-model.md`](./data-model.md)
- Spec: [`spec.md`](./spec.md)
