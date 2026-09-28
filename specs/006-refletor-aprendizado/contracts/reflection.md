# Contrato do Refletor

## Entrada

O refletor recebe a última mensagem original do usuário, a resposta produzida,
`userId` opcional, um provider estruturado e um `MemoryStore`.

Histórico composto, memórias recuperadas e mensagens de outras conversas não
fazem parte da fonte de aprendizado.

## Saída estruturada

```json
{
  "hasLearning": true,
  "fact": "O usuário prefere ser chamado de Thiago."
}
```

`hasLearning=false` deve produzir `fact` ausente ou vazio e não cria memória.

## Persistência

Quando houver `userId`, `hasLearning=true`, fato não vazio e aprovação da
política de elegibilidade, o refletor chama `MemoryStore.remember(userId, fact)`.
Essa chamada ocorre depois que a resposta principal já foi enviada.

## Falhas

Erros do provider, validação, política ou store são registrados com contexto
não sensível. Eles não alteram `answer`, `trace`, `conversationId` ou métricas.
