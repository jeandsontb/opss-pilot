# Contrato da Fábrica de Modelos

A configuração de produção usa:

- `OPENROUTER_API_KEY`: credencial existente;
- `OPENROUTER_MODEL`: modelo primário obrigatório;
- `OPENROUTER_MODEL_FALLBACK`: modelo reserva opcional.

A fábrica deve expor uma política compartilhada que:

1. tenta o primário com retry limitado para falhas transitórias;
2. tenta o reserva somente após o primário esgotar tentativas;
3. não cria chamada para reserva ausente ou vazia;
4. informa o modelo efetivamente usado;
5. propaga um erro de indisponibilidade quando a cadeia termina sem sucesso.

O número de retries e classificadores podem ser injetados em testes, mas não
devem exigir alteração das variáveis públicas de produção.
