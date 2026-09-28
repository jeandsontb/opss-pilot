import type { MemoryStore } from "../memory/memory-store.js";
import type { OperationalRepository } from "../models/store.js";
import type { ContextBreakdown } from "../context/tokens.js";

export type TraceEvent =
  | { type: "thought"; content: string; node?: string }
  | { type: "action"; tool: string; args: Record<string, unknown>; node?: string }
  | { type: "observation"; content: string; node?: string }
  | { type: "plan"; steps: string[]; node?: string }
  | { type: "critique"; content: string; node?: string }
  | { type: "answer"; content: string; node?: string }
  | {
    type: "route";
    route: string;
    reason: string;
    source: "router" | "override";
    node?: string;
  }
  | {
    type: "fallback";
    fromModel: string;
    toModel: string;
    reason: string;
    node?: string;
  }
  | {
    type: "handoff";
    from: string;
    to: string;
    brief: string;
    node?: string;
  };
export type Metrics = {
  llCalls: number;
  latencyMs: number;
  promptTokens?: number | null;
  contextBreakdown?: ContextBreakdown;
  modelUsed?: string;
};
export type ReasoningResult = { answer: string; trace: TraceEvent[]; metrics: Metrics };
export type ReasoningStrategy = {
  readonly name: string;
  run(input: string, options?: {
    maxIterations?: number;
    noReplanner?: boolean;
    strategyOverride?: string;
    store?: OperationalRepository;
    memoryStore?: MemoryStore;
  }): Promise<ReasoningResult>;
};
