# Research: Grafo Unificado de Raciocínio

## Decision: Usar um grafo compilado com estado tipado e nós explícitos

**Rationale**: O projeto já usa LangGraph no Plan-and-execute. Um grafo
unificado torna a sequência contexto → roteador → estratégia → resposta
observável e evita que o controller duplique seleção de estratégia.

**Alternatives considered**: Encadear funções no controller foi rejeitado por
ocultar transições e dificultar a auditoria do trace.

## Decision: O catálogo terá três rotas estáveis

**Rationale**: As rotas de produto são `react`, `plan-and-execute` e
`reflection`. Reflection será um nó composto que aplica `withReflection` à
estratégia base configurada, mantendo o wrapper existente.

**Alternatives considered**: Expor apenas as duas estratégias base deixaria
reflection fora do grafo; criar uma quarta rota para cada combinação de
reflection ampliaria o catálogo sem benefício.

## Decision: O roteador recebe prompt com tabela textual e saída estruturada

**Rationale**: Uma tabela explícita reduz ambiguidade para o modelo e permite
validar o identificador contra o catálogo antes da execução. Zod valida
`route` e `reason` na fronteira da decisão.

**Alternatives considered**: Rota livre em texto exigiria parsing frágil e
permitiria respostas sintéticas para rotas desconhecidas.

## Decision: Override ignora a chamada do roteador

**Rationale**: `strategy` explícita é uma instrução operacional determinística.
O trace registra um evento `route` com origem `override`, rota e motivo para
preservar auditabilidade sem gastar uma chamada de modelo.

**Alternatives considered**: Chamar o roteador e depois sobrescrever a decisão
adicionaria latência e poderia confundir a origem da escolha.

## Decision: Normalizar trace no limite de cada nó

**Rationale**: Estratégias existentes produzem eventos legados sem `node`.
O grafo pode enriquecer cada evento com o nome do nó sem alterar a lógica
interna nem descartar conteúdo.

**Alternatives considered**: Alterar todas as estratégias simultaneamente
aumentaria o acoplamento e faria wrappers de reflection duplicarem a lógica.

## Decision: Acumular métricas do roteador e da estratégia

**Rationale**: A chamada estruturada do roteador é uma chamada adicional real e
deve aparecer em `llCalls`, `latencyMs` e `promptTokens` quando disponível.
Quando há override, não há custo de roteamento.

**Alternatives considered**: Excluir o roteador esconderia custo operacional e
quebraria a interpretação das métricas do endpoint.
