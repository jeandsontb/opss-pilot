import test from "node:test";
import assert from "node:assert/strict";
import { formatTrace } from "../src/agents/trace.js";
test("formats trace deterministically", () => {
  assert.equal(formatTrace({ trace: [
    { type: "route", route: "react", reason: "use tools", source: "router" },
    { type: "fallback", fromModel: "primary", toModel: "backup", reason: "primary-unavailable", node: "router" },
    { type: "thought", content: "inspect", node: "react" }, { type: "action", tool: "list_alerts", args: { status: "firing" }, node: "react" },
    { type: "observation", content: "[]" }, { type: "answer", content: "done" },
  ] }), '[route] react: use tools\n[fallback] primary -> backup: primary-unavailable\n[thought] inspect\n[action] list_alerts {"status":"firing"}\n[observation] []\n[answer] done');
});
