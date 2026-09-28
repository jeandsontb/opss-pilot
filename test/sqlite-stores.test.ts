import assert from "node:assert/strict";
import test from "node:test";
import Database from "better-sqlite3";
import { SqliteConversationStore, ConversationNotFoundError } from "../src/models/conversation-store.js";
import { SqliteObservabilityRepository } from "../src/models/observability-sqlite.js";
import { SqliteMemoryStore } from "../src/memory/memory-store.js";
import { SqliteOperationalStore } from "../src/models/store.js";
import { RequestConflictError, RequestNotFoundError } from "../src/obs/errors.js";
import type { EmbeddingProvider } from "../src/memory/embeddings.js";

test("SqliteConversationStore creates, appends, orders, and isolates messages", async () => {
  const db = new Database(":memory:");
  const store = new SqliteConversationStore(db);
  const first = await store.create();
  const second = await store.create();

  await store.append(first, "user", "olá");
  await store.append(first, "assistant", "como posso ajudar?");
  await store.append(second, "user", "mensagem em outra conversa");

  const firstMessages = await store.lastMessages(first, 10);
  assert.equal(firstMessages.length, 2);
  assert.equal(firstMessages[0]?.role, "user");
  assert.equal(firstMessages[0]?.content, "olá");
  assert.equal(firstMessages[1]?.role, "assistant");

  const secondMessages = await store.lastMessages(second, 10);
  assert.equal(secondMessages.length, 1);
  assert.equal(secondMessages[0]?.content, "mensagem em outra conversa");

  await assert.rejects(() => store.lastMessages("nao-existe", 10), ConversationNotFoundError);
  await assert.rejects(() => store.append("nao-existe", "user", "falha"), ConversationNotFoundError);
});

test("SqliteObservabilityRepository handles full request lifecycle and duplicate protection", async () => {
  const db = new Database(":memory:");
  const repo = new SqliteObservabilityRepository(db);

  await repo.startRequest({
    requestId: "req-1",
    status: "running",
    createdAt: new Date().toISOString(),
  });

  await assert.rejects(
    () => repo.startRequest({ requestId: "req-1", status: "running", createdAt: new Date().toISOString() }),
    RequestConflictError,
  );

  await repo.appendTraceEvent({
    requestId: "req-1",
    sequence: 0,
    type: "thought",
    node: "react",
    payload: { content: "analisando" },
    createdAt: new Date().toISOString(),
  });

  await repo.completeRequest("req-1", {
    conversationId: "conv-1",
    answer: "tudo certo",
    metrics: { llCalls: 1, latencyMs: 10, promptTokens: 42 },
  });

  const record = await repo.getRequest("req-1");
  assert.equal(record?.request.status, "succeeded");
  assert.equal(record?.request.answer, "tudo certo");
  assert.equal(record?.trace.length, 1);
  assert.equal(record?.trace[0]?.sequence, 0);

  await assert.rejects(() => repo.completeRequest("req-missing", { conversationId: "c", answer: "a", metrics: { llCalls: 0, latencyMs: 0 } }), RequestNotFoundError);
});

test("SqliteOperationalStore opens and resolves incidents and lists alerts", async () => {
  const db = new Database(":memory:");
  const store = new SqliteOperationalStore(db);

  const alerts = await store.listAlerts();
  assert.ok(alerts.length >= 0);

  const incident = await store.openIncident({
    title: "Latência alta no auth",
    serviceId: "auth",
    severity: "low",
  });
  assert.equal(incident.status, "open");
  assert.equal(incident.severity, "low");

  const resolved = await store.resolveIncident(incident.id);
  assert.equal(resolved.status, "resolved");
});

test("SqliteMemoryStore remembers, recalls, and forgets facts per user", async () => {
  const db = new Database(":memory:");
  const provider: EmbeddingProvider = {
    async embed(text: string) {
      return text.includes("Thiago") ? [1, 0] : [0, 1];
    },
  };
  const store = new SqliteMemoryStore(provider, db);

  const memory = await store.remember("user-1", "O usuário se chama Thiago");
  assert.equal(memory.fact, "O usuário se chama Thiago");

  const recalled = await store.recall("user-1", "Qual o nome do Thiago?");
  assert.equal(recalled.length, 1);
  assert.equal(recalled[0]?.fact, "O usuário se chama Thiago");

  const recalledOther = await store.recall("user-2", "Qual o nome do Thiago?");
  assert.equal(recalledOther.length, 0);

  const removed = await store.forget("user-1", memory.id);
  assert.equal(removed, true);
  const recalledAfter = await store.recall("user-1", "Qual o nome do Thiago?");
  assert.equal(recalledAfter.length, 0);
});
