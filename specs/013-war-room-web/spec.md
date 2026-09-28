# Feature Specification: War Room Web OpssPilot

**Feature Branch**: `013-war-room-web`

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "War room web/ (Vite+react+TS) com as instructions de design: chat -> /chat, com \"ver raciocínio\" abrindo o trace tipado. 202 vira cartão aprovar/negar; engrenagem com URL da API; base /opsspilot/; CORS"

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Chat Operacional em Tempo Real com o Copiloto (Priority: P1)

Como operador de produção ou engenheiro de confiabilidade (SRE) durante um plantão, desejo interagir diretamente com o OpssPilot através de uma interface de chat web intuitiva, para que eu possa relatar incidentes, consultar o estado de serviços e executar comandos operacionais em linguagem natural.

**Why this priority**: O chat é o núcleo funcional do OpssPilot. Sem ele, os operadores não conseguem enviar mensagens nem receber respostas do copiloto. Representa o MVP mínimo e autossuficiente da interface web.

**Independent Test**: Pode ser validado enviando uma mensagem (ex: *"abra um incidente de severidade baixa no auth"*), verificando a renderização da mensagem do usuário, o estado de carregamento e a exibição da resposta do assistente mantendo a identificação contínua da conversa (`conversationId`).

**Acceptance Scenarios**:

1. **Given** que o operador acessa o War Room na rota base `/opsspilot/`, **When** digita uma mensagem no campo de entrada e clica em enviar (ou pressiona Enter), **Then** a mensagem é exibida imediatamente no histórico e uma requisição é enviada ao endpoint de chat (`/chat`).
2. **Given** que a requisição de chat está em processamento, **When** o operador aguarda a resposta, **Then** a interface exibe um indicador visual claro de carregamento (sem quebrar o layout) e desabilita novo envio até a conclusão.
3. **Given** que o copiloto respondeu com sucesso, **When** o operador envia uma nova mensagem subsequente, **Then** o mesmo `conversationId` é mantido para preservar a memória de contexto do diálogo.
4. **Given** que a API falha com timeout ou indisponibilidade, **When** ocorre um erro de rede ou código 503/504, **Then** a interface apresenta um alerta contextual de erro com opção clara de tentar reenviar a mensagem.

---

### User Story 2 - Inspeção de Raciocínio Operacional (Trace Viewer) (Priority: P2)

Como engenheiro de plantão, desejo inspecionar o raciocínio detalhado e os passos intermediários executados pelo copiloto (pensamentos, ferramentas acionadas, observações e reflexões), para que eu tenha transparência e confiança total sobre as ações sugeridas ou executadas.

**Why this priority**: A confiabilidade em copilotos autônomos de infraestrutura crítica depende de explicabilidade. Os operadores precisam verificar se o agente analisou as métricas corretas antes de aceitar diagnósticos.

**Independent Test**: Pode ser testado clicando no botão "Ver Raciocínio" de uma mensagem respondida pelo assistente e verificando a abertura de um painel lateral/modal com a sequência de passos ordenados e classificados por tipo.

**Acceptance Scenarios**:

1. **Given** uma mensagem do assistente que contenha eventos de execução, **When** o operador clica no botão "Ver Raciocínio", **Then** a interface expande um visualizador estruturado contendo a linha do tempo dos eventos.
2. **Given** o visualizador de raciocínio aberto, **When** são apresentados diferentes tipos de passos (como rota escolhida, chamada de ferramenta, pensamento, observação e retorno de fallback), **Then** cada evento é renderizado com ícone, cor e rótulo visualmente distintos conforme seu tipo semântico.
3. **Given** um passo com argumentos complexos ou dados retornados, **When** o operador seleciona o passo, **Then** os detalhes estruturados (JSON/payload) podem ser inspecionados com formatação legível.

---

### User Story 3 - Cartão de Decisão Human-in-the-Loop para Ações Sensíveis (Status 202) (Priority: P3)

Como operador de produção, desejo ser solicitado a aprovar ou negar formalmente qualquer ação com impacto operacional significativo quando o sistema retornar uma solicitação pendente (código HTTP 202), para garantir a segurança das operações críticas.

**Why this priority**: Evita execução involuntária de ações destrutivas ou de alto risco (ex: restart de clusters, modificações em bancos de dados ou escalonamento massivo) mantendo o ser humano no controle da decisão final.

