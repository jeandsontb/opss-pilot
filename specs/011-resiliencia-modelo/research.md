# Research: Resiliência de Modelo

## Decision: Centralizar retry e fallback na fábrica de modelos

**Rationale**: Roteador, estratégias e reflection já dependem de
`createModel`. Um executor compartilhado evita implementações divergentes e
garante o mesmo comportamento em todas as chamadas.

**Alternatives considered**: Tratar falhas apenas em cada estratégia
duplicaria regras e deixaria chamadas do roteador sem resiliência.

## Decision: Retry limitado apenas para falhas transitórias/disponibilidade

**Rationale**: Repetir erros de validação, autenticação ou entrada não resolve a
causa e aumenta latência. O limite deve ser pequeno e injetável para testes.

**Alternatives considered**: Repetir qualquer erro foi rejeitado por poder
mascarar defeitos permanentes e gerar custo desnecessário.

## Decision: Fallback é uma cadeia de modelos com evento na troca efetiva

**Rationale**: O primário é tentado com retry; após esgotamento, a cadeia tenta
o modelo reserva. O evento `fallback` é emitido somente quando o modelo usado
realmente muda.

**Alternatives considered**: Emitir evento em cada tentativa confundiria retry
do mesmo modelo com degradação para outro modelo.

## Decision: 503 somente para indisponibilidade total

**Rationale**: A borda HTTP precisa distinguir falha de dependência de erro
interno ou de entrada. Um erro de domínio `ModelUnavailableError` permite
traduzir apenas a falha total para 503 sem expor detalhes.

**Alternatives considered**: Converter qualquer exceção do agente em 503
ocultaria erros de programação e viola o tratamento explícito de erros.

## Decision: `modelUsed` e usage real são acumulados sem estimativa substituta

**Rationale**: O modelo efetivo precisa ser auditável e tokens reais continuam
separados das estimativas de contexto. Chamadas de retry e fallback somam
latência/chamadas conforme o resultado disponível.

**Alternatives considered**: Inferir o modelo a partir do prompt ou usar
estimativa de tokens quando usage falta foi rejeitado por ser impreciso.
