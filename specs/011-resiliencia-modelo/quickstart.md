# Quickstart: Resiliência de Modelo

## Pré-requisitos

- Node.js 22 LTS
- Dependências instaladas
- Testes fake não exigem OpenRouter nem secrets

## Validação automatizada

```bash
npm run typecheck
npm test
```

Os testes devem cobrir:

1. retry do primário com sucesso posterior;
2. sucesso imediato sem fallback;
3. fallback após esgotar retries;
4. evento `fallback` e `metrics.modelUsed`;
5. ausência ou valor vazio do modelo reserva;
6. falha total com HTTP 503;
7. sanitização de erros;
8. roteador, estratégias e reflection usando a mesma política.

## Configuração manual

```env
OPENROUTER_MODEL=modelo-primario
OPENROUTER_MODEL_FALLBACK=modelo-reserva
```

O valor reserva é opcional. Quando configurado e usado, a resposta deve
identificar o modelo reserva em `metrics.modelUsed` e conter um evento
`fallback`, sem expor chaves ou mensagens brutas de erro.
