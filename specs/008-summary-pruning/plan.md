# Implementation Plan: Sumarização de Histórico (Pruning)

**Branch**: `008-summary-pruning` | **Date**: 2026-09-24 | **Spec**: [spec.md](./spec.md)

## Summary

Compactar mensagens antigas em blocos de oito, mantendo as oito mensagens mais recentes e um resumo corrente por conversa. O serviço de chat acionará uma interface de sumarização somente quando houver um novo bloco completo de oito mensagens fora da janela, mesclará o resultado ao resumo anterior, persistirá a versão validada e emitirá um evento `summarize`.

## Technical Context

**Language/Version**: TypeScript ESM, Node.js 22 LTS, `strict: true`

**Primary Dependencies**: Express, Zod, SQLite, LangChain/OpenRouter, `node:test` via `tsx`

**Storage**: `conversation_summaries` em SQLite, com store em memória para testes

**Testing**: `npm test`, `npm run typecheck`, testes fake determinísticos

**Target Platform**: Servidor Linux com API HTTP Express

**Project Type**: Serviço web com camadas Model, Service e Controller

**Performance Goals**: Nenhuma chamada de sumarização sem bloco novo de oito; processamento linear no bloco compactado

**Constraints**: janela fixa de 8 mensagens; resumo alvo de ~150 tokens; sem persistência parcial em falhas; isolamento por conversa; sem rede nos testes

**Scale/Scope**: Um resumo corrente por conversa; mensagens originais continuam persistidas; sem endpoint manual de edição na primeira versão

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Type-safe ESM e `strict: true`: PASS
- Fronteiras e dados persistidos validados com Zod: PASS
- Camadas Model, Service e Controller: PASS
- Testes fake offline antes da integração real: PASS
- Falhas explícitas e sem persistência parcial: PASS
- Nenhum segredo ou conteúdo de `.env`: PASS

## Project Structure

### Documentation (this feature)

```text
specs/008-summary-pruning/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── summary-service.md
│   └── chat-context.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── agents/
│   ├── summarizer.ts
│   └── types.ts
├── models/
│   ├── conversation-summary.ts
│   └── conversation-store.ts
├── services/
│   ├── conversation-summary.ts
│   └── chat.ts
├── http/
│   └── server.ts
└── context/
    └── tokens.ts

test/
├── conversation-summary.test.ts
├── chat.test.ts
└── http.test.ts
```

**Structure Decision**: O projeto single-project existente será preservado. O model representa o registro persistido, o service decide o pruning e compõe o contexto, a interface de agente permite implementação real ou fake, e o controller valida o resultado já produzido pelo serviço.

## Phase 0: Research

Decisões sobre limiar, contador, mesclagem, isolamento e falhas estão em [research.md](./research.md).

## Phase 1: Design

O modelo está em [data-model.md](./data-model.md), os contratos estão em [contracts/](./contracts/) e os cenários executáveis estão em [quickstart.md](./quickstart.md).

## Constitution Check (Post-Design)

- O resumo é produzido por interface substituível e testável sem rede: PASS
- O store só é atualizado após saída não vazia validada: PASS
- O contador persistido impede sumarização a cada request: PASS
- O contexto recente continua limitado a oito mensagens: PASS
- O evento `summarize` é tipado e observável: PASS
- Não há alteração de stack ou endpoint desnecessário: PASS

## Complexity Tracking

Nenhuma violação da constituição foi identificada.
