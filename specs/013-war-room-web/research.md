# Research & Architectural Decisions: War Room Web OpssPilot

**Feature**: `013-war-room-web`  
**Date**: 2026-09-25  
**Spec**: [spec.md](./spec.md)

---

## 1. Estrutura e Ferramental do Frontend (`web/`)

- **Decisão**: Utilizar **Vite + React (TypeScript)** dentro da pasta `web/` do repositório, com `base: "/opsspilot/"` configurado no `vite.config.ts`.
- **Racional**:
  - Vite oferece inicialização instantânea (HMR ultrarrápido) e compilação otimizada em ESM nativo, alinhando-se aos princípios da Constituição do projeto.
  - A rota base `/opsspilot/` garante que os assets estáticos gerados em build (`dist/`) e as rotas em modo de desenvolvimento funcionem sob o prefixo correto, tanto em servidores locais de desenvolvimento quanto servidos diretamente pelo Express via `express.static`.
- **Alternativas Consideradas**:
  - *Next.js*: Descartado por ser desnecessariamente complexo para uma SPA de controle operacional conectada a uma API Express já existente.
  - *Vanilla JS sem framework*: Descartado pela necessidade de gerenciamento de estado reativo complexo no trace viewer e nos cartões de decisão com transições de estado.

---

## 2. Sistema de Design e Estilização (Vanilla CSS & Tokens)

- **Decisão**: Implementar um sistema de design baseado em **Vanilla CSS estruturado em tokens semânticos**, em conformidade estrita com [.agents/rules/design.md](file:///home/jeandson/DevProjects/pos-graduacao/opss-pilot/.agents/rules/design.md).
- **Racional**:
  - Permite controle total sobre estética visual premium (dark mode dark-first, gradientes suaves, glassmorphism sutil, foco acessível).
  - Escala de espaçamento estrita em múltiplos de 4px e 8px (`--space-1` a `--space-12`).
  - Dark Mode como padrão com tokens semânticos (`--bg-primary`, `--bg-surface`, `--text-primary`), sem utilização de preto puro `#000000`.
  - Suporte à acessibilidade WCAG 2.1 AA (contraste de 4.5:1, foco visível `:focus-visible`, suporte a `prefers-reduced-motion`).
- **Alternativas Consideradas**:
  - *TailwindCSS*: Rejeitado para evitar dependências adicionais pesadas e garantir máxima fidelidade aos tokens nativos de design solicitados pelo usuário.

---

## 3. Comunicação HTTP e Middleware de CORS no Backend

- **Decisão**: 
  1. No backend Express ([src/http/server.ts](file:///home/jeandson/DevProjects/pos-graduacao/opss-pilot/src/http/server.ts)): adicionar middleware nativo de CORS com suporte a requisições de origens permitidas (localhost em portas de desenvolvimento como 5173/3000 ou curinga configurável), habilitando métodos `GET, POST, OPTIONS` e cabeçalhos `Content-Type, X-Request-Id`.
  2. No frontend: criar um cliente HTTP centralizado (`web/src/services/api.ts`) que lê a URL base da API a partir do `localStorage` (com fallback para `http://localhost:3000` ou origem relativa) e expõe métodos tipados com validação Zod.
- **Racional**:
  - O navegador bloqueia requisições Cross-Origin caso o servidor backend não responda com os cabeçalhos `Access-Control-Allow-*`. O suporte a requisições `OPTIONS` (preflight) é mandatório para POST com `Content-Type: application/json`.
- **Alternativas Consideradas**:
  - *Apenas proxy do Vite*: O proxy ajuda no desenvolvimento, mas falha caso o usuário configure uma URL arbitrária via engrenagem ou rode em contêineres separados. O middleware CORS no Express é a solução robusta e definitiva.

---

## 4. Visualizador Estruturado de Trace ("Ver Raciocínio")

- **Decisão**: Implementar um Drawer/Painel lateral deslizante com linha do tempo de eventos tipados, acessível via botão "Ver Raciocínio" presente em cada card de resposta do assistente.
- **Racional**:
  - O backend OpssPilot já produz traces padronizados (`route`, `thought`, `action`, `observation`, `plan`, `critique`, `answer`, `fallback`).
  - O painel lateral permite ao operador inspecionar o processo de pensamento sem poluir a área principal de mensagens.
  - Componentes dedicados para cada tipo de evento:
    - `route`: exibe rota escolhida e justificativa.
    - `action`: exibe ferramenta invocada e parâmetros JSON formatados.
    - `observation`: exibe saída da ferramenta ou sistema operacional.
    - `plan`: exibe lista ordenada de passos planejados.
    - `critique`: exibe avaliação do refletor (aprovado/reprovado com feedback).
    - `fallback`: badge de aviso destacando contingência de modelo.

---

## 5. Human-in-the-Loop & Cartão de Decisão (Status HTTP 202)

- **Decisão**: 
  - Tratar status HTTP 202 como uma resposta que demanda confirmação humana explícita.
  - A mensagem recebida renderiza um `DecisionCard` de alta prioridade com botões "Aprovar" e "Negar".
  - O clique em "Aprovar" envia mensagem de confirmação para a conversa (`"Aprovo a execução da ação [ID]"`); o clique em "Negar" envia rejeição (`"Nego a execução da ação [ID]"`).
  - O cartão atualiza visualmente para o estado "Aprovado" ou "Negado" e desabilita interações para prevenir cliques duplos.
- **Racional**:
  - Garante conformidade total com o padrão Human-in-the-loop para incidentes operacionais sem exigir novo protocolo de WebSocket ou SSE complexo.
