# Data Model & Workflow Schema: Deploy GitHub Pages

**Feature**: `014-deploy-web-pages`  
**Date**: 2026-09-25  
**Spec**: [spec.md](./spec.md)

---

## 1. Modelo Declarativo do Pipeline CI/CD

### 1.1 `PagesWorkflowJob`
Representa a divisão de responsabilidades dos jobs no GitHub Actions.

| Job | Dependência | Runner | Responsabilidade |
|---|---|---|---|
| `build` | Nenhuma | `ubuntu-latest` | Checkout do código, setup do Node 22, instalação de dependências, build do Vite (`web:build`), geração do fallback `404.html` e upload do artefato. |
| `deploy` | `needs: build` | `ubuntu-latest` | Recuperação do artefato do Pages e publicação segura no environment `github-pages`. |

---

### 1.2 `WorkflowStepDefinition`

```text
Job: build
├── Step 1: actions/checkout@v4
├── Step 2: actions/setup-node@v4 (node-version: 22, cache: 'npm')
├── Step 3: Install root & web dependencies (npm ci / npm install)
├── Step 4: Build web SPA (npm run web:build)
├── Step 5: Setup SPA fallback (cp web/dist/index.html web/dist/404.html)
└── Step 6: actions/upload-pages-artifact@v3 (path: 'web/dist')

Job: deploy
├── Environment: github-pages (url: ${{ steps.deployment.outputs.page_url }})
└── Step 1: actions/deploy-pages@v4
```

---

## 2. Estrutura de Documentação do README

```text
README.md
├── 1. Header (Logo, Título, Badges de CI/CD e Tech Stack)
├── 2. Visão Geral do OpssPilot
├── 3. 🌐 War Room Web (GitHub Pages)
│   ├── Link de Acesso Público
│   ├── Como conectar com a API Backend (Menu Engrenagem ⚙️)
│   └── Configuração de CORS
├── 4. 🚀 Comandos de Desenvolvimento (Backend & Frontend)
├── 5. 🛠 Arquitetura do Sistema e Grafo de Decisão
└── 6. 📐 Metodologia Spec Kit & Testes
```
