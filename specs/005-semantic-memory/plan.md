# Implementation Plan: Memória Semântica

**Branch**: `005-semantic-memory` | **Date**: 2026-09-24 | **Spec**: [spec.md](./spec.md)

## Summary

Adicionar um provedor local de embeddings lazy/singleton, um `MemoryStore` particionado por usuário e a integração opcional do recall ao fluxo `POST /chat`. O armazenamento em memória será injetável para testes determinísticos; o adaptador Sequelize exporá a tabela `memories` com embedding em BLOB. A busca usará vetores normalizados, produto escalar, deduplicação acima de 0,92 e recall top-3 acima de 0,3.

## Technical Context

**Language/Version**: TypeScript ESM, Node.js 22 LTS, `strict: true`

**Primary Dependencies**: `@huggingface/transformers` para `all-MiniLM-L6-v2`, Zod, Sequelize, Express, `node:test` via `tsx`

**Storage**: `MemoryStore` em memória para testes; SQLite com embedding serializado em BLOB para persistência

**Testing**: `npm test`, `npm run typecheck`; provider de embedding fake injetado nos testes, sem rede

**Target Platform**: Servidor Linux com artefatos do modelo local disponíveis

**Project Type**: Serviço HTTP com camadas de model, service e controller

**Performance Goals**: Recall limitado a três resultados e comparação linear apenas nas memórias do usuário; carregar o modelo uma única vez por processo

**Constraints**: Similaridade por produto escalar de vetores normalizados; deduplicação `> 0.92`; filtro de recall `>= 0.3`; testes sem OpenRouter ou rede

**Scale/Scope**: Memórias particionadas por `userId`, sem busca entre usuários, sem autenticação ou gerenciamento de pesos do modelo

## Constitution Check

- Type-safe ESM: PASS — contratos e vetores terão tipos explícitos e o projeto continuará em `strict`.
- Validated boundaries: PASS — `userId`, operações de memória e `POST /chat` serão validados antes do domínio.
- Layered architecture: PASS — provider e store ficam em model/service; controller apenas integra o chat.
- Test-first delivery: PASS — testes de store, embeddings e integração HTTP serão determinísticos.
- Pure and secure code: PASS — nenhum teste usará credenciais ou rede; falhas do modelo serão propagadas.

## Project Structure

```text
src/
├── memory/
│   ├── embeddings.ts
│   └── memory-store.ts
├── models/
│   └── sequelize.ts
├── services/
│   └── chat.ts
└── http/
    └── server.ts

test/
├── memory-store.test.ts
├── embeddings.test.ts
└── http.test.ts

specs/005-semantic-memory/
├── plan.md
├── research.md
├── data-model.md
├── contracts/
│   └── chat.md
└── quickstart.md
```

**Structure Decision**: Manter a organização existente e adicionar o domínio de memória em `src/memory`. O `runChat` receberá opcionalmente um `MemoryStore`; quando `userId` existir, fará recall antes de compor o prompt de histórico e mensagem atual.

## Phase 0: Research

Decisões sobre pooling, normalização, serialização e injeção de provider estão registradas em [research.md](./research.md). O provider real ficará isolado atrás de uma função tipada para que o teste sem palavras em comum use embeddings fake determinísticos.

## Phase 1: Design

O modelo de dados, contrato HTTP e guia executável estão nos artefatos vinculados abaixo.

## Constitution Check (Post-Design)

- Validação permanece na borda HTTP e nas operações do store: PASS.
- Persistência e cálculo semântico permanecem separados do controller: PASS.
- O carregamento de modelo local não será escondido por fallback silencioso: PASS.
- O escopo não introduz autenticação, treinamento ou sincronização externa: PASS.

## Complexity Tracking

Nenhuma violação da constituição foi identificada.
