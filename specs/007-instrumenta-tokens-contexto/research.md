# Research: Instrumentação de Tokens e Contexto

## Decision: Normalizar usage em uma função defensiva

**Rationale**: Mensagens LangChain podem expor uso em `usage_metadata` ou em
`response_metadata.tokenUsage`; um extrator único evita lógica duplicada e
retorna `null` quando o campo não é confiável.

**Alternatives considered**: Inferir tokens sempre por caracteres foi rejeitado
porque não representa o uso real do modelo; confiar em um único campo foi
rejeitado por diferenças entre provedores.

## Decision: `promptTokens` opcional representado por `null`

**Rationale**: Zero pode ser um valor válido, enquanto ausência de metadados é
uma condição diferente. `null` mantém essa distinção no JSON.

**Alternatives considered**: Usar zero para ausência foi rejeitado por produzir
telemetria enganosa; omitir o campo foi rejeitado por dificultar consumidores
com schema estável.

## Decision: Context breakdown estimado com `chars / 4`

**Rationale**: A decomposição precisa atribuir fontes do prompt sem tokenizador
específico de cada modelo. A regra é simples, determinística e adequada para
diagnóstico, não para faturamento.

**Alternatives considered**: Reconstituir tokens reais por fonte foi rejeitado
porque o provedor reporta apenas o total; carregar tokenizadores de cada modelo
foi rejeitado por custo e complexidade.

## Decision: Script POSIX com uma linha por turno

**Rationale**: O script deve ser fácil de executar no ambiente Linux atual e
mostrar crescimento de contexto de maneira comparável.

**Alternatives considered**: Integrar o diagnóstico à arena foi rejeitado para
manter o script focado em conversas; depender de `jq` foi evitado para manter
um fallback simples e testável.
