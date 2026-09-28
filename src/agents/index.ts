import { planAndExecuteStrategy } from "./plan-and-execute.js";
import { reactStrategy } from "./react.js";
import { withReflection } from "./reflection.js";
import type { ReasoningStrategy } from "./types.js";
import { createProductionGraph } from "../graph/production-graph.js";

export const strategyRegistry = new Map<string, ReasoningStrategy>([
  ["react", reactStrategy],
  ["plan-and-execute", planAndExecuteStrategy],
  ["reflection", withReflection(reactStrategy)],
]);

export const productionGraph = createProductionGraph({
  strategies: {
    react: reactStrategy,
    "plan-and-execute": planAndExecuteStrategy,
    reflection: withReflection(reactStrategy),
  },
});

export function resolveStrategy(name: string, reflect: boolean): ReasoningStrategy | undefined {
  const strategy = strategyRegistry.get(name);
  return strategy && reflect ? withReflection(strategy) : strategy;
}
