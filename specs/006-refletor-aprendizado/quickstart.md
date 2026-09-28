# Quickstart: Refletor de Aprendizado

## Pré-requisitos

- Node.js 22 LTS.
- Dependências instaladas com `npm install`.
- Provider fake usado nos testes; nenhuma chamada de rede é necessária.

## Validação offline

```bash
npm run typecheck
npm test
```

Os testes devem comprovar:

1. Fato durável é extraído e salvo para o `userId`.
2. Pedido pontual e segredo não são salvos.
3. A reflexão assíncrona não bloqueia a resposta e falhas não a alteram.
4. `forget_preference` remove uma memória do próprio usuário e não de outro.
5. O prompt de reflexão usa somente a última mensagem original do usuário.

## Validação manual

Com o servidor configurado, envie uma mensagem com `userId` que declare uma
preferência durável e aguarde a tarefa assíncrona. Em seguida, faça uma nova
consulta semanticamente relacionada e confirme que o fato aparece no contexto.

Não inclua credenciais, tokens, chaves ou outros segredos na validação manual.
