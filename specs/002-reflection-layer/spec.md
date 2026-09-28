# Feature Specification: Camada Reflection do OpssPilot

**Feature Branch**: `002-reflection-layer`

**Created**: 2026-09-23

**Status**: Draft

**Input**: User description: "Camada Reflection: withReflection(strategy, opts) decora qualquer ReasoningStrategy: executa a base; um crítico (mesmo modelo, saída estruturada { approved, feedback }) avalia a resposta contra as observações do trace; se reprovar, regenera com o feedback no contexto; para em approved ou maxReflections (default 2). Evento "critique" no trace; métricas somam as chamadas extras. Arena: reflect:react e reflect:plan-and-execute."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Revisar e melhorar a resposta operacional (Priority: P1)

Como pessoa de plantão, quero que uma resposta gerada por uma estratégia seja revisada contra as observações produzidas, para reduzir respostas inconsistentes antes de agir sobre um incidente.

**Why this priority**: A revisão de qualidade é o objetivo central da feature e precisa funcionar sobre qualquer estratégia existente sem duplicar sua lógica.

**Independent Test**: Decorar uma estratégia determinística com reflexão e executar uma entrada; verificar que a resposta base é avaliada, que uma reprovação gera nova resposta com feedback no contexto e que a execução termina quando aprovada ou quando o limite é atingido.

**Acceptance Scenarios**:

1. **Given** uma estratégia base que retorna resposta e observações, **When** `withReflection` é executado, **Then** um crítico avalia a resposta contra as observações e o resultado inclui um evento `critique`.
2. **Given** que o crítico aprova a resposta, **When** a reflexão termina, **Then** nenhuma regeneração adicional é feita e a resposta aprovada é retornada.
3. **Given** que o crítico reprova a resposta, **When** ainda existem reflexões permitidas, **Then** a resposta é regenerada com o feedback do crítico no contexto e é novamente avaliada.
4. **Given** que todas as reflexões permitidas reprovam, **When** o limite é atingido, **Then** a última resposta é retornada com o trace acumulado e sem loop adicional.

### User Story 2 - Comparar estratégias refletidas na arena (Priority: P2)

Como pessoa desenvolvedora ou avaliadora, quero selecionar estratégias refletidas na arena, para comparar a resposta base com o custo e o trace adicional da revisão.

**Why this priority**: A arena é a superfície de avaliação da feature, mas depende do decorador genérico e do contrato de métricas.

**Independent Test**: Executar a arena com `reflect:react` e `reflect:plan-and-execute` sobre a mesma entrada e verificar um resultado separado para cada estratégia, incluindo críticas e chamadas adicionais.

**Acceptance Scenarios**:

1. **Given** `--strategies reflect:react,reflect:plan-and-execute`, **When** a arena executa, **Then** cada estratégia refletida é resolvida e exibida com nome identificável.
2. **Given** uma execução refletida, **When** o resultado é impresso, **Then** o output contém resposta, trace com críticas e métricas incluindo as chamadas da base e do crítico/regeneração.
3. **Given** uma estratégia desconhecida após `reflect:`, **When** a arena valida os argumentos, **Then** a execução falha antes de iniciar chamadas de modelo.

### User Story 3 - Configurar o custo e preservar compatibilidade (Priority: P3)

Como pessoa desenvolvedora, quero configurar o número máximo de reflexões e usar o decorador com qualquer `ReasoningStrategy`, para controlar custo sem alterar o contrato existente.

**Why this priority**: O limite e a compatibilidade tornam a feature segura para adoção gradual nas duas estratégias já existentes.

**Independent Test**: Decorar uma estratégia fake que sempre reprova, variar `maxReflections` e verificar o número de ciclos, as métricas e a preservação do nome e do resultado da estratégia.

**Acceptance Scenarios**:

1. **Given** nenhuma opção de limite, **When** a estratégia decorada é executada, **Then** são permitidas no máximo duas reflexões.
2. **Given** `maxReflections` igual a zero, **When** a estratégia decorada é executada, **Then** a estratégia base retorna seu resultado sem chamada do crítico.
3. **Given** uma estratégia decorada, **When** ela é usada onde uma `ReasoningStrategy` era aceita, **Then** o contrato continua contendo `name`, `answer`, `trace` e `metrics`.

### Edge Cases

