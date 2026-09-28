# Quickstart: Conversas Persistentes

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Valide tipos e testes determinísticos:

   ```bash
   npm run typecheck
   npm test
   ```

3. O teste de integração usa `createServer` com um `ConversationStore` em memória e uma estratégia fake. Ele verifica criação de conversa, reutilização de `conversationId`, persistência de usuário/assistant e limite de 12 mensagens.

4. Para testar manualmente após iniciar o servidor:

   ```bash
   npm run dev
   curl -s localhost:3000/chat \
     -X POST \
     -H 'content-type: application/json' \
     -d '{"message":"liste alertas ativos"}'
   ```
