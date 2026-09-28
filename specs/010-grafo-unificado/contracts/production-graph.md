# Contrato do Grafo de Produção

```ts
type RouteName = "react" | "plan-and-execute" | "reflection";

type RouteDecision = {
  route: RouteName;
  reason: string;
  source: "router" | "override";
};

type ProductionGraphInput = {
  prompt: string;
  strategyOverride?: RouteName;
  maxIterations?: number;
  noReplanner?: boolean;
};

type ProductionGraphResult = {
  answer: string;
  trace: Array<TraceEvent & { node: string } | {
    type: "route";
    node: "router";
    route: RouteName;
    reason: string;
    source: "router" | "override";
  }>;
  metrics: Metrics;
};
```

O grafo deve executar contexto, decisão, exatamente uma estratégia e resposta.
Uma rota inválida ou uma decisão sem `route`/`reason` deve rejeitar a execução.
