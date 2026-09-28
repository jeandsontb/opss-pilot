# Quickstart: Instrumentação de Tokens e Contexto

## Validação offline

```bash
npm run typecheck
npm test
```

Os testes devem verificar:

1. `estimateTokens` aplica `chars / 4` de forma determinística.
2. Usage real válido é extraído e usage ausente vira `null`.
3. Uso de múltiplas chamadas é somado sem duplicação.
4. `/chat` retorna `promptTokens` e `contextBreakdown`.
5. A decomposição contém mensagem, histórico e memórias com valores não
   negativos.
6. `conversa-longa.sh` imprime `promptTokens` por turno, incluindo `null`.

## Diagnóstico manual

Com o servidor configurado, execute:

```bash
./scripts/conversa-longa.sh
```

Compare o crescimento de `promptTokens` por turno. O valor é uso real quando
disponível; a decomposição por fonte é apenas estimativa diagnóstica.
