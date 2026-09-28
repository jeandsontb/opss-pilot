# Implementation Plan: ContextBuilder com Orçamento por Seção

**Branch**: `009-context-builder` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

## Summary

Extrair a composição de prompts para um `ContextBuilder` puro e compartilhado,
com budgets independentes para resumo, janela recente e memórias. Os budgets
serão carregados das variáveis `CONTEXT_BUDGET_*`, validados como inteiros não
negativos e aplicados com cortes determinísticos: resumo por texto, janela das
mensagens mais antigas e memórias por menor score. System prompt e mensagem
atual permanecerão intocados.

## Technical Context

**Language/Version**: TypeScript ESM, Node.js 22 LTS, `strict: true`

**Primary Dependencies**: Zod, Express, LangChain/OpenRouter, `node:test` via `tsx`

**Storage**: Nenhuma alteração de persistência; usa resumo, histórico e memórias já carregados pelo chat

**Testing**: `npm test`, `npm run typecheck`, testes puros e estratégias fake offline

**Target Platform**: Servidor Linux com API HTTP Express

**Project Type**: Serviço web com camadas Model, Service e Controller

**Performance Goals**: Construção linear nas fontes recebidas; nenhum corte ou parsing de budget deve gerar chamada de modelo

**Constraints**: System e mensagem atual imutáveis; defaults 200/1200/300; budgets inválidos falham explicitamente; estimativas não substituem usage real

**Scale/Scope**: Uma composição por request; budgets apenas para resumo, janela e memórias; sem budget separado para tools, trace ou resposta

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Type-safe ESM e `strict: true`: PASS
- Entradas de ambiente e saída de contexto validadas: PASS
- Separação entre contexto, serviço de chat e estratégias: PASS
- Testes offline e determinísticos: PASS
- System/mensagem preservados e sem secrets: PASS

## Project Structure

### Documentation (this feature)

```text
specs/009-context-builder/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── context-builder.md
│   └── strategy-integration.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── context/
│   ├── context-builder.ts
│   └── tokens.ts
├── services/
│   └── chat.ts
├── agents/
│   ├── types.ts
│   ├── react.ts
│   └── plan-and-execute.ts
└── http/
    └── server.ts

test/
├── context-builder.test.ts
├── chat.test.ts
├── http.test.ts
└── strategy-context.test.ts
```

**Structure Decision**: O projeto single-project existente será mantido. O
`ContextBuilder` concentra parsing, serialização e cortes; `runChat` fornece as
fontes e entrega o prompt final a qualquer `ReasoningStrategy`. As estratégias
não duplicam composição. O controller valida apenas fronteiras HTTP e traduz
erros de configuração conforme o padrão existente.

## Phase 0: Research

Decisões sobre medição, cortes, defaults, empates e propagação estão em
[research.md](./research.md).

## Phase 1: Design

Tipos e invariantes estão em [data-model.md](./data-model.md), contratos em
[contracts/](./contracts/) e validação executável em [quickstart.md](./quickstart.md).

## Constitution Check (Post-Design)

- O builder é puro para uma entrada e configuração dadas: PASS
- Valores de ambiente são validados antes de afetar o prompt: PASS
- System e mensagem não passam por truncamento: PASS
- Janela e memórias possuem ordem de corte determinística: PASS
- Todas as estratégias recebem o mesmo prompt produzido no serviço: PASS
- Usage real continua separado da estimativa usada pelos budgets: PASS

## Complexity Tracking

Nenhuma violação da constituição foi identificada.
