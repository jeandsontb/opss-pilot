# OpssPilot

OpssPilot é um copiloto de plantão que gerencia alertas e incidentes de produção. A APO é um grande agente LangChain/LangGraph sobre OpenRouter.

## Stack

- Node.js 22 LTS
- TypeScript ESM com `strict: true`
- `zod` na fronteira HTTP/CLI para validar entradas e saídas
- Testes com `node:test` via `tsx`
- Express com SQLite como banco

## Comandos

Definidos em `package.json`:

- `npm run dev`
- `npm run arena`
- `npm run bench`
- `npm run text`
- `npm run typecheck`

## Convenções

- Use camadas MVC: Model, Service e Controller.
- Valide toda entrada externa com `zod`.
- Traduza erros de domínio, definidos como classes, na borda.
- Toda lógica nova nasce com teste.
- Mantenha `npm run typecheck` e `npm test` sempre verdes.
- Nunca combine secrets nem leia `.env`.
- Prefira sempre funções puras.

## Fluxo

Siga o fluxo do Spec Kit (GitHub Copilot), nesta ordem:

`/speckit.specify -> plan -> task -> implement`

Specs devem ser versionadas.
