# Contrato do ContextBuilder

```ts
type ContextBudget = {
  summary: number;
  window: number;
  memories: number;
};

type ContextInput = {
  system: string;
  summary?: string;
  window: Array<{ role: "user" | "assistant"; content: string }>;
  memories: Array<{ fact: string; score: number }>;
  message: string;
};

type BuiltContext = {
  prompt: string;
  summary: string;
  selectedWindow: ContextInput["window"];
  selectedMemories: ContextInput["memories"];
  budgets: ContextBudget;
};

interface ContextBuilder {
  build(input: ContextInput): BuiltContext;
}
```

Defaults: `summary=200`, `window=1200`, `memories=300`.

`system` e `message` nunca são truncados. A janela remove mensagens mais
antigas até caber; memórias são avaliadas por score decrescente com desempate
estável. O resumo é truncado deterministicamente quando necessário.
