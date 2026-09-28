# Implementation Plan: War Room Web OpssPilot

**Branch**: `013-war-room-web` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/013-war-room-web/spec.md`

---

## Summary

Implementação da interface web **War Room** do OpssPilot utilizando **Vite + React + TypeScript** na pasta `web/`, configurada com a rota base `/opsspilot/`, conectada à API Express (`POST /chat` e `GET /health`) com suporte completo a CORS no backend.

A interface inclui:
1. Chat operacional em tempo real com histórico persistente de conversação (`conversationId`).
2. Visualizador estruturado e tipado de raciocínio ("Ver Raciocínio") exibindo cada passo do trace do grafo do agente.
3. Tratamento de respostas de ação pendente (HTTP 202) convertidas em cartões de aprovação/rejeição humana (*Human-in-the-loop*).
4. Menu de configurações (ícone de engrenagem) com ajuste e teste da URL base da API e persistência em `localStorage`.
5. Conformidade integral com as instruções de design ([.agents/rules/design.md](file:///home/jeandson/DevProjects/pos-graduacao/opss-pilot/.agents/rules/design.md)): Dark Mode rico e nativo, escala geométrica de espaçamento (múltiplos de 4/8px), estados vazios e de erro robustos e acessibilidade WCAG 2.1 AA.

---

## Technical Context

**Language/Version**: Node.js 22 LTS, TypeScript 5.8+ com `strict: true` em ESM nativo.

**Primary Dependencies**:
- Frontend: `react`, `react-dom`, `vite`, `@types/react`, `@types/react-dom`, `zod`.
- Backend: `express`, `cors` (ou middleware CORS nativo), `zod`, `better-sqlite3`.

**Storage**: `localStorage` no navegador para persistência de `ApiConfiguration` (URL base, tema) e SQLite local no backend (`opss_pilot.sqlite`).

**Testing**: `node:test` com `tsx` e testes unitários/componentes do cliente via runners de teste determinísticos.

**Target Platform**: Navegadores modernos (Chrome, Firefox, Safari, Edge) em desktop e tablets.

**Project Type**: Web Application SPA (Single Page Application) servida sob o path `/opsspilot/` consumindo API REST HTTP.

**Performance Goals**:
- Carregamento inicial da interface sob a rota base < 1s.
- Abertura do visualizador de raciocínio < 200ms.
- 0 Cumulative Layout Shift (CLS) utilizando skeleton loaders.

**Constraints**:
- Cumprimento total das regras de design [.agents/rules/design.md](file:///home/jeandson/DevProjects/pos-graduacao/opss-pilot/.agents/rules/design.md).
- Suporte a Cross-Origin Resource Sharing (CORS) em todas as rotas do backend.
- Sem bibliotecas CSS volumosas desnecessárias (uso estrito de Vanilla CSS com tokens semânticos).

**Scale/Scope**: Painel único com layout responsivo (Header com status de conexão e engrenagem, feed de chat central, input com ações e Drawer lateral retrátil de raciocínio).

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio Constitucional | Status | Justificativa / Verificação |
|---|---|---|
| **I. Type-Safe ESM** | ✅ PASS | Todo o frontend e backend rodam com TypeScript estrito (`strict: true`) e módulos ESM nativos. |
| **II. Validated Boundaries** | ✅ PASS | Todas as respostas de API e dados de entrada são validados com Schemas Zod na borda do cliente e do servidor. |
| **III. Layered Architecture** | ✅ PASS | Frontend modularizado em `services/api`, `components/`, `types/` e `styles/`; backend preservando a separação MVC. |
| **IV. Test-First Delivery** | ✅ PASS | Suíte com testes de contrato, validação de schemas Zod e testes de rotas do Express com CORS. |
| **V. Pure and Secure Code** | ✅ PASS | Nenhuma credencial ou secret exposta; configurações salvas apenas localmente no cliente. |
| **Diretrizes de Design Web** | ✅ PASS | Conformidade com hierarquia visual, espaçamento de 4/8px, dark mode, estados vazios/erro e acessibilidade WCAG 2.1 AA. |

---

## Project Structure

### Documentation (this feature)

```text
specs/013-war-room-web/
├── spec.md              # Especificação de negócio e histórias de usuário
├── plan.md              # Este plano técnico de arquitetura
├── research.md          # Decisões arquiteturais fundamentadas
├── data-model.md        # Entidades, tipos e schemas Zod do frontend
├── quickstart.md        # Guia prático de inicialização e teste
├── contracts/
│   └── chat-api.contract.md # Contrato HTTP, status 200/202 e cabeçalhos CORS
└── checklists/
    └── requirements.md  # Checklist de validação da especificação
```

### Source Code (repository root)

```text
# Backend API (existente, enriquecida com CORS e suporte 202)
src/
├── http/
│   ├── server.ts         # Adição de middleware CORS e suporte preflight OPTIONS
│   └── ...
└── ...

# Frontend War Room Web
web/
├── index.html            # Ponto de entrada HTML com title e viewport acessível
├── vite.config.ts        # Configuração do Vite com base: '/opsspilot/'
├── package.json          # Dependências do frontend (React, Vite, TS, Zod)
├── tsconfig.json         # Configuração TypeScript strict para o frontend
└── src/
    ├── main.tsx          # Inicialização do React
    ├── App.tsx           # Componente raiz do War Room
    ├── styles/
    │   ├── tokens.css    # Tokens de cores (dark-first), espaçamento 4/8px, sombras
    │   └── global.css    # Resets, tipografia e estilos globais acessíveis
    ├── types/
    │   └── chat.ts       # Tipos TypeScript derivados de schemas Zod
    ├── services/
    │   ├── api.ts        # Cliente HTTP com fetch, timeout e validação Zod
    │   └── storage.ts    # Persistência de configurações e preferências no localStorage
    └── components/
        ├── Header.tsx        # Barra superior com status da API, tema e engrenagem
        ├── SettingsModal.tsx # Diálogo de configuração de URL da API e teste de conexão
        ├── ChatFeed.tsx      # Área de rolagem de mensagens com empty states
        ├── ChatMessage.tsx   # Mensagem individual (usuário / copiloto)
        ├── DecisionCard.tsx  # Cartão Human-in-the-loop para respostas HTTP 202
        ├── ChatInput.tsx     # Campo de digitação com atalhos de envio
        └── TraceDrawer.tsx   # Painel lateral colapsável com visualização do raciocínio
```

**Structure Decision**: Adotada a estrutura padrão de aplicação web desacoplada (`web/` para o frontend SPA com Vite e `src/` para o backend Express), permitindo que ambos sejam executados juntos ou isolados em produção sob o path `/opsspilot/`.

---

## Complexity Tracking

*Nenhuma violação aos princípios da Constituição do OpssPilot. A arquitetura reutiliza 100% dos padrões já estabelecidos no projeto.*
