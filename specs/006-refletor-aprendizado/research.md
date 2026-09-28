# Research: Refletor de Aprendizado

## Decision: Provider estruturado injetável com schema `{ hasLearning, fact }`

**Rationale**: O refletor precisa distinguir fato durável de pedido pontual e
produzir uma forma validável antes de acessar o armazenamento. Um provider fake
permite testar essa decisão sem rede ou credenciais.

**Alternatives considered**: Extrair fatos por regex foi rejeitado por não
capturar preferências implícitas; aceitar texto livre foi rejeitado por não
garantir o contrato nem a segurança da persistência.

## Decision: Disparo fire-and-forget após a resposta principal

**Rationale**: O aprendizado é pós-processamento e não pode aumentar a latência
percebida nem causar falha no `/chat`. A tarefa deve capturar e registrar sua
própria falha sem rejeitar a promise do request.

**Alternatives considered**: Aguardar `remember` antes de responder foi
rejeitado porque viola o requisito de não bloqueio; esconder falhas foi
rejeitado porque impede observabilidade.

## Decision: Política conservadora de elegibilidade

**Rationale**: Segredos e classificações ambíguas não podem ser persistidos.
Pedidos operacionais, perguntas e comandos pontuais são descartados; fatos
duráveis explícitos são os únicos candidatos.

**Alternatives considered**: Salvar toda saída `hasLearning=true` foi rejeitado
porque o modelo pode classificar incorretamente conteúdo sensível.

## Decision: Forget como tool de domínio, não como nova rota

**Rationale**: As estratégias já operam com tools e o requisito pede
`forget_preference`; a tool reutiliza o isolamento do `MemoryStore` sem
duplicar controller HTTP.

**Alternatives considered**: Nova rota pública foi adiada para evitar ampliar o
contrato HTTP sem requisito de produto.
