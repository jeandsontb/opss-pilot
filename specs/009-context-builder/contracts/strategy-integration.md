# Contrato de integração com estratégias

O serviço de chat deve construir um único prompt com `ContextBuilder.build` e
passar esse texto para `ReasoningStrategy.run`:

```text
system:
<system>

summary:
<summary>

window:
<role>: <content>

memories:
- <fact>

message:
<message>
```

Todas as estratégias (`react`, `plan-and-execute` e wrappers como reflection)
recebem o mesmo texto para entradas equivalentes. Nenhuma estratégia deve
recompor ou recortar as seções.

O builder não altera answer, trace, `llCalls`, `latencyMs`, `promptTokens` ou
outras métricas; ele apenas determina o texto de entrada.
