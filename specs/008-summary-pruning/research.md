# Research: Sumarização de Histórico (Pruning)

## Decision: Contabilizar mensagens incorporadas no resumo

**Rationale**: Um contador persistido permite calcular quantas mensagens já foram removidas desde o último resumo sem reprocessar a conversa inteira. Quando `totalMessages - summarizedMessageCount - recentWindowSize` alcançar oito, processa-se um bloco de oito.

**Alternatives considered**: Disparar por número de requests foi rejeitado porque requests podem adicionar quantidades diferentes de mensagens. Recalcular a cada request foi rejeitado por custo.

## Decision: Um resumo corrente por conversa, mesclado antes da persistência

**Rationale**: Um registro corrente simplifica a leitura e evita agregar vários resumos em cada request. O sumarizador recebe o resumo anterior e o bloco novo.

**Alternatives considered**: Registros imutáveis exigiriam agregação em cada contexto. Substituir sem enviar o resumo anterior perderia fatos.

## Decision: O serviço de chat compõe contexto e trace

**Rationale**: A decisão depende de `conversationId`, janela e contador; colocá-la no serviço evita duplicação entre ReAct e Plan-and-execute.

**Alternatives considered**: Implementar dentro de cada estratégia duplicaria regras e produziria traces inconsistentes.

## Decision: Interface de sumarização fake-injetável

**Rationale**: `summarize(input)` permite validar conteúdo, contar chamadas e simular falhas sem OpenRouter. A implementação real poderá usar saída estruturada e pedir texto curto.

**Alternatives considered**: Chamar o modelo dentro do store misturaria persistência e infraestrutura externa.

## Decision: Falha antes da persistência

**Rationale**: Se o sumarizador falhar ou retornar vazio, resumo e contador anteriores permanecem intactos e o erro sobe para o tratamento padrão.

**Alternatives considered**: Persistir marcador parcial produziria contexto enganoso.

## Decision: Evento tipado `summarize`

**Rationale**: O evento retornado no trace informa quantas mensagens foram compactadas e qual é o contador acumulado, permitindo auditoria da resposta.

**Alternatives considered**: Log externo não seria parte do contrato observável do chat.
