# Contrato do Roteador

O prompt do roteador deve conter uma tabela com as rotas:

| Route | Critério |
|---|---|
| `react` | investigação com uso iterativo de ferramentas |
| `plan-and-execute` | tarefa que se beneficia de passos explícitos e revisão |
| `reflection` | resposta que deve ser criticada e regenerada quando necessário |

A saída estruturada é:

```ts
{
  route: "react" | "plan-and-execute" | "reflection";
  reason: string;
}
```

O resultado é validado antes do roteamento. O roteador realiza no máximo uma
chamada de modelo por execução sem override. Falhas são propagadas.
