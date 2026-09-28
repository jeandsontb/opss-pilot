import test from "node:test";
import assert from "node:assert/strict";
import { parseBenchArgs, runBench } from "../src/bench.js";

test("bench parses scenario selection and no-replanner flag", () => {
  assert.deepEqual(parseBenchArgs(["--scenario", "C1", "--no-replanner"]), {
    scenario: "C1",
    noReplanner: true,
  });
});

test("bench rejects unknown scenario", async () => {
  await assert.rejects(
    () => runBench(["--scenario", "C4"]),
    /Invalid option/,
  );
});
