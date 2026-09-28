# OpssPilot Constitution

## Mission

OpssPilot é um copiloto de plantão para gerenciar alertas e incidentes de
produção. A APO é um agente LangChain/LangGraph sobre OpenRouter.

## Core Principles

### I. Type-Safe ESM

O projeto deve usar Node.js 22 LTS, TypeScript em modo ESM e
`strict: true`. Alterações devem preservar a segurança de tipos e passar por
`npm run typecheck`.

### II. Validated Boundaries

Toda entrada e saída nas fronteiras HTTP e CLI deve ser validada com `zod`.
Dados externos não podem alcançar a lógica de domínio sem validação explícita.

### III. Layered Architecture

O código deve seguir as camadas Model, Service e Controller. Erros de domínio
devem ser representados por classes próprias e traduzidos na borda da
aplicação.

### IV. Test-First Delivery

Toda lógica nova deve nascer acompanhada de teste. Os testes devem usar
`node:test` via `tsx`, e `npm test` deve permanecer verde junto com
`npm run typecheck`.

### V. Pure and Secure Code

Prefira funções puras e minimize efeitos colaterais. Nunca combine ou exponha
secrets, nunca leia `.env` no terminal e nunca versione credenciais.

## Technical Standards

- Runtime: Node.js 22 LTS.
- Linguagem e módulos: TypeScript ESM.
- Validação: `zod`.
- Agentes e orquestração: `@langchain/core`, `@langchain/openai` e
  `@langchain/langgraph`, usando OpenRouter.
- API: Express.
- Persistência: SQLite.
- Testes: `node:test` via `tsx`.

## Required Workflow

Toda mudança deve seguir o fluxo do Spec Kit (GitHub Copilot), nesta ordem:

`/speckit.specify -> plan -> task -> implement`

Specs devem ser versionadas no repositório.

## Governance

Esta constituição define os padrões obrigatórios do projeto. Alterações de
arquitetura, stack ou princípios devem atualizar este documento na mesma
mudança e ser revisadas junto com a spec correspondente.
