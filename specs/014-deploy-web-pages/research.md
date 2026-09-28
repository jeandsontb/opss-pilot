# Research & Technical Decisions: Deploy do War Room Web no GitHub Pages

**Feature**: `014-deploy-web-pages`  
**Date**: 2026-09-25  
**Spec**: [spec.md](./spec.md)

---

## 1. Estratégia de Actions e Permissões do GitHub Pages

- **Decisão**: Utilizar as actions oficiais recomendadas pelo GitHub:
  - `actions/upload-pages-artifact@v3`
  - `actions/deploy-pages@v4`
  - Permissões explícitas no nível do workflow/job:
    ```yaml
    permissions:
      contents: read
      pages: write
      id-token: write
    ```
- **Racional**:
  - As actions oficiais da v3/v4 utilizam a infraestrutura moderna de deployment do GitHub Pages baseada no endpoint de API do Pages com OIDC (`id-token: write`), sem a necessidade de criar ou manter branches órfãs como `gh-pages`.
  - Garante segurança máxima e auditoria nativa no painel de Environments do GitHub.
- **Alternativas Consideradas**:
  - *Deploy via git commit na branch `gh-pages`*: Descartado por ser o modelo legado, propenso a conflitos de histórico git e sem integração direta com os ambientes do GitHub Actions.

---

## 2. Controle de Concorrência e Gatilhos

- **Decisão**: Configurar concorrência com:
  ```yaml
  concurrency:
    group: "pages"
    cancel-in-progress: false
  ```
- **Racional**:
  - Para publicações no GitHub Pages, cancelar um deploy em andamento (`cancel-in-progress: true`) pode corromper a publicação ativa no CDN ou gerar erros intermediários 503. A recomendação oficial do GitHub para a action `deploy-pages` é utilizar `cancel-in-progress: false`.
  - Gatilhos: `push` na branch `main` e `workflow_dispatch` para deploys manuais.

---

## 3. Estratégia de Fallback SPA para GitHub Pages

- **Decisão**: Na etapa de build, copiar `web/dist/index.html` para `web/dist/404.html`.
- **Racional**:
  - O GitHub Pages é um servidor de arquivos puramente estáticos. Se o usuário der um refresh ou acessar uma rota interna diretamente (ex: `/opsspilot/settings` ou `/opsspilot/incident`), o servidor do GitHub tenta encontrar o arquivo físico correspondente e retorna o erro 404 padrão do GitHub.
  - Ao fornecer um `404.html` que carrega a mesma aplicação React SPA, o roteador do frontend captura a rota e renderiza a tela correta instantaneamente, eliminando erros 404 em navegações diretas.

---

## 4. Documentação Integrada no README.md

- **Decisão**: Criar um `README.md` abrangente na raiz com:
  - Visão geral e badges do OpssPilot.
  - Seção em destaque do **War Room Web**, com link direto para o GitHub Pages (`https://<user>.github.io/opss-pilot/`).
  - Passo a passo ilustrado de como conectar a interface pública à API Express local (`http://localhost:3000`) utilizando o menu de configurações (ícone de engrenagem) e atestando a compatibilidade de CORS.
  - Comandos úteis de execução e testes.
