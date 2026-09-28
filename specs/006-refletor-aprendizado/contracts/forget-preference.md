# Contrato da tool `forget_preference`

## Argumentos

```json
{
  "userId": "user-123",
  "memoryId": "memory-456"
}
```

Ambos os campos são strings não vazias e devem ser validados antes da
operação.

## Resultado

- `removed: true` quando a memória pertence ao usuário e foi removida.
- `removed: false` quando o identificador não existe ou pertence a outro
  usuário.

A tool não revela se um identificador de outro usuário existe.
