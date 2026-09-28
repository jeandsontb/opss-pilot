import test from "node:test";
import assert from "node:assert/strict";
import { withReflection } from "../src/agents/reflection.js";
import type { ReasoningStrategy } from "../src/agents/types.js";

function fakeStrategy(): ReasoningStrategy {
  let calls = 0;
  return {
    name: "fake",
    async run(input) {
      calls += 1;
      return {
        answer: `${input} (attempt ${calls})`,
        trace: [{ type: "observation", content: `observed ${calls}` }],
        metrics: { llCalls: 1, latencyMs: 10 },
      };
    },
  };
}

test("reflection stops on approval and records critique metrics", async () => {
  const strategy = withReflection(fakeStrategy(), {
    critique: async () => ({ approved: true, feedback: "Resposta consistente." }),
  });
  const result = await strategy.run("investigue");
  assert.equal(result.metrics.llCalls, 2);
  assert.ok(result.metrics.latencyMs >= 10);
  assert.equal(result.trace.at(-1)?.type, "critique");
});

test("reflection regenerates with feedback and sums metrics", async () => {
  let critiques = 0;
  const strategy = withReflection(fakeStrategy(), {
    maxReflections: 2,
    critique: async (input) => {
      critiques += 1;
      if (critiques === 1) {
        assert.match(input, /investigue/);
        return { approved: false, feedback: "Inclua a causa observada." };
      }
      return { approved: true, feedback: "Agora está consistente." };
    },
  });
  const result = await strategy.run("investigue");
  assert.equal(critiques, 2);
  assert.equal(result.metrics.llCalls, 4);
  assert.ok(result.metrics.latencyMs >= 20);
  assert.match(result.answer, /Feedback da reflexão anterior/);
  assert.equal(result.trace.filter((event) => event.type === "critique").length, 2);
});

test("zero reflections returns the base result without critique", async () => {
  const strategy = withReflection(fakeStrategy(), {
    maxReflections: 0,
    critique: async () => {
      throw new Error("critic should not run");
    },
  });
  const result = await strategy.run("investigue");
  assert.equal(result.metrics.llCalls, 1);
  assert.equal(result.trace.some((event) => event.type === "critique"), false);
});
