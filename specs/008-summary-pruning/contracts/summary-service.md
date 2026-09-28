# Contrato do serviço de sumarização

```ts
type SummarizeInput = {
  previousSummary: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  targetTokens: 150;
};

interface Summarizer {
  summarize(input: SummarizeInput): Promise<string>;
}
```

Implementações devem preservar decisões, fatos e pendências, mesclar o resumo
anterior, retornar texto não vazio e manter saída aproximadamente próxima de
150 tokens. O sumarizador não persiste dados.

O serviço de pruning só chama essa interface quando existem oito mensagens
completas além da janela recente desde o contador persistido. A atualização do
store ocorre apenas após validar o retorno.
