# Data Model: Núcleo de raciocínio do OpssPilot

## Service

- `id`: identificador estável.
- `name`: nome único e não vazio.
- `createdAt`: instante de criação.

Um serviço possui muitos alertas e incidentes.

## Alert

- `id`: identificador estável.
- `serviceId`: serviço associado.
- `title`: descrição não vazia.
- `status`: `firing` ou `resolved`.
- `severity`: severidade operacional validada.
- `createdAt` e `resolvedAt`: timestamps coerentes com o estado.

Transição suportada: `firing -> resolved`.

## Incident

- `id`: identificador estável.
- `title`: título não vazio.
- `serviceId`: serviço associado.
- `severity`: severidade validada.
- `status`: `open` ou `resolved`.
- `createdAt` e `resolvedAt`: timestamps da transição.

Transição suportada: `open -> resolved`; IDs inexistentes ou já resolvidos
produzem erro de domínio explícito.

## ReasoningStrategy result

- `answer`: resposta textual.
- `trace`: lista ordenada de `TraceEvent`.
- `metrics.llCalls`: inteiro não negativo.
- `metrics.latencyMs`: número não negativo.

Tipos de `TraceEvent`: `thought`, `plan`, `action`, `observation`, `critique`
e `answer`. Ação contém `tool` e `args` serializáveis.

## Store invariants

- IDs são únicos por entidade.
- Alertas e incidentes referenciam serviços existentes.
- Seed limpo contém cinco serviços e seis alertas: três `firing` e três
  `resolved`.
- Operações inválidas são atômicas.
- Clone/snapshot preserva dados, mas não compartilha mutações posteriores.
