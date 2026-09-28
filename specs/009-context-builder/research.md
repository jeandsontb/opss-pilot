# Research: ContextBuilder com Orçamento por Seção

## Decision: Budgets medidos com a estimativa existente `chars / 4`

**Rationale**: O projeto já possui uma função determinística de estimativa.
Reutilizá-la mantém os cortes offline, baratos e coerentes com o
`contextBreakdown`, sem carregar tokenizadores específicos de modelo.

**Alternatives considered**: Usage real não pode ser conhecido antes da
chamada. Tokenizadores por modelo adicionariam dependência e custo ao caminho
de composição.

## Decision: System e mensagem atual ficam fora dos budgets

**Rationale**: São instruções e pedido corrente; cortá-los altera o contrato
da estratégia e pode remover requisitos essenciais do usuário.

**Alternatives considered**: Um budget global foi rejeitado porque permitiria
que histórico ou memórias consumissem espaço das instruções essenciais.

## Decision: Cortes preservam itens inteiros sempre que possível

**Rationale**: Mensagens e memórias são unidades semânticas. A janela remove
primeiro os itens mais antigos; memórias são selecionadas por score decrescente
com estabilidade em empates. O resumo, que é uma unidade textual, pode ser
truncado deterministicamente para o orçamento.

**Alternatives considered**: Cortar caracteres de mensagens quebraria
conteúdo operacional e dificultaria auditoria.

## Decision: Configuração validada na construção do builder

**Rationale**: Defaults ficam centralizados e valores inválidos falham cedo,
sem conversões silenciosas de `NaN`, frações ou negativos.

**Alternatives considered**: Ler `process.env` em cada seção espalharia regras
e produziria comportamentos inconsistentes entre estratégias.

## Decision: ContextBuilder integrado antes das estratégias

**Rationale**: `runChat` já possui histórico e memórias recuperadas e é o ponto
comum a ReAct, Plan-and-execute e reflection. O builder retorna uma string
única, preservando o contrato atual de `ReasoningStrategy.run`.

**Alternatives considered**: Alterar cada estratégia para montar seu próprio
contexto duplicaria lógica e violaria a exigência de resultado uniforme.

## Decision: Metadados de corte são internos/diagnósticos

**Rationale**: O prompt é o contrato mínimo necessário; metadados opcionais
podem suportar testes e telemetria sem alterar answer, trace ou usage real.

**Alternatives considered**: Expor novos campos HTTP obrigatórios ampliaria o
escopo sem necessidade para a primeira versão.
