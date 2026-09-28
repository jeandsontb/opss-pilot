# Implementation Plan: Refletor de Aprendizado

**Branch**: `006-refletor-aprendizado` | **Date**: 2026-09-24 | **Spec**: [spec.md](./spec.md)

## Summary

Adicionar um refletor pós-resposta que analisa somente a última mensagem original
do usuário com saída estruturada `{ hasLearning, fact }`. Fatos duráveis e não
sensíveis serão encaminhados de forma assíncrona ao `MemoryStore` existente.
Também será adicionada a ferramenta `forget_preference`, com validação e
isolamento por `userId`, sem bloquear nem alterar a resposta principal.

## Technical Context

**Language/Version**: TypeScript ESM, Node.js 22 LTS, `strict: true`

**Primary Dependencies**: `@langchain/openai`, `@langchain/core`, Zod, Express, Sequelize e `MemoryStore`

**Storage**: `MemoryStore` injetável; persistência existente em memória/SQLite

**Testing**: `node:test` via `tsx`, provider estruturado fake e store fake, sem rede

**Target Platform**: Servidor Linux com OpenRouter configurado

**Project Type**: Serviço HTTP Express com agentes LangChain/LangGraph

**Performance Goals**: O caminho principal não aguarda reflexão nem `remember`; falhas assíncronas não alteram a resposta

**Constraints**: somente última mensagem do usuário; temperatura 0; saída estruturada; pedidos pontuais e segredos nunca persistidos; logs sem conteúdo sensível

**Scale/Scope**: Uma reflexão por resposta bem-sucedida e uma memória por fato deduplicado; sem nova rota HTTP para `remember`

## Constitution Check

- Type-safe ESM e `strict: true`: PASS
- Fronteiras HTTP, CLI e tool arguments validadas com Zod: PASS
- Camadas model/service/controller preservadas: PASS
- Testes determinísticos antes da implementação: PASS
- Segredos não são persistidos nem enviados a logs: PASS

## Project Structure

### Documentation

```text
specs/006-refletor-aprendizado/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    ├── reflection.md
    └── forget-preference.md
```

### Source Code

```text
src/
├── agents/
│   ├── learning-reflector.ts
│   └── tools.ts
├── memory/
│   └── memory-store.ts
├── services/
│   └── chat.ts
└── http/
    └── server.ts

test/
├── learning-reflector.test.ts
├── tools.test.ts
└── http.test.ts
```

**Structure Decision**: O refletor ficará na camada de agentes, o disparo
assíncrono será coordenado pelo serviço de chat, e `forget_preference` ficará
junto das tools existentes. O controller apenas valida `userId` e fornece as
dependências; regras de elegibilidade e persistência permanecem no domínio.

## Phase 0: Research

As decisões desta feature estão registradas em [research.md](./research.md):
saída estruturada com schema Zod, execução fire-and-forget com observabilidade,
sanitização conservadora antes de `remember` e tool de remoção com escopo por
usuário.

## Phase 1: Design

O modelo de dados, os contratos de reflexão/tool e o guia de validação estão
em [data-model.md](./data-model.md), [contracts/](./contracts/) e
[quickstart.md](./quickstart.md).

## Constitution Check (Post-Design)

- A reflexão não expõe secrets e não bloqueia o caminho principal: PASS.
- O provider estruturado é injetável e os testes não dependem de OpenRouter: PASS.
- `forget_preference` valida argumentos e delega a remoção ao `MemoryStore`: PASS.
- Métricas existentes do chat não são alteradas pela tarefa assíncrona: PASS.

## Complexity Tracking

Nenhuma violação da constituição foi identificada.
