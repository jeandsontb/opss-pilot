import assert from "node:assert/strict";
import test from "node:test";
import { invokeWithResilience, ModelUnavailableError } from "../src/agents/model.js";
import type { TraceEvent } from "../src/agents/types.js";

type FakeModel = { name: string };

function fake(name: string): FakeModel {
  return { name };
}

test("retries a transient primary failure and avoids fallback after recovery", async () => {
  let calls = 0;
  const result = await invokeWithResilience(
    async (model) => {
      calls += 1;
      assert.equal((model as unknown as FakeModel).name, "primary");
      if (calls === 1) throw Object.assign(new Error("temporary"), { status: 503 });
      return { ok: true };
    },
    {
      primary: "primary",
      fallback: "backup",
      maxAttempts: 2,
      create: (name) => fake(name) as never,
    },
  );

  assert.equal(calls, 2);
  assert.equal(result.metrics.modelUsed, "primary");
  assert.equal(result.trace.length, 0);
});

test("switches to fallback after bounded primary attempts and emits one sanitized event", async () => {
  const attempted: string[] = [];
  const events: TraceEvent[] = [];
  const result = await invokeWithResilience(
    async (model) => {
      const name = (model as unknown as FakeModel).name;
      attempted.push(name);
      if (name === "primary") throw Object.assign(new Error("provider secret and prompt"), { status: 503 });
      return "ok";
    },
    {
      primary: "primary",
      fallback: "backup",
      maxAttempts: 2,
      node: "router",
      create: (name) => fake(name) as never,
      onFallback: (event) => events.push(event),
    },
  );

  assert.equal(result.value, "ok");
  assert.deepEqual(attempted, ["primary", "primary", "backup"]);
  assert.equal(events.length, 1);
  assert.deepEqual(events[0], {
    type: "fallback",
    node: "router",
    fromModel: "primary",
    toModel: "backup",
    reason: "primary-unavailable",
  });
});

test("throws ModelUnavailableError without calling an absent fallback", async () => {
  let calls = 0;
  await assert.rejects(
    () => invokeWithResilience(
      async () => {
        calls += 1;
        throw Object.assign(new Error("unavailable"), { status: 503 });
      },
      { primary: "primary", fallback: "  ", maxAttempts: 2, create: (name) => fake(name) as never },
    ),
    ModelUnavailableError,
  );
  assert.equal(calls, 2);
});
