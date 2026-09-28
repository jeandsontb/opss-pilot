# OpssPilot - Instruções para Agentes de IA

OpssPilot é um copiloto de plantão autônomo para gerenciar alertas e incidentes operacionais de produção. O núcleo de raciocínio é um agente LangChain / LangGraph integrado ao OpenRouter com múltiplos padrões estratégicos (ReAct, Plan-and-Execute e Reflection).

---

## 🛠 Stack Tecnológica

- **Runtime**: Node.js 22 LTS (ESM nativo)
- **Linguagem**: TypeScript com `strict: true`
- **API HTTP**: Express 
- **Persistência**: SQLite via `better-sqlite3` (arquivo local `opss_pilot.sqlite` ou `:memory:` para testes isolados)
- **Agentes & IA**: `@langchain/core`, `@langchain/openai`, `@langchain/langgraph` e `@huggingface/transformers`
- **Validação de Fronteira**: `zod` em todas as entradas e saídas HTTP e CLI
- **Testes**: `node:test` e `assert/strict` executados via `tsx`

---

## 🚀 Comandos de Desenvolvimento

Todos os scripts estão configurados no [package.json](file:///home/jeandson/DevProjects/pos-graduacao/opss-pilot/package.json):

- `npm run dev`: Inicia o servidor HTTP Express em `http://localhost:3000` conectado ao SQLite local.
- `npm test`: Executa toda a suíte de testes determinísticos offline com `node:test`.
- `npm run typecheck`: Executa a verificação estática de tipos (`tsc --noEmit`).
- `npm run arena`: Executa a comparação interativa de estratégias de raciocínio.
- `npm run bench`: Executa os testes de benchmark e cenários de resiliência.
- `npm run seed`: Popula o store operacional inicial com serviços e alertas.

---

## 📐 Convenções e Regras Arquiteturais

1. **Separação em Camadas (MVC)**:
   - `src/models/`: Entidades de domínio, stores e repositórios (`SqliteConversationStore`, `SqliteObservabilityRepository`, `SqliteMemoryStore`, `SqliteOperationalStore`).
   - `src/services/`: Lógica de negócio pura e orquestração (`chat.ts`, `incidents.ts`).
   - `src/http/`: Servidor Express, rotas, middlewares e schemas Zod de request/response.
   - `src/agents/`: Implementações de agentes (`react.ts`, `plan-and-execute.ts`, `reflection.ts`, `production-graph.ts`, `model.ts`).

2. **Banco de Dados 100% SQLite**:
   - **Não utilize Docker**: Todo o ecossistema roda localmente sem necessidade de containers de banco.
   - As tabelas são criadas automaticamente via `CREATE TABLE IF NOT EXISTS` no primeiro acesso.
   - Arquivos `.sqlite*` são ignorados no Git e mantidos localmente.

3. **Validação de Entradas e Saídas**:
   - Nenhuma entrada não validada atinge as camadas de serviço ou persistência.
   - Utilize sempre Schemas Zod na borda HTTP e CLI.

4. **Tratamento e Tradução de Erros**:
   - Erros de negócio são definidos como classes de erro de domínio (`NotFoundError`, `ConflictError`, `ConversationNotFoundError`, `ModelUnavailableError`).
   - O controller HTTP traduz esses erros em códigos de status HTTP explícitos (400, 404, 422, 503, 504).

5. **Testabilidade e Qualidade**:
   - Testes unitários e de integração não devem depender de rede externa ou chaves reais de API.
   - Sempre utilize test doubles / in-memory ou SQLite `:memory:`.
   - Antes de concluir qualquer tarefa, certifique-se de que `npm run typecheck` e `npm test` estejam passando com 0 erros.

6. **Diretrizes de Design Web (`web/**`)**:
   - Para qualquer desenvolvimento na pasta `web/`, siga as regras em [.agents/rules/design.md](file:///home/jeandson/DevProjects/pos-graduacao/opss-pilot/.agents/rules/design.md) e [.github/instructions/designn.instrucions.md](file:///home/jeandson/DevProjects/pos-graduacao/opss-pilot/.github/instructions/designn.instrucions.md).
   - Abrange hierarquia visual e tipográfica, escala geométrica de espaçamento (múltiplos de 4px/8px), estados vazios e de erro, tema escuro (Dark Mode com tokens CSS) e acessibilidade (WCAG 2.1 AA).

---

## 📋 Metodologia Spec Kit (Spec-Driven Development)

O projeto adota o fluxo de especificação do **Spec Kit**:

```text
/speckit-specify ➔ /speckit-plan ➔ /speckit-tasks ➔ /speckit-implement
```

As especificações versionadas estão localizadas no diretório [specs/](file:///home/jeandson/DevProjects/pos-graduacao/opss-pilot/specs).

As skills do Spec Kit estão disponíveis e registradas para Antigravity em [.agents/skills/](file:///home/jeandson/DevProjects/pos-graduacao/opss-pilot/.agents/skills) e para GitHub Copilot em [.github/skills/](file:///home/jeandson/DevProjects/pos-graduacao/opss-pilot/.github/skills):

- `speckit-specify`: Cria ou atualiza a especificação a partir de requisitos do usuário.
- `speckit-plan`: Converte a especificação em plano técnico de arquitetura.
- `speckit-tasks`: Quebra o plano em lista de tarefas executáveis e ordenadas.
- `speckit-implement`: Executa a implementação das tarefas de forma incremental.
- `speckit-checklist`, `speckit-clarify`, `speckit-analyze`, `speckit-converge`, `speckit-constitution`, `speckit-taskstoissues`.
