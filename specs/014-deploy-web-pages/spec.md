# Feature Specification: Deploy do War Room Web no GitHub Pages via Actions

**Feature Branch**: `014-deploy-web-pages`

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "Deploy do web/ no Pages via Actions: upload-pages-artifact + deploy-pages, permissions, README (atualizar)"

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Publicação Contínua no GitHub Pages via GitHub Actions (Priority: P1)

Como mantenedor ou operador do OpssPilot, desejo que cada alteração aprovada na branch principal (`main`) realize automaticamente o build e a publicação do frontend estático (`web/`) no GitHub Pages, para que a interface War Room esteja sempre atualizada e acessível publicamente sem intervenções manuais.

**Why this priority**: É o objetivo central da automação de CI/CD. Sem a esteira de publicação automática, o War Room web precisa ser compilado e hospedado manualmente.

**Independent Test**: Pode ser validado disparando o workflow via push na branch `main` ou via `workflow_dispatch`, checando a execução das etapas de build (`web:build`), upload de artefatos (`actions/upload-pages-artifact`) e publicação (`actions/deploy-pages`) com sucesso e status verde no GitHub Actions.

**Acceptance Scenarios**:

1. **Given** um commit enviado para a branch `main` com alterações em `web/**` ou no repositório, **When** o GitHub Actions é disparado, **Then** o workflow executa a instalação de dependências, compilação de assets em `web/dist/` e publica a versão mais recente no GitHub Pages.
2. **Given** a execução do job de deploy, **When** a ação `actions/deploy-pages` é executada, **Then** as permissões explícitas do token (`pages: write`, `id-token: write`, `contents: read`) são respeitadas e a URL pública do ambiente `github-pages` é gerada com sucesso.
3. **Given** múltiplos commits em sequência rápida para a branch `main`, **When** uma nova execução do workflow se inicia, **Then** o grupo de concorrência (`concurrency`) gerencia as filas garantindo que o deploy mais recente prevaleça sem corrupção de estado.

---

### User Story 2 - Roteamento Estático e Integridade dos Assets sob a Rota Base (Priority: P2)

Como operador de produção acessando o War Room hospedado no GitHub Pages, desejo que todos os scripts, estilos e recursos visuais sejam carregados corretamente sob o subcaminho base do repositório (`/opsspilot/`), para que a aplicação carregue rapidamente e sem erros 404 no navegador.

**Why this priority**: Aplicações Single Page hospedadas no GitHub Pages residem sob um subdiretório correspondente ao nome do repositório. Caminhos absolutos incorretos quebram a carga do bundle CSS e JavaScript.

**Independent Test**: Acessar a URL do GitHub Pages após o deploy e validar pelo DevTools do navegador que todas as requisições para `index-*.js` e `index-*.css` retornam HTTP 200 sob o prefixo `/opsspilot/`.

**Acceptance Scenarios**:

1. **Given** o build gerado em `web/dist/`, **When** inspecionado o `index.html`, **Then** todas as referências a tags `<script>` e `<link>` utilizam a base `/opsspilot/` ou caminhos relativos consistentes.
2. **Given** que o usuário acessa diretamente uma subrota ou recarrega a página no GitHub Pages, **When** o servidor do Pages processa a requisição, **Then** o arquivo de fallback (`404.html` ou redirecionamento SPA) redireciona graciosamente para o `index.html`.

---

### User Story 3 - Documentação do War Room e Instruções de Uso no README (Priority: P3)

Como novo colaborador ou usuário do OpssPilot, desejo consultar no `README.md` o link público do War Room no GitHub Pages e instruções claras sobre como configurar a URL da API Express para iniciar o atendimento a incidentes, para que eu possa utilizar a interface imediatamente sem dúvidas.

**Why this priority**: A interface pública no GitHub Pages é um cliente estático que necessita saber como se conectar à API backend (local ou em nuvem). Uma documentação clara orienta o operador a usar o menu da engrenagem.

**Independent Test**: Abrir o `README.md`, verificar a presença de seção dedicada ao War Room Web, o link do GitHub Pages, e seguir o passo a passo para conectar a interface a uma API local (`http://localhost:3000`).

**Acceptance Scenarios**:

