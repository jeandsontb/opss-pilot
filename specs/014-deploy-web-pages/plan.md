# Implementation Plan: Deploy do War Room Web no GitHub Pages

**Branch**: `014-deploy-web-pages` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/014-deploy-web-pages/spec.md`

---

## Summary

Implementação da esteira de CI/CD para publicação automatizada do frontend **War Room Web** (`web/`) no **GitHub Pages** utilizando **GitHub Actions** (`upload-pages-artifact@v3` e `deploy-pages@v4`), com permissões seguras baseadas em OIDC, controle de concorrência, fallback de rotas SPA (`404.html`) e atualização completa da documentação no `README.md`.

---

## Technical Context

**Language/Version**: GitHub Actions YAML, Node.js 22 LTS, Vite 6 + React 19 + TypeScript.

**Primary Dependencies**:
- Actions: `actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4`.
- Frontend: `web/dist` gerado via `npm run web:build`.

**Storage**: GitHub Pages CDN (distribuição estática de assets).

**Testing**: Validação local do build (`npm run web:build`), verificação de sintaxe de workflow e testes de link.

**Target Platform**: GitHub Actions CI/CD runner (`ubuntu-latest`) e GitHub Pages.

**Project Type**: Automação de CI/CD e documentação de repositório.

**Performance Goals**:
- Execução total do pipeline de build e deploy < 2 minutos.
- Cache eficiente de módulos npm no runner do Actions.

**Constraints**:
- Permissões mínimas necessárias (`contents: read`, `pages: write`, `id-token: write`).
- Concorrência com `cancel-in-progress: false` para evitar interrupções de deploy do Pages.
- Documentação clara e amigável no `README.md`.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio Constitucional | Status | Justificativa / Verificação |
|---|---|---|
| **I. Type-Safe ESM** | ✅ PASS | O build do frontend roda sob TypeScript strict com `tsc` e Node.js 22 LTS. |
| **II. Validated Boundaries** | ✅ PASS | O pipeline não altera contratos de dados ou APIs existentes. |
| **III. Layered Architecture** | ✅ PASS | Pipeline de CI/CD isolado em `.github/workflows/`. |
| **IV. Test-First Delivery** | ✅ PASS | A suíte de testes de backend e de build continuam passando sem regressões. |
| **V. Pure and Secure Code** | ✅ PASS | Nenhuma credencial ou token privado exposto no workflow; uso exclusivo de `GITHUB_TOKEN` com escopo mínimo. |
| **Diretrizes de Design** | ✅ PASS | Preservação total dos assets gerados em `web/dist/` sob a base `/opsspilot/`. |

---

## Project Structure

### Documentation (this feature)

```text
specs/014-deploy-web-pages/
├── spec.md              # Especificação de requisitos e histórias de usuário
├── plan.md              # Este plano de implementação
├── research.md          # Decisões de CI/CD, permissões e fallback SPA
├── data-model.md        # Esquema declarativo dos jobs e steps do Actions
├── quickstart.md        # Guia de teste e ativação do Pages no GitHub
├── contracts/
│   └── workflow.contract.md # Contrato YAML do GitHub Actions
└── checklists/
    └── requirements.md  # Checklist de validação da especificação
```

### Source Code (repository root)

```text
.github/
└── workflows/
    └── deploy-pages.yml  # Workflow de CI/CD para deploy no GitHub Pages

README.md                 # Documentação principal criada/atualizada com seção do War Room
```

---

## Complexity Tracking

*Nenhuma violação aos princípios da Constituição do OpssPilot.*
