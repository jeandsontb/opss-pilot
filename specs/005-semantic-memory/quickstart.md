# Quickstart: Memória Semântica

1. Instale dependências:

   ```bash
   npm install
   ```

2. Execute validações offline:

   ```bash
   npm run typecheck
   npm test
   ```

3. Os testes da feature devem usar `MemoryStore` em memória e provider de embedding fake. Eles devem verificar:

   - deduplicação acima de `0.92`;
   - recall top-3 com mínimo `0.3`;
   - isolamento por `userId`;
   - remoção via `forget`;
   - recall de fato sem palavras em comum;
   - injeção das memórias no prompt do `/chat`.

4. A validação do provider real local deve ocorrer somente em ambiente com os artefatos `all-MiniLM-L6-v2` disponíveis; os testes não devem baixá-los nem acessar rede.
