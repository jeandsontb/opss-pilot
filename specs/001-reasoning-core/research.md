# Research: Núcleo de raciocínio do OpssPilot

## Decisão 1: Contrato comum e eventos discriminados

- **Decision**: Modelar `ReasoningStrategy`, `TraceEvent` e `Metrics` como
  tipos discriminados, com payload específico para cada evento.
- **Rationale**: Permite trocar estratégias na arena e torna a formatação/teste
  do trace determinístico.
- **Alternatives considered**: Um trace textual único perde estrutura para
  inspeção e testes.

## Decisão 2: Validação nas fronteiras

- **Decision**: Usar schemas Zod para entrada da arena, argumentos das tools,
  estados de alerta e saídas de operações.
- **Rationale**: Atende à constituição e impede estados ou campos desconhecidos
  de alcançar o domínio.
- **Alternatives considered**: Validação manual dispersa duplicaria regras.

## Decisão 3: Estado isolável

- **Decision**: Definir store em memória com seed explícito e clone ou
  snapshot/restauração; a arena cria estado equivalente para cada estratégia.
- **Rationale**: Comparações iniciam no mesmo cenário e testes não dependem de
  PostgreSQL ou rede.
- **Alternatives considered**: Singleton compartilhado faria a ordem alterar os
  resultados.

## Decisão 4: Integração do modelo

- **Decision**: Centralizar a criação do chat model em `src/agents/model.ts`,
  usando OpenRouter, configuração de ambiente e temperatura zero.
- **Rationale**: Evita configurações divergentes entre ReAct, planner e
  replanner, mantendo secrets fora do código.
- **Alternatives considered**: Instanciar um modelo em cada estratégia aumenta
  duplicação e risco de parâmetros inconsistentes.

## Decisão 5: Limites de execução

- **Decision**: Cada estratégia recebe `maxIterations`; o grafo
  Plan-and-execute aplica teto absoluto de oito passos. Resultado parcial e
  métricas acumuladas são retornados ao atingir limites.
- **Rationale**: Garante previsibilidade de custo e evita loops de agente.
- **Alternatives considered**: Grafo sem limite é incompatível com a exigência
  operacional.

## Decisão 6: Persistência relacional

- **Decision**: Encapsular Sequelize/PostgreSQL atrás do store/serviço,
  mantendo o adaptador em memória como caminho de testes e seed local.
- **Rationale**: Preserva o padrão de persistência sem tornar testes dependentes
  de infraestrutura.
- **Alternatives considered**: Acesso direto a Sequelize nas tools mistura
  domínio, persistência e validação de fronteira.
