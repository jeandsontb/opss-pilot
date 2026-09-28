import test from "node:test";
import assert from "node:assert/strict";
import { createTools } from "../src/agents/tools.js";
import { OperationalStore } from "../src/models/store.js";
import { InMemoryMemoryStore } from "../src/memory/memory-store.js";
import type { EmbeddingProvider } from "../src/memory/embeddings.js";

test("accepts sev2 and maps it to high", async () => {
  const store = new OperationalStore();
  const tool = createTools(store).find((candidate) => candidate.name === "open_incident");
  assert.ok(tool);
  const incident = JSON.parse(await tool.invoke({
    title: "Payments outage",
    service: "payments",
    severity: "sev2",
  }));
  assert.equal(incident.severity, "high");
});

test("forget_preference removes only the owner's memory", async () => {
  const provider: EmbeddingProvider = { async embed() { return [1]; } };
  const memories = new InMemoryMemoryStore(provider);
  const memory = await memories.remember("user-1", "Prefere alertas resumidos");
  const tool = createTools(new OperationalStore(), memories).find((candidate) => candidate.name === "forget_preference");
  assert.ok(tool);
  assert.deepEqual(JSON.parse(await tool.invoke({ userId: "user-2", memoryId: memory.id })), { removed: false });
  assert.deepEqual(JSON.parse(await tool.invoke({ userId: "user-1", memoryId: memory.id })), { removed: true });
});
