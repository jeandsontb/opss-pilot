import assert from "node:assert/strict";
import test from "node:test";
import { createLearningReflector } from "../src/agents/learning-reflector.js";
import type { Memory } from "../src/memory/memory-store.js";
import type { MemoryStore } from "../src/memory/memory-store.js";

function memoryStore(recorded: string[]): MemoryStore {
  return {
    async remember(userId, fact): Promise<Memory> {
      recorded.push(`${userId}:${fact}`);
      return { id: "memory-1", userId, fact, embedding: [1], createdAt: new Date() };
    },
    async recall() { return []; },
    async forget() { return false; },
  };
}

test("reflector remembers durable facts from only the last user message", async () => {
  const recorded: string[] = [];
  const reflector = createLearningReflector({
    memories: memoryStore(recorded),
    invokeStructured: async (messages) => {
      assert.equal(messages[1]?.[1], "Me chame de Thiago.");
      return { hasLearning: true, fact: "O usuário prefere ser chamado de Thiago." };
    },
  });

  await reflector.reflect({
    userId: "user-1",
    lastUserMessage: "Me chame de Thiago.",
    answer: "Claro.",
    conversationId: "conversation-1",
  });
  assert.deepEqual(recorded, ["user-1:O usuário prefere ser chamado de Thiago."]);
});

test("reflector skips point-in-time requests, secrets, invalid facts, and missing users", async () => {
  const recorded: string[] = [];
  const contexts = [
    { userId: "user-1", lastUserMessage: "Liste os alertas ativos", result: { hasLearning: true, fact: "Liste os alertas ativos" } },
    { userId: "user-1", lastUserMessage: "Minha senha é token-secreto", result: { hasLearning: true, fact: "Minha senha é token-secreto" } },
    { userId: "user-1", lastUserMessage: "Oi", result: { hasLearning: true, fact: " " } },
    { userId: undefined, lastUserMessage: "Me chame de Ana", result: { hasLearning: true, fact: "O usuário prefere ser chamado de Ana." } },
  ];
  let index = 0;
  const reflector = createLearningReflector({
    memories: memoryStore(recorded),
    invokeStructured: async () => contexts[index++]?.result,
  });

  for (const context of contexts) {
    await reflector.reflect({ ...context, answer: "ok", conversationId: "conversation-1" });
  }
  assert.deepEqual(recorded, []);
});

test("reflector contains provider and store failures", async () => {
  const events: string[] = [];
  const reflector = createLearningReflector({
    memories: memoryStore([]),
    invokeStructured: async () => { throw new Error("provider failed"); },
    logger: (event) => events.push(`${event.outcome}:${event.reason}`),
  });
  await reflector.reflect({ userId: "user-1", lastUserMessage: "Prefiro alertas resumidos.", answer: "ok", conversationId: "c" });
  assert.deepEqual(events, ["failed:Error"]);
});
