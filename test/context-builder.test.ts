import assert from "node:assert/strict";
import test from "node:test";
import {
  ContextBuilder,
  contextBudgetFromEnv,
  DEFAULT_CONTEXT_BUDGET,
} from "../src/context/context-builder.js";

const base = {
  system: "SYSTEM",
  summary: "S".repeat(20),
  window: [
    { role: "user" as const, content: "old" },
    { role: "assistant" as const, content: "middle" },
    { role: "user" as const, content: "new" },
  ],
  memories: [
    { fact: "low", score: 0.4 },
    { fact: "high", score: 0.9 },
    { fact: "tie", score: 0.9 },
  ],
  message: "CURRENT",
};

test("context budgets default and parse validated overrides", () => {
  assert.deepEqual(contextBudgetFromEnv({}), DEFAULT_CONTEXT_BUDGET);
  assert.deepEqual(contextBudgetFromEnv({
    CONTEXT_BUDGET_SUMMARY: "0",
    CONTEXT_BUDGET_WINDOW: "12",
    CONTEXT_BUDGET_MEMORIES: "30",
  }), { summary: 0, window: 12, memories: 30 });
  for (const key of ["CONTEXT_BUDGET_SUMMARY", "CONTEXT_BUDGET_WINDOW", "CONTEXT_BUDGET_MEMORIES"]) {
    assert.throws(() => contextBudgetFromEnv({ [key]: "-1" }), RangeError);
    assert.throws(() => contextBudgetFromEnv({ [key]: "1.5" }), RangeError);
    assert.throws(() => contextBudgetFromEnv({ [key]: "nope" }), RangeError);
  }
});

test("context preserves system and current message and applies stable cuts", () => {
  const built = new ContextBuilder({ summary: 1, window: 3, memories: 2 }).build(base);
  assert.equal(built.system, base.system);
  assert.equal(built.message, base.message);
  assert.equal(built.summary, "SSSS");
  assert.deepEqual(built.selectedWindow.map(({ content }) => content), ["new"]);
  assert.deepEqual(built.selectedMemories.map(({ fact }) => fact), ["high"]);
  assert.match(built.prompt, /^system:\nSYSTEM\n\nsummary:/);
  assert.match(built.prompt, /message:\nCURRENT/);
});

test("zero budgets keep serializable empty optional sections", () => {
  const built = new ContextBuilder({ summary: 0, window: 0, memories: 0 }).build(base);
  assert.equal(built.summary, "");
  assert.deepEqual(built.selectedWindow, []);
  assert.deepEqual(built.selectedMemories, []);
  assert.match(built.prompt, /summary:\n\(nenhum resumo disponível\)/);
});