**Independent Test**: Simular ou disparar uma requisição que resulte em código HTTP 202 e verificar a transformação da mensagem em um cartão de destaque com botões de "Aprovar" e "Negar", seguido pelo envio da decisão correspondente.

**Acceptance Scenarios**:

1. **Given** que o copiloto processa uma solicitação que requer intervenção humana e a resposta retorna status HTTP 202 (Accepted), **When** a resposta é recebida pela interface, **Then** a mensagem é exibida como um cartão de decisão de alta visibilidade, detalhando a ação proposta e seus parâmetros.
2. **Given** o cartão de decisão ativo, **When** o operador clica em "Aprovar", **Then** a interface emite a confirmação da ação para o copiloto, atualiza o status do cartão para "Aprovado" e desabilita interações duplicadas.
3. **Given** o cartão de decisão ativo, **When** o operador clica em "Negar", **Then** a ação é cancelada, o cartão exibe o estado "Negado" e o operador pode continuar a conversa normalmente.

---

### User Story 4 - Conectividade Configurável, Base URL e Roteamento (Priority: P4)

Como administrador ou operador configurando o War Room em múltiplos ambientes (desenvolvimento local, staging, produção), desejo configurar a URL da API do OpssPilot através de um menu de configurações acessível por um ícone de engrenagem e garantir funcionamento sob a rota base `/opsspilot/`, com suporte adequado a CORS.

**Why this priority**: Permite que o frontend seja hospedado em servidores estáticos, subpastas ou contêineres independentes conectando-se a qualquer instância do backend sem necessidade de recompilação de código.

**Independent Test**: Acessar o modal de configurações pelo botão de engrenagem, alterar a URL da API (ex: `http://localhost:3000`), salvar e verificar que novas requisições utilizam a URL definida e persistem após recarregar a página.

**Acceptance Scenarios**:

1. **Given** que o operador está em qualquer tela do War Room, **When** clica no ícone de engrenagem no cabeçalho, **Then** um diálogo de configurações é aberto exibindo a URL da API atualmente configurada e o status da conexão.
2. **Given** o modal de configurações aberto, **When** o usuário altera a URL da API e clica em "Salvar", **Then** o novo endpoint é persistido localmente e passa a ser utilizado em todas as chamadas subsequentes.
3. **Given** a aplicação configurada com a rota base `/opsspilot/`, **When** o usuário navega ou recarrega páginas sob `/opsspilot/`, **Then** todos os assets estáticos e rotas internas funcionam corretamente sem erros 404.
4. **Given** que a interface web e a API rodam em origens distintas (portas ou hosts diferentes), **When** uma requisição HTTP é enviada, **Then** o backend aceita a comunicação via cabeçalhos CORS apropriados sem bloqueios no navegador.

---

## Edge Cases

