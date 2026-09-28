# Strategy Contract

```ts
interface ReasoningStrategy {
  readonly name: string;
  run(input: string, options?: {
    maxIterations?: number;
    store?: OperationalStore;
  }): Promise<{
    answer: string;
    trace: TraceEvent[];
    metrics: {
      llCalls: number;
      latencyMs: number;
    };
  }>;
}
```

`TraceEvent` é uma união discriminada por `type`:

```ts
type TraceEvent =
  | { type: "thought"; content: string }
  | { type: "plan"; steps: string[] }
  | { type: "action"; tool: string; args: Record<string, unknown> }
  | { type: "observation"; content: string }
  | { type: "critique"; content: string }
  | { type: "answer"; content: string };
```

A implementação pode adicionar metadados opcionais, mas preserva `type`, ordem
dos eventos e campos obrigatórios.