1. **Given** o arquivo `README.md` do repositório, **When** o usuário consulta a documentação, **Then** encontra uma seção destacada para o **War Room Web**, com badge/link para o GitHub Pages e guia de conexão via ícone de engrenagem.
2. **Given** as instruções documentadas, **When** o usuário inicia a API backend localmente e abre o link público do Pages, **Then** o usuário consegue configurar a URL no modal e interagir com o copiloto com suporte a CORS.

---

## Edge Cases

- **Falha no Build do Frontend**: Se houver erro de tipagem (`tsc`) ou lint antes do empacotamento, o workflow do GitHub Actions deve falhar imediatamente antes da etapa de upload de artefato, impedindo publicação de versão quebrada.
- **Cancelamento de Runs Concorrentes**: Para deploys no GitHub Pages, o `concurrency: group: "pages"` deve definir `cancel-in-progress: false` para garantir que o deploy em execução termine ordenadamente sem deixar o site em estado inconsistente.
- **Disparo Manual (`workflow_dispatch`)**: Permitir que operadores executem o deploy sob demanda diretamente da interface do GitHub sem necessidade de criar novos commits.
- **Ambiente sem permissão de Pages**: Caso o repositório ainda não tenha o GitHub Pages ativado nas configurações do repositório ("Build and deployment: GitHub Actions"), o workflow deve fornecer mensagem de erro evidente indicando a necessidade de autorização da permissão `pages`.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O projeto MUST conter o arquivo de workflow do GitHub Actions em `.github/workflows/deploy-pages.yml`.
- **FR-002**: O workflow MUST ser configurado com triggers para eventos de `push` na branch `main` e `workflow_dispatch` (disparo manual).
- **FR-003**: O job de deploy MUST declarar permissões explícitas no nível do workflow ou do job:
  ```yaml
  permissions:
    contents: read
    pages: write
    id-token: write
  ```
- **FR-004**: O workflow MUST gerenciar concorrência através de:
  ```yaml
  concurrency:
    group: "pages"
    cancel-in-progress: false
  ```
- **FR-005**: A etapa de build MUST utilizar Node.js 22 LTS, instalar dependências do workspace e da pasta `web/`, e compilar o frontend estático com `npm run web:build`.
- **FR-006**: O workflow MUST utilizar a action oficial `actions/upload-pages-artifact` apontando o parâmetro `path` para `web/dist`.
- **FR-007**: O workflow MUST utilizar a action oficial `actions/deploy-pages` associada ao environment `github-pages`.
- **FR-008**: O arquivo `README.md` na raiz do projeto MUST ser criado/atualizado contendo:
  - Visão geral do OpssPilot.
  - Seção do **War Room Web** com link direto para a publicação no GitHub Pages.
  - Instruções de como configurar a URL da API backend via ícone de engrenagem.
  - Comandos para execução local (`npm run dev` e `npm run web:dev`).

---

### Key Entities

- **PagesWorkflow**: Definição declarativa em YAML do pipeline de build e deploy no GitHub Pages.
- **StaticBundle**: Conjunto de arquivos HTML, CSS e JavaScript compilados em `web/dist/` configurados sob o path base `/opsspilot/`.
- **DocumentationGuide**: Documento `README.md` estruturado com badges de status, arquitetura, comandos e guia de uso da interface web.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O pipeline do GitHub Actions compila e publica os artefatos no GitHub Pages em menos de 2 minutos a partir do push na branch `main`.
- **SC-002**: 100% dos recursos estáticos (CSS, JS, ícones) são carregados sem erros 404 sob o path `/opsspilot/` no ambiente do Pages.
- **SC-003**: A documentação do `README.md` permite que um novo desenvolvedor execute o backend localmente e conecte a interface pública do Pages em menos de 3 minutos.
- **SC-004**: O arquivo de workflow passa com 100% de conformidade estática de sintaxe YAML do GitHub Actions.

---

## Assumptions

- O repositório está configurado no GitHub com as permissões de Actions habilitadas para deploy no Pages (Settings ➔ Pages ➔ Source: GitHub Actions).
- O nome do repositório no GitHub corresponde à base `/opsspilot/` configurada em `web/vite.config.ts`.
- A API backend continuará executando na infraestrutura local do operador ou servida em nuvem com CORS habilitado para a origem do GitHub Pages.