- **Queda de Conexão ou API Indisponível**: Quando a API estiver inacessível durante o envio de mensagem ou verificação de configurações, a interface deve exibir uma indicação clara de offline com botão de reconexão sem travar o estado da tela.
- **Bloqueio de CORS**: Se o navegador bloquear uma chamada por política de mesma origem, a aplicação deve identificar a falha de rede e fornecer orientação no diálogo de configurações indicando configuração do backend ou proxy.
- **Tempo Excessivo de Raciocínio (Timeout)**: Para operações que ultrapassem o limite de espera (timeout), o card da mensagem deve indicar expiração e permitir ao usuário reenviar ou cancelar o processamento.
- **Trace Vazio ou Incompleto**: Se o assistente responder com trace ausente ou vazio, o botão "Ver Raciocínio" deve ser desabilitado ou ocultado graciosamente com feedback visual adequado.
- **Decisão em Sessão Expirada**: Se o operador tentar aprovar ou negar um cartão 202 muito tempo após sua emissão e a sessão tiver sido invalidada, a interface deve exibir um aviso de expiração e orientar a reiniciar o fluxo.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A aplicação MUST disponibilizar uma interface de chat operacional sob o caminho base `/opsspilot/`.
- **FR-002**: A interface MUST enviar mensagens do usuário via requisição HTTP POST para o endpoint `/chat`, enviando `message` e, quando disponível, `conversationId`.
- **FR-003**: A interface MUST receber e exibir a resposta textual do assistente (`answer`) associando-a ao histórico visual da conversa.
- **FR-004**: A interface MUST exibir para cada resposta do assistente um acionador ("Ver Raciocínio") que abra a visualização do trace estruturado da requisição.
- **FR-005**: O visualizador de trace MUST suportar eventos tipados do modelo, incluindo: rota (`route`), ferramenta (`action`), observação (`observation`), plano (`plan`), pensamento (`thought`), crítica (`critique`) e contingência de modelo (`fallback`).
- **FR-006**: Quando a API responder com status HTTP 202 (Accepted), a interface MUST renderizar a resposta como um cartão interativo contendo descrição da ação proposta e botões de "Aprovar" e "Negar".
- **FR-007**: Ao acionar "Aprovar" ou "Negar" em um cartão 202, a interface MUST enviar a decisão do operador para o backend e atualizar o estado do cartão impedindo cliques repetidos.
- **FR-008**: A aplicação MUST disponibilizar um botão de configurações com ícone de engrenagem no cabeçalho permanente da interface.
- **FR-009**: O diálogo de configurações MUST permitir visualizar e editar a URL base da API do OpssPilot, com validação de formato e teste de status da conexão (`/health`).
- **FR-010**: A URL da API configurada e a preferência de tema (Dark/Light) MUST ser persistida no armazenamento local do navegador (`localStorage`).
- **FR-011**: O backend Express MUST configurar suporte a Cross-Origin Resource Sharing (CORS) permitindo requisições da aplicação web (métodos GET, POST, OPTIONS e cabeçalhos `Content-Type`, `X-Request-Id`).
- **FR-012**: A interface MUST cumprir rigorosamente as diretrizes de design especificadas em [.agents/rules/design.md](file:///home/jeandson/DevProjects/pos-graduacao/opss-pilot/.agents/rules/design.md):
  - Hierarquia visual nítida com tipografia legível e contraste intencional.
  - Escala geométrica de espaçamento baseada estritamente em múltiplos de 4px / 8px via variáveis CSS.
  - Estados vazios (*Empty States*) informativos com ícone, título, descrição e ação.
  - Estados de erro (*Error States*) com feedback contextual e ação de repetição (*retry*).
  - Tema escuro (*Dark Mode*) com tokens ricos (sem preto puro `#000000`) e suporte a alternância manual.
  - Acessibilidade WCAG 2.1 AA com foco visível (`:focus-visible`), HTML semântico e suporte a navegação por teclado.

---

### Key Entities

- **ChatMessage**: Representa uma mensagem no fluxo do War Room (id, remetente `user` | `assistant`, conteúdo, timestamp, id da conversa, trace opcional e estado de confirmação pendente).
- **TraceStep**: Representa um passo individual do raciocínio executado pelo grafo ou agente (sequência, nó de execução, tipo de evento, conteúdo ou argumentos estruturados).
- **DecisionCard**: Representa uma ação de segurança ou contingência aguardando aprovação humana originada de resposta HTTP 202 (id da requisição, título da ação, parâmetros, status `pending` | `approved` | `denied`).
- **ApiConfiguration**: Representa os parâmetros de conectividade do cliente web (URL base da API, status de conexão, tempo limite de requisição e persistência local).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O operador consegue iniciar a interface, enviar uma mensagem de diagnóstico e receber a resposta em menos de 3 cliques e sem recarregar a página.
- **SC-002**: O tempo para abrir a visualização detalhada de raciocínio a partir de qualquer mensagem respondida é inferior a 300ms.
- **SC-003**: 100% das respostas com status HTTP 202 apresentam o cartão de aprovação/rejeição de forma inequívoca, impedindo a continuidade acidental sem decisão explícita.
- **SC-004**: O War Room carrega e funciona perfeitamente servido a partir da rota `/opsspilot/`, tanto em ambiente local quanto em ambiente com origens cruzadas (CORS habilitado).
- **SC-005**: A interface obtém 100% de conformidade com os testes automatizados de componentes e acessibilidade básica (navegação por teclado e contraste).

---

## Assumptions

- O backend do OpssPilot expõe os endpoints `/chat`, `/health`, `/stats` e `/requests/:id` na porta 3000 por padrão.
- Quando a API retornar HTTP 202, a resposta incluirá no corpo ou cabeçalho os dados necessários para exibir os detalhes da ação a ser aprovada ou negada.
- A aplicação web será empacotada como Single Page Application (SPA) para ser servida diretamente pelo Express ou por servidor web estático sob a rota `/opsspilot/`.
- A biblioteca ou suporte a CORS no Express utilizará configurações seguras e compatíveis com requisições vindas da interface de desenvolvimento local e de produção.
