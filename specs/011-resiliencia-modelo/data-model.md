# Data Model: Resiliência de Modelo

## ModelConfiguration

| Campo | Tipo | Regra |
|---|---|---|
| `primary` | string | identificador não vazio |
| `fallback` | string opcional | `OPENROUTER_MODEL_FALLBACK`; vazio equivale a ausente |
| `retryLimit` | inteiro positivo | limite finito e configurável para testes |

## ModelAttempt

- `model`: identificador lógico do modelo;
- `attempt`: número da tentativa;
- `success`: resultado ou falha classificada;
- `latencyMs`: duração da tentativa;
- `promptTokens`: usage real quando fornecido.

## FallbackEvent

- `type`: `"fallback"`;
- `node`: nó que sofreu a troca;
- `fromModel`: modelo primário;
- `toModel`: modelo reserva;
- `reason`: categoria sanitizada, sem mensagem bruta ou secrets.

## ModelMetrics

- `llCalls`: número de chamadas efetivas;
- `latencyMs`: latência acumulada;
- `promptTokens`: soma real ou `null`;
- `modelUsed`: modelo que produziu a resposta.

## ModelUnavailableError

Erro de domínio lançado quando todos os modelos configurados esgotam as
tentativas. A mensagem HTTP é genérica e não inclui detalhes de provedores,
prompts ou credenciais.

## Invariants

- Retry do mesmo modelo não gera fallback event.
- Fallback event ocorre uma vez por troca de modelo.
- Modelo ausente ou vazio não é chamado.
- Sucesso retorna `modelUsed`.
- Falha total nunca retorna resposta com formato de sucesso.
