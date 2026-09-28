import assert from "node:assert/strict";
import test from "node:test";
import { runChat } from "../src/services/chat.js";
import { ContextBuilder } from "../src/context/context-builder.js";
import { InMemoryConversationStore } from "../src/models/conversation-store.js";
import type { ReasoningStrategy } from "../src/agents/types.js";

test("all strategy adapters receive the same built context", async () => {
  const prompts: string[] = [];
  const strategies: ReasoningStrategy[] = ["react", "plan-and-execute", "reflect"].map((name) => ({
    name,
    async run(prompt) {
      prompts.push(prompt);
      return {
        answer: name,
        trace: [{ type: "answer", content: name }],
        metrics: { llCalls: 1, latencyMs: 0 },
      };
    },
  }));
  for (const strategy of strategies) {
    await runChat(
      { message: "investigue o alerta" },
      new InMemoryConversationStore(),
      strategy,
      undefined,
      undefined,
      new ContextBuilder({ summary: 10, window: 10, memories: 10 }),
    );
  }
  assert.equal(new Set(prompts).size, 1);
  assert.match(prompts[0] ?? "", /^system:\n/);
});
