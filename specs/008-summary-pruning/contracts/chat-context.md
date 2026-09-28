# Contrato do contexto do chat

Quando houver resumo:

```text
Resumo persistido da conversa:
<summary>

Histórico recente da conversa (até 8 mensagens):
<role>: <content>

Mensagem atual do usuário:
<message>
```

Sem resumo, a seção indica explicitamente que não há resumo disponível. As
mensagens recentes permanecem na ordem cronológica.

Uma resposta que realiza pruning inclui:

```json
{
  "type": "summarize",
  "messageCount": 8,
  "summarizedMessageCount": 8
}
```
