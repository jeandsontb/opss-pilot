# Data Model: Refletor de Aprendizado

## LearningReflection

- `hasLearning`: booleano obrigatório.
- `fact`: texto opcional; obrigatório e não vazio apenas quando
  `hasLearning=true`.
- A saída é considerada candidata, não uma autorização automática para salvar.

## LearningContext

- `userId`: identificador do proprietário; obrigatório para persistência.
- `lastUserMessage`: última mensagem original enviada pelo usuário.
- `answer`: resposta produzida, disponível para contexto de reflexão sem ser
  tratada como fonte de fatos do usuário.
- `conversationId`: identificador da conversa, usado somente para correlação.

## Memory

A entidade reutiliza [specs/005-semantic-memory/data-model.md](../005-semantic-memory/data-model.md):
`id`, `userId`, `fact`, `embedding` e `createdAt`.

## ForgetPreferenceRequest

- `userId`: string não vazia.
- `memoryId`: string não vazia.
- A remoção só ocorre quando ambos pertencem à mesma memória armazenada.

## Invariants

- Nunca persistir sem `userId`.
- Nunca persistir pedidos pontuais, segredos ou fatos ambíguos.
- Nunca acessar ou remover memória de outro usuário.
- Falhas de reflexão não devem modificar o resultado principal do chat.
