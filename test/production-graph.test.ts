import assert from "node:assert/strict";
import test from "node:test";
import { createProductionGraph, type RouteName } from "../src/graph/production-graph.js";
import type { ReasoningStrategy } from "../src/agents/types.js";

function strategy(name: string, calls: string[]): ReasoningStrategy {
  return {
    name,
    async run(input) {
      calls.push(name);
      return {
        answer: `${name}: ${input}`,
        trace: [
          { type: "thought", content: "inspect" },
          { type: "answer", content: `${name} answer` },
        ],
        metrics: { llCalls: 1, latencyMs: 3 },
      };
    },
  };
}

test("production graph routes each official strategy and enriches trace nodes", async () => {
  for (const route of ["react", "plan-and-execute", "reflection"] as RouteName[]) {
    const calls: string[] = [];
    const graph = createProductionGraph({
      strategies: {
        react: strategy("react", calls),
        "plan-and-execute": strategy("plan-and-execute", calls),
        reflection: strategy("reflection", calls),
      },
      router: async () => ({
        decision: { route, reason: `reason for ${route}` },
        metrics: { llCalls: 1, latencyMs: 2 },
      }),
    });

    const result = await graph.run("context");
    assert.deepEqual(calls, [route]);
    assert.equal(result.trace[0]?.type, "route");
    assert.equal(result.trace[0]?.node, "router");
    assert.equal(result.trace[0]?.route, route);
    assert.ok(result.trace.every((event) => event.node));
    assert.equal(result.metrics.llCalls, 2);
  }
});

test("explicit strategy override bypasses the router", async () => {
  let routerCalls = 0;
  const calls: string[] = [];
  const graph = createProductionGraph({
    strategies: {
      react: strategy("react", calls),
      "plan-and-execute": strategy("plan-and-execute", calls),
      reflection: strategy("reflection", calls),
    },
    router: async () => {
      routerCalls += 1;
      return {
        decision: { route: "react", reason: "not expected" },
        metrics: { llCalls: 1, latencyMs: 1 },
      };
    },
  });

  const result = await graph.run("context", { strategyOverride: "plan-and-execute" });
  assert.equal(routerCalls, 0);
  assert.deepEqual(calls, ["plan-and-execute"]);
  assert.deepEqual(result.trace[0], {
    type: "route",
    node: "router",
    route: "plan-and-execute",
    reason: "Estratégia solicitada explicitamente: plan-and-execute.",
    source: "override",
  });
  assert.equal(result.metrics.llCalls, 1);
});

test("invalid router decisions fail before a strategy runs", async () => {
  let strategyCalls = 0;
  const graph = createProductionGraph({
    strategies: {
      react: {
        name: "react",
        async run() {
          strategyCalls += 1;
          throw new Error("must not execute");
        },
      },
    },
    router: async () => ({
      decision: { route: "unknown", reason: "" },
      metrics: { llCalls: 1, latencyMs: 1 },
    }),
  });

  await assert.rejects(() => graph.run("context"), /Invalid|Too small|enum/i);
  assert.equal(strategyCalls, 0);
});
