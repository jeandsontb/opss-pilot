# 🛡️ OpssPilot

[![Deploy War Room to GitHub Pages](https://github.com/jeandson/opss-pilot/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/jeandson/opss-pilot/actions/workflows/deploy-pages.yml)
[![Node.js Version](https://img.shields.io/badge/node-22%20LTS-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-strict%20true-blue.svg)](https://www.typescriptlang.org/)
[![Database](https://img.shields.io/badge/database-SQLite%20(zero%20docker)-yellow.svg)](https://www.sqlite.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> **OpssPilot** é um copiloto autônomo de plantão para gerenciar alertas, diagnosticar falhas e orquestrar incidentes operacionais de produção. O núcleo de raciocínio utiliza um grafo unificado com agentes **LangChain / LangGraph** sobre **OpenRouter** combinando as estratégias **ReAct**, **Plan-and-Execute** e **Reflection**, persistido 100% localmente em **SQLite** (sem dependência de contêineres Docker).

---

## 🌐 War Room Web (GitHub Pages)

O OpssPilot disponibiliza uma interface web interativa de War Room construída com **Vite**, **React 19**, **TypeScript** e **Design Tokens em Vanilla CSS**, publicada continuamente no **GitHub Pages**:

🔗 **Acesse o War Room online**: [https://jeandson.github.io/opss-pilot/](https://jeandson.github.io/opss-pilot/)

### ✨ Recursos do War Room Web
- **💬 Chat Operacional em Tempo Real**: Envio de comandos e alertas com persistência automática de contexto da conversa (`conversationId`).
- **🧠 Ver Raciocínio (Trace Viewer)**: Drawer lateral que detalha passo a passo a linha do tempo de nós do agente (`route`, `thought`, `action`, `observation`, `plan`, `critique`, `fallback`) e métricas de latência e tokens.
- **⚠️ Cartão de Decisão Human-in-the-Loop (HTTP 202)**: Ações operacionais críticas geram cartões de segurança com botões de **"Aprovar"** e **"Negar"** antes da execução.
- **⚙️ Configuração Dinâmica da API**: Diálogo acessível pelo ícone de engrenagem para apontar a interface web para qualquer endpoint de backend (local ou nuvem), com teste de conexão em tempo real (`GET /health`).
- **🌗 Dark Mode Nativo**: Interface rica baseada em tons escuros de ardósia e grafite com alternador dinâmico de tema e conformidade com acessibilidade **WCAG 2.1 AA**.

---

## 🔌 Como Conectar o War Room ao seu Backend Local

Como o War Room é servido no GitHub Pages de forma estática, você pode conectá-lo facilmente ao backend Express rodando na sua máquina local:

1. **Inicie o backend localmente**:
   ```bash
   npm run dev
   # Servidor rodando em http://localhost:3000
   ```
2. **Abra o War Room no navegador**:
   - Acesse [https://jeandson.github.io/opss-pilot/](https://jeandson.github.io/opss-pilot/) (ou rode localmente com `npm run web:dev`).
3. **Configure a Conexão**:
   - Clique no ícone de engrenagem (⚙️) no canto superior direito do cabeçalho.
   - No campo **URL Base da API**, informe: `http://localhost:3000`.
   - Clique em **"Testar Conexão (/health)"** para validar a conectividade e o suporte a CORS.
   - Clique em **"Salvar Configurações"**.
4. Pronto! Suas mensagens serão enviadas diretamente para a sua instância local do copiloto.

---

## 🚀 Comandos de Desenvolvimento

Todos os scripts estão configurados no [`package.json`](file:///home/jeandson/DevProjects/pos-graduacao/opss-pilot/package.json):

```bash
# Iniciar o backend Express conectado ao SQLite local
npm run dev

# Iniciar o frontend War Room Web em modo de desenvolvimento
npm run web:dev

# Compilar o frontend estático para produção (com fallback 404 para o Pages)
npm run web:build

# Executar toda a suíte de testes determinísticos offline (55 testes)
npm test

# Executar checagem estática de tipos TypeScript
npm run typecheck

# Executar comparação interativa de estratégias de raciocínio
npm run arena

# Executar benchmarks de resiliência e tokens
npm run bench

# Popular banco SQLite inicial com serviços e alertas
npm run seed
```

---

## 🛠 Stack Tecnológica

| Camada | Tecnologias Utilizadas |
|---|---|
| **Runtime & Linguagem** | Node.js 22 LTS (ESM nativo) com TypeScript em `strict: true` |
| **Backend & API** | Express com middleware nativo de CORS e preflight `OPTIONS` |
| **Banco de Dados** | SQLite local via `better-sqlite3` (modo WAL e foreign keys ativas, zero Docker) |
| **Agentes & IA** | `@langchain/core`, `@langchain/openai`, `@langchain/langgraph` e `@huggingface/transformers` |
| **Validação de Fronteiras** | `zod` em todas as entradas e saídas HTTP e CLI |
| **Frontend Web** | React 19, TypeScript, Vite com base path `/opsspilot/` e Vanilla CSS Tokens |
| **CI/CD & Deploy** | GitHub Actions (`upload-pages-artifact@v3` + `deploy-pages@v4`) no GitHub Pages |

---

## 🏗 Arquitetura do Sistema

```mermaid
graph TD
    User([Operador SRE]) <--> UI[War Room Web - GitHub Pages]
    UI <-->|POST /chat (CORS)| Server[Express API Server]
    Server <--> Graph[Grafo Unificado de Raciocínio]
    Graph <--> Router{Roteador do Agente}
    Router -->|ReAct| StratReact[Estratégia ReAct]
    Router -->|Plan & Execute| StratPlan[Estratégia Plan & Execute]
    Router -->|Reflection| StratReflect[Estratégia Reflection]
    StratReact <--> Tools[Ferramentas Operacionais]
    Tools <--> DB[(SQLite: opss_pilot.sqlite)]
    Server <--> DB
```

---

## 📐 Metodologia Spec Kit (Spec-Driven Development)

O projeto adota o fluxo de especificação rigoroso do **Spec Kit**:

```text
/speckit.specify ➔ /speckit.plan ➔ /speckit.tasks ➔ /speckit.implement
```

As especificações versionadas encontram-se no diretório [`specs/`](file:///home/jeandson/DevProjects/pos-graduacao/opss-pilot/specs):
- [`specs/013-war-room-web/`](file:///home/jeandson/DevProjects/pos-graduacao/opss-pilot/specs/013-war-room-web): Interface web War Room com trace tipado e Human-in-the-loop.
- [`specs/014-deploy-web-pages/`](file:///home/jeandson/DevProjects/pos-graduacao/opss-pilot/specs/014-deploy-web-pages): Pipeline de CI/CD para deploy no GitHub Pages e documentação.

---

## 📄 Licença

Este projeto é desenvolvido para fins acadêmicos e operacionais sob a licença MIT.
