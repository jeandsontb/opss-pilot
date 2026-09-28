import assert from "node:assert/strict";
import test from "node:test";
import { InMemoryObservabilityRepository } from "./helpers/in-memory-observability.js";
import { RequestConflictError } from "../src/obs/errors.js";

test("observability repository contract persists lifecycle and rejects duplicate IDs", async () => {
  const repository = new InMemoryObservabilityRepository();
  await repository.startRequest({
    requestId: "req-store-1",
    status: "running",
    createdAt: new Date().toISOString(),
  });
  await assert.rejects(
    () => repository.startRequest({
      requestId: "req-store-1",
      status: "running",
      createdAt: new Date().toISOString(),
    }),
    RequestConflictError,
  );
  await repository.appendTraceEvent({
    requestId: "req-store-1",
    sequence: 1,
    type: "answer",
    node: "answer",
    payload: { content: "done" },
    createdAt: new Date().toISOString(),
  });
  await repository.appendTraceEvent({
    requestId: "req-store-1",
    sequence: 0,
    type: "thought",
    node: "react",
    payload: { content: "inspect" },
    createdAt: new Date().toISOString(),
  });
  await repository.completeRequest("req-store-1", {
    conversationId: "conversation-1",
    answer: "done",
    metrics: { llCalls: 1, latencyMs: 2, promptTokens: null },
  });
  const result = await repository.getRequest("req-store-1");
  assert.equal(result?.request.status, "succeeded");
  assert.deepEqual(result?.trace.map((event) => event.sequence), [0, 1]);
});
