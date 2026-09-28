import { z } from "zod";
import { extractPromptTokens, sumPromptTokens } from "../context/tokens.js";
import { createModel, invokeWithResilience } from "../agents/model.js";
import type { Metrics, ReasoningResult, ReasoningStrategy, TraceEvent } from "../agents/types.js";
import type { MemoryStore } from "../memory/memory-store.js";
import type { OperationalRepository } from "../models/store.js";

export const routeNames = ["react", "plan-and-execute", "reflection"] as const;
export type RouteName = (typeof routeNames)[number];
const routeAliases = ["planExecute", "reflect"] as const;
type RouteInputName = RouteName | (typeof routeAliases)[number];

export const routeDecisionSchema = z.object({
  route: z.enum([...routeNames, ...routeAliases] as [RouteInputName, ...RouteInputName[]]),
  reason: z.string().trim().min(1),
});

export const routeTraceSchema = z.object({
  type: z.literal("route"),
  node: z.string().trim().min(1),
  route: z.string().trim().min(1),
  reason: z.string().trim().min(1),
  source: z.enum(["router", "override"]),
});

export const nodeTraceSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("thought"), content: z.string(), node: z.string().trim().min(1) }),
  z.object({ type: z.literal("action"), tool: z.string(), args: z.record(z.string(), z.unknown()), node: z.string().trim().min(1) }),
  z.object({ type: z.literal("observation"), content: z.string(), node: z.string().trim().min(1) }),
  z.object({ type: z.literal("plan"), steps: z.array(z.string()), node: z.string().trim().min(1) }),
  z.object({ type: z.literal("critique"), content: z.string(), node: z.string().trim().min(1) }),
  z.object({ type: z.literal("answer"), content: z.string(), node: z.string().trim().min(1) }),
  z.object({ type: z.literal("fallback"), fromModel: z.string(), toModel: z.string(), reason: z.string(), node: z.string().trim().min(1) }),
]);

export const productionTraceEventSchema = z.union([nodeTraceSchema, routeTraceSchema]);

export type RouteDecision = {
  route: RouteName;
  reason: string;
  source: "router" | "override";
};

export function normalizeRoute(route: string): RouteName {
  if (route === "planExecute") return "plan-and-execute";
  if (route === "reflect") return "reflection";
  if (routeNames.includes(route as RouteName)) return route as RouteName;
  throw new Error(`Unknown strategy route: ${route}`);
}

export type ProductionGraphInput = {
  prompt: string;
  strategyOverride?: string;
  maxIterations?: number;
  noReplanner?: boolean;
  store?: OperationalRepository;
  memoryStore?: MemoryStore;
};

export type ProductionGraphDependencies = {
  strategies?: Partial<Record<RouteName, ReasoningStrategy>>;
  router?: (prompt: string) => Promise<{ decision: unknown; metrics: Metrics; trace?: TraceEvent[] }>;
};

function normalizeTrace(trace: TraceEvent[], node: string): TraceEvent[] {
  return trace.map((event) => ({ ...event, node: event.node?.trim() || node }));
}

function addMetrics(left: Metrics, right: Metrics): Metrics {
  return {
    llCalls: left.llCalls + right.llCalls,
    latencyMs: left.latencyMs + right.latencyMs,
    promptTokens: sumPromptTokens([left.promptTokens, right.promptTokens]),
    modelUsed: right.modelUsed ?? left.modelUsed,
  };
}

const routerTable = [
  "| Route | Critério |",
  "|---|---|",
  "| react | investigação com uso iterativo de ferramentas |",
  "| plan-and-execute | tarefa com passos explícitos e revisão |",
  "| reflection | resposta que deve ser criticada e regenerada |",
].join("\n");

async function defaultRouter(prompt: string): Promise<{ decision: z.infer<typeof routeDecisionSchema>; metrics: Metrics; trace: TraceEvent[] }> {
  const messages: Array<["system" | "user", string]> = [
    ["system", `Escolha exatamente uma rota válida e justifique em uma frase.\n\n${routerTable}`],
    ["user", prompt],
  ];
  const invocation = await invokeWithResilience((model) =>
    model.withStructuredOutput(routeDecisionSchema, { includeRaw: true }).invoke(messages), { node: "router" });
  const value = invocation.value;
  const parsedValue = typeof value === "object" && value !== null && "parsed" in value
    ? (value as { parsed: unknown }).parsed
    : value;
  const rawValue = typeof value === "object" && value !== null && "raw" in value
    ? (value as { raw: unknown }).raw
    : value;
  return {
    decision: routeDecisionSchema.parse(parsedValue),
    metrics: {
      llCalls: invocation.metrics.llCalls,
      latencyMs: invocation.metrics.latencyMs,
      promptTokens: extractPromptTokens(rawValue),
      modelUsed: invocation.metrics.modelUsed,
    },
    trace: invocation.trace,
  };
}

function routeStrategy(
  route: RouteName,
  dependencies: ProductionGraphDependencies,
): ReasoningStrategy {
  const strategy = dependencies.strategies?.[route];
  if (!strategy) throw new Error(`Strategy not configured for route: ${route}`);
  return strategy;
}

export function createProductionGraph(dependencies: ProductionGraphDependencies = {}): ReasoningStrategy {
  return {
    name: "production-graph",
    async run(input, options = {}) {
      const graphInput: ProductionGraphInput = {
        prompt: input,
        maxIterations: options.maxIterations,
        noReplanner: options.noReplanner,
        store: options.store,
        memoryStore: options.memoryStore,
      };
      const route = options.strategyOverride;
      let decision: RouteDecision;
      let routingMetrics: Metrics = { llCalls: 0, latencyMs: 0, promptTokens: null };
      let routingTrace: TraceEvent[] = [];
      if (route) {
        const normalizedRoute = normalizeRoute(route);
        decision = {
          route: normalizedRoute,
          reason: `Estratégia solicitada explicitamente: ${route}.`,
          source: "override",
        };
      } else {
        const routed = await (dependencies.router ?? defaultRouter)(graphInput.prompt);
        const parsed = routeDecisionSchema.parse(routed.decision);
        decision = { ...parsed, route: normalizeRoute(parsed.route), source: "router" };
        routingMetrics = routed.metrics;
        routingTrace = routed.trace ?? [];
      }

      const routeEvent: TraceEvent = {
        type: "route",
        node: "router",
        route: decision.route,
        reason: decision.reason,
        source: decision.source,
      };
      const result = await routeStrategy(decision.route, dependencies).run(graphInput.prompt, options);
      const node = decision.route;
      const trace = [routeEvent, ...normalizeTrace(routingTrace, "router"), ...normalizeTrace(result.trace, node)];
      return {
        answer: result.answer,
        trace,
        metrics: addMetrics(routingMetrics, result.metrics),
      };
    },
  };
}

export function normalizeProductionTrace(trace: TraceEvent[], node: string): TraceEvent[] {
  return normalizeTrace(trace, node);
}
