# Data Model: Memória Semântica

## Memory

- `id`: identificador único não vazio.
- `userId`: identificador obrigatório do proprietário.
- `fact`: texto não vazio.
- `embedding`: vetor numérico não vazio, normalizado e de dimensão fixa.
- `createdAt`: data de criação.

## MemoryStore

- `remember(userId, fact)`: gera embedding e cria ou reutiliza memória quando similaridade existente for `> 0.92`.
- `recall(userId, query)`: gera embedding, calcula produto escalar apenas para o usuário, filtra similaridade `>= 0.3`, ordena descendentemente e retorna no máximo três.
- `forget(userId, memoryId)`: remove somente a memória do usuário indicado e informa quando não encontrada.

## MemoryEmbeddingProvider

- `embed(text)`: retorna vetor normalizado.
- Implementação real: pipeline local `all-MiniLM-L6-v2`, mean pooling e normalização.
- Implementação de teste: provider fake determinístico e injetável.

## Sequelize mapping

Tabela `memories`:

- `id` — string, chave primária.
- `user_id` — string, não nulo.
- `fact` — texto, não nulo.
- `embedding` — BLOB, não nulo.
- `created_at` — data, não nulo.

## Invariants

- Nunca comparar ou retornar memórias de outro `userId`.
- Embeddings persistidos devem ter dimensão consistente e norma unitária dentro da tolerância numérica.
- Um recall vazio retorna `[]`.
