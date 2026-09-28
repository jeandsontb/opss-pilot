# Research: Memória Semântica

## Decision: Isolar o modelo atrás de um provider lazy singleton

**Rationale**: `@huggingface/transformers` pode carregar um pipeline pesado. Uma promessa compartilhada evita inicializações concorrentes e mantém o custo fora das requisições até o primeiro embedding.

**Alternatives considered**: Criar o pipeline por chamada foi rejeitado por custo e uso excessivo de memória; inicialização no import foi rejeitada porque prejudica testes e startup.

## Decision: Pooling mean com normalização L2

**Rationale**: O requisito define mean pooling e `normalize: true`; vetores unitários tornam o produto escalar diretamente comparável como similaridade.

**Alternatives considered**: Similaridade textual ou distância euclidiana não atendem ao contrato de recall semântico solicitado.

## Decision: Deduplicação e recall em memória do usuário

**Rationale**: Filtrar por `userId` antes dos cálculos garante isolamento e mantém as operações simples para o escopo atual.

**Alternatives considered**: Busca vetorial no PostgreSQL foi adiada porque a persistência exigida é BLOB e o volume/índice vetorial não faz parte desta feature.

## Decision: Embedding persistido como BLOB

**Rationale**: O modelo produz vetor numérico de dimensão fixa; serialização binária compacta preserva o requisito da tabela `memories` sem depender de extensão vetorial.

**Alternatives considered**: JSON/array textual foi rejeitado por não atender ao BLOB especificado.

## Decision: Provider fake injetável nos testes

**Rationale**: Testes precisam ser offline e provar recall sem palavras em comum; um provider fake permite controlar vetores equivalentes sem carregar pesos ou acessar rede.

**Alternatives considered**: Usar o modelo real nos testes foi rejeitado por não ser determinístico em ambiente CI e por depender de artefatos externos.
