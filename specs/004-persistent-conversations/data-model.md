# Data Model: Conversas Persistentes

## Conversation

- `id`: string única e não vazia.
- Relação: possui muitas `Message`.

## Message

- `id`: string única.
- `conversationId`: referência obrigatória a `Conversation`.
- `role`: `user` ou `assistant`.
- `content`: texto não vazio.
- `createdAt`: instante de criação usado para ordenação.

## ConversationStore

- `create(): string`: cria e retorna uma conversa.
- `append(conversationId, role, content): void`: valida a conversa e adiciona uma mensagem.
- `lastMessages(conversationId, limit): Message[]`: valida a conversa e retorna no máximo as mensagens mais recentes em ordem cronológica.

## Invariants

- `limit` deve ser inteiro positivo; a camada de serviço usa 12.
- A mensagem atual do usuário é anexada depois da leitura do histórico e não entra na métrica `historyMessages`.
- A resposta assistant é anexada somente depois que a estratégia conclui com sucesso.
