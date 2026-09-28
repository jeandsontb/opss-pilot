# Implementation Plan: Instrumentação de Tokens e Contexto

**Branch**: `007-instrumenta-tokens-contexto` | **Date**: 2026-09-24 | **Spec**: [spec.md](./spec.md)

## Summary

Adicionar uma função determinística de estimativa `chars / 4`, propagar uso real
de prompt observado nas respostas do LangChain e incluir no `/chat` tanto
`promptTokens` quanto uma decomposição estimada por mensagem atual, histórico e
memórias. O script `conversa-longa.sh` exibirá o valor por turno sem depender de
rede nos testes.

## Technical Context

**Language/Version**: TypeScript ESM, Node.js 22 LTS, `strict: true`

**Primary Dependencies**: LangChain/OpenRouter, Zod, Express, Node.js shell tooling, `node:test` via `tsx`

**Storage**: Nenhuma alteração de persistência; dados calculados por requisição

**Testing**: `npm test`, `npm run typecheck`, testes fake de estratégia e uso

**Target Platform**: Servidor Linux e shell POSIX

**Project Type**: Serviço HTTP com estratégias de raciocínio e scripts de diagnóstico

**Performance Goals**: Estimativas O(n) no tamanho das fontes; nenhuma chamada adicional de modelo

**Constraints**: uso real tem precedência; ausência é `null`; decomposição é estimada; contrato existente permanece compatível

**Scale/Scope**: Uma métrica por resposta e uma linha por turno do script; sem tokenização local específica de modelo

## Constitution Check

- Type-safe ESM e `strict: true`: PASS
- Entrada/saída HTTP e uso externo validados com Zod: PASS
- Separação entre cálculo de contexto, serviço de chat e controller: PASS
- Testes offline antes da implementação: PASS
- Nenhuma credencial ou conteúdo sensível é armazenado por esta feature: PASS

## Project Structure

### Documentation

```text
specs/007-instrumenta-tokens-contexto/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    ├── chat-metrics.md
    └── long-conversation.md
```

### Source Code

```text
src/
├── context/
│   └── tokens.ts
├── agents/
│   └── types.ts
├── services/
│   └── chat.ts
└── http/
    └── server.ts

scripts/
└── conversa-longa.sh

test/
├── tokens.test.ts
├── chat.test.ts
└── long-conversation.test.ts
```

**Structure Decision**: O cálculo puro fica em `src/context/tokens.ts`. As
estratégias propagam metadados de uso real através de `ReasoningResult.metrics`;
`runChat` acrescenta a decomposição das fontes conhecidas, e o controller valida
o novo contrato de resposta.

## Phase 0: Research

Decisões registradas em [research.md](./research.md): extração defensiva dos
formatos de usage do LangChain, `null` para uso indisponível, estimativa
`chars/4` por fonte e script POSIX com saída estável.

## Phase 1: Design

Entidades e regras estão em [data-model.md](./data-model.md), contratos em
[contracts/](./contracts/) e validação executável em [quickstart.md](./quickstart.md).

## Constitution Check (Post-Design)

- O uso real é tratado como dado externo validado e não é inventado quando ausente: PASS.
- A decomposição não altera o prompt nem o comportamento das estratégias: PASS.
- A compatibilidade das métricas atuais é preservada com campos adicionais: PASS.
- Testes do script usam execução local/fake e não OpenRouter: PASS.

## Complexity Tracking

Nenhuma violação da constituição foi identificada.
