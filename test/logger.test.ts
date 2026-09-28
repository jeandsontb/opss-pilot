import assert from "node:assert/strict";
import test from "node:test";
import { createLogger } from "../src/obs/logger.js";

test("logger emits one metadata-only JSON line per event", () => {
  const lines: string[] = [];
  const log = createLogger((line) => lines.push(line));
  log.info({
    requestId: "req-log-1",
    event: "done",
    type: "answer",
    node: "resposta",
    sequence: 1,
    status: "succeeded",
    durationMs: 10,
    payload: "must not be logged",
  } as never);
  assert.equal(lines.length, 1);
  const parsed = JSON.parse(lines[0] ?? "");
  assert.equal(parsed.requestId, "req-log-1");
  assert.equal(parsed.node, "resposta");
  assert.equal("payload" in parsed, false);
});