- Feedback vazio ou resposta estruturada inválida do crítico deve gerar erro explícito, não aprovação silenciosa.
- `maxReflections` negativo, não inteiro ou excessivamente grande deve ser rejeitado na configuração.
- O crítico deve receber as observações do trace, mas não deve alterar o estado operacional nem executar ferramentas.
- Falha de uma regeneração deve preservar o último resultado válido e expor o erro conforme o padrão de execução existente.
- As chamadas do crítico e das regenerações devem ser contadas, mesmo quando a reflexão termina por limite.
- A arena deve isolar o estado entre estratégias refletidas da mesma forma que já isola estratégias base.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST fornecer `withReflection(strategy, opts)` como decorador compatível com qualquer `ReasoningStrategy`.
- **FR-002**: O decorador MUST executar primeiro a estratégia base e usar seu `answer` e as observações do `trace` como contexto da avaliação.
- **FR-003**: O crítico MUST usar o mesmo modelo configurado pelo núcleo e produzir saída estruturada com `approved` booleano e `feedback` textual.
- **FR-004**: O sistema MUST adicionar um evento `critique` ao trace para cada avaliação, contendo aprovação e feedback suficientes para inspeção.
- **FR-005**: Quando `approved` for falso e houver reflexões restantes, o sistema MUST regenerar a resposta incluindo o feedback no contexto e reavaliar o novo resultado.
- **FR-006**: O decorador MUST parar imediatamente quando o crítico aprovar ou quando atingir `maxReflections`, cujo valor padrão é 2.
- **FR-007**: O sistema MUST somar às métricas da estratégia base todas as chamadas extras do crítico e da regeneração, além de preservar a latência acumulada.
- **FR-008**: O decorador MUST preservar o isolamento de store e os limites de iteração recebidos pela estratégia base.
- **FR-009**: A arena MUST aceitar `reflect:react` e `reflect:plan-and-execute`, resolvendo-os para os decoradores correspondentes.
- **FR-010**: A arena MUST rejeitar estratégias refletidas desconhecidas antes de executar chamadas de modelo.
- **FR-011**: `maxReflections` MUST ser validado como inteiro maior ou igual a zero e limitado a um teto seguro definido pelo produto.
- **FR-012**: O crítico MUST ser somente avaliador: não pode invocar ferramentas nem alterar o store operacional.
- **FR-013**: O sistema MUST incluir testes determinísticos sem rede para aprovação, reprovação com regeneração, limite, métricas e parsing das estratégias da arena.

### Key Entities

- **ReflectionOptions**: Configuração do decorador, incluindo `maxReflections` e opções de execução da estratégia base.
- **Critique**: Avaliação estruturada com `approved` e `feedback`, associada a uma tentativa de resposta.
- **ReflectedStrategy**: Estratégia compatível com o contrato comum que encapsula uma estratégia base e seus ciclos de revisão.
- **ReflectionCycle**: Uma execução da base, avaliação crítica e eventual regeneração, contabilizada no trace e nas métricas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das respostas refletidas possuem pelo menos uma avaliação crítica quando `maxReflections` é maior que zero.
- **SC-002**: 100% das reprovações com reflexões disponíveis resultam em uma regeneração que recebe o feedback correspondente no contexto.
- **SC-003**: Nenhuma execução realiza mais avaliações ou regenerações do que o `maxReflections` configurado, e o padrão nunca ultrapassa duas reflexões.
- **SC-004**: As métricas exibidas pela arena incluem todas as chamadas da estratégia base e as chamadas adicionais de crítica/regeneração.
- **SC-005**: As duas seleções `reflect:react` e `reflect:plan-and-execute` produzem resultados distinguíveis, cada um com resposta, trace e métricas.
- **SC-006**: Entradas inválidas de configuração ou estratégia são rejeitadas antes de qualquer alteração de estado operacional ou chamada de modelo.
- **SC-007**: Testes determinísticos cobrem aprovação, reprovação, limite e parsing da arena sem depender de rede ou credenciais.

## Assumptions

- O crítico usa a mesma configuração de modelo do núcleo, mas recebe uma chamada separada da estratégia base.
- Regeneração significa executar novamente a estratégia decorada com o feedback textual no contexto da entrada, preservando as opções de store e iterações.
- `maxReflections` conta avaliações críticas; cada reprovação que ainda tenha orçamento permite uma regeneração.
- O teto seguro para `maxReflections` será definido no plano como 8, alinhado ao limite operacional já existente.
- O feedback e os eventos de crítica podem ser impressos na arena, pois são necessários para avaliação e depuração.
- O crítico não executa tools; apenas avalia a resposta e as observações já produzidas.
