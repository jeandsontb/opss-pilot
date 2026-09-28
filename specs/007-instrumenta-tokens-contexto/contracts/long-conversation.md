# Contrato de `conversa-longa.sh`

O script executa turnos sequenciais e imprime uma linha por turno concluído:

```text
turn=1 promptTokens=321
turn=2 promptTokens=null
```

O marcador `null` significa que o uso real não foi disponibilizado. O script
não deve transformar esse caso em zero nem ocultar o turno.
