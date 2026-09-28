# Implementation Plan: Conversas Persistentes

**Branch**: `004-persistent-conversations` | **Date**: 2026-09-24 | **Spec**: [spec.md](./spec.md)

## Summary

Adicionar um contrato `ConversationStore`, uma implementação em memória e a composição de histórico ao fluxo HTTP de chat. Cada requisição criará ou reutilizará uma conversa, recuperará até 12 mensagens anteriores, executará a estratégia com o contexto explicitamente delimitado, persistirá usuário e assistente após sucesso e retornará `conversationId` e `historyMessages`.

## Technical Context

**Language/Version**: TypeScript ESM, Node.js 22 LTS, `strict: true`

**Primary Dependencies**: Express, Zod, Sequelize existente, `node:test` via `tsx`

**Storage**: `ConversationStore` em memória para testes; persistência SQLite compatível com a tabela `messages`

**Testing**: `npm test`, `npm run typecheck`, testes de integração com `fetch` e fake determinístico

**Target Platform**: Servidor Linux executando Node.js

**Project Type**: Serviço HTTP

**Performance Goals**: Recuperar no máximo 12 mensagens históricas por requisição e preservar o timeout HTTP existente de 180 segundos

**Constraints**: Não fazer chamadas externas nos testes; validar entradas e saídas HTTP com Zod; não persistir resposta de assistente quando a estratégia falhar

**Scale/Scope**: Uma conversa por `conversationId`, mensagens `user`/`assistant`, histórico limitado a 12 itens

## Constitution Check

- Type-safe ESM: PASS — interfaces e schemas serão tipados em TypeScript strict.
- Validated boundaries: PASS — request e response continuam validados com Zod.
- Layered architecture: PASS — store/model separado do fluxo HTTP/controller.
- Test-first delivery: PASS — testes determinísticos cobrirão store e endpoint.
- Pure and secure code: PASS — testes não leem credenciais nem acessam rede externa.

## Project Structure

```text
src/
├── agents/
│   ├── types.ts
│   └── index.ts
├── http/
│   └── server.ts
├── models/
│   ├── conversation-store.ts
│   └── sequelize.ts
└── services/
    └── chat.ts

test/
├── conversation-store.test.ts
└── http.test.ts

specs/004-persistent-conversations/
├── plan.md
├── research.md
├── data-model.md
├── contracts/chat.md
└── quickstart.md
```

**Structure Decision**: Manter o serviço Express existente e introduzir uma camada de serviço `runChat` entre o controller HTTP e as estratégias. O store será injetável, permitindo o fake em memória nos testes e uma implementação Sequelize futura/compatível.

## Phase 0: Research

As decisões necessárias são locais: o contrato de estratégia atual recebe texto, portanto a composição será uma string estruturada com histórico e mensagem atual; a persistência seguirá o modelo Sequelize existente sem exigir conexão nos testes.

## Phase 1: Design

O modelo de dados, contrato HTTP e guia de validação estão nos artefatos vinculados abaixo.

## Complexity Tracking

Nenhuma violação da constituição foi identificada.
