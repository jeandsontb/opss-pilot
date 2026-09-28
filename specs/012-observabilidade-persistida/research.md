# Research: Observabilidade Persistida

## Decision: Repositório SQLite isolado e injetável

**Decision**: Usar SQLite como armazenamento local separado dos modelos
operacionais PostgreSQL, encapsulado em um repositório injetável que pode usar
um banco em memória nos testes.

**Rationale**: A feature é de observabilidade local e não deve acoplar o ciclo
de chat à conexão operacional existente. A injeção permite testes determinísticos
sem rede ou credenciais.

**Alternatives considered**: Reutilizar PostgreSQL aumentaria a dependência
operacional e contrariaria o requisito explícito de SQLite; escrever arquivos
JSON dificultaria consultas consistentes e ordenação concorrente.

## Decision: Driver SQLite explícito compatível com Node.js 22

**Decision**: Usar o driver `sqlite3` com uma camada pequena de comandos
parametrizados e inicialização idempotente das tabelas.

**Rationale**: O projeto já usa Sequelize para PostgreSQL, mas a versão
instalada não garante suporte SQLite no ambiente atual. Um driver explícito
mantém o escopo da persistência de observabilidade pequeno e permite escolher
`:memory:` em testes.

**Alternatives considered**: `node:sqlite` depende da versão exata do runtime;
`better-sqlite3` exige módulo nativo síncrono; usar Sequelize SQLite adicionaria
acoplamento a uma integração não presente no projeto.

## Decision: Persistir trace por sequência monotônica

**Decision**: Cada evento recebe uma sequência iniciando em zero por request, e
as consultas ordenam por `sequence ASC`.

**Rationale**: Ordem de inserção e timestamp podem empatar ou variar sob
concorrência. Uma sequência explícita preserva a ordem lógica de emissão.

**Alternatives considered**: Ordenar apenas por timestamp não garante ordem
determinística; ordenar pelo id não representa a emissão.

## Decision: Sanitização antes do logger e da persistência

**Decision**: Persistir somente eventos que já passaram por um sanitizador
tipado; logar metadados (`requestId`, tipo, node, sequence, timestamp e
duração), nunca payloads completos ou erros brutos.

**Rationale**: Traces podem carregar conteúdo de usuário e respostas externas.
Separar payload persistido do log reduz risco de exposição e mantém o logger
adequado para agregadores.

**Alternatives considered**: Serializar o trace inteiro no log foi rejeitado
por potencialmente expor prompts, tokens e dados operacionais.

## Decision: Persistência de falhas sem mascarar o erro

**Decision**: Criar o registro no início, atualizar estado e métricas ao final,
e registrar erro sanitizado em falhas; se a persistência falhar, o serviço
mantém o erro original e o logger reporta apenas o nome/categoria.

**Rationale**: Observabilidade não pode transformar erro de domínio em sucesso
ou esconder indisponibilidade do modelo.

**Alternatives considered**: Falhar a resposta sempre que o armazenamento
estiver indisponível prejudicaria o caminho principal; retornar sucesso falso é
inaceitável.
