# Research: Conversas Persistentes

## Decision: Store injetável com implementação em memória

**Rationale**: Permite testes rápidos e determinísticos, mantém o controller independente da persistência e reproduz as operações necessárias para substituir o armazenamento por PostgreSQL.

**Alternatives considered**: Acessar o Sequelize diretamente no controller foi rejeitado por violar a separação de camadas e dificultar os testes `:memory:`.

## Decision: Compor o histórico como contexto explícito do input

**Rationale**: A interface atual de `ReasoningStrategy` recebe uma string. A composição preserva compatibilidade e marca claramente `Histórico` e `Mensagem atual`, evitando confundir mensagens anteriores com a solicitação corrente.

**Alternatives considered**: Alterar imediatamente todas as estratégias para aceitar um novo objeto foi rejeitado por ampliar o escopo e exigir mudanças no ReAct, Plan-and-execute e reflection.

## Decision: Persistir a resposta somente após sucesso

**Rationale**: Evita histórico incompleto quando uma estratégia falha ou excede o timeout.

**Alternatives considered**: Persistir uma mensagem de erro como assistant foi rejeitado porque erro operacional não é uma resposta do agente.
