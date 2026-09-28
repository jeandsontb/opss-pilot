# Contrato: Repositório de Observabilidade

O repositório deve expor operações equivalentes a:

- `startRequest(record)`;
- `appendTraceEvent(event)`;
- `completeRequest(requestId, result)`;
- `failRequest(requestId, error)`;
- `getRequest(requestId)`.

`getRequest` retorna o registro e eventos ordenados por `sequence ASC`, ou
ausência explícita quando o identificador não existe. Inserção de `requestId`
duplicado retorna erro de conflito. Todas as entradas são validadas antes de
serem persistidas.
