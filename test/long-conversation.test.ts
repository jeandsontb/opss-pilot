import assert from "node:assert/strict";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);

test("long-conversation script prints numeric and unavailable prompt tokens", async () => {
  let turn = 0;
  const server = createServer(async (request, response) => {
    turn += 1;
    let body = "";
    for await (const chunk of request) body += chunk;
    const parsed = JSON.parse(body) as { conversationId?: string };
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({
      conversationId: parsed.conversationId ?? "conversation-1",
      answer: "ok",
      trace: [],
      metrics: {
        llCalls: 1,
        latencyMs: 1,
        historyMessages: Math.max(0, turn - 1),
        promptTokens: turn === 2 ? null : turn * 10,
        contextBreakdown: { currentMessage: 1, history: 1, memories: 0 },
      },
    }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  try {
    const result = await execFileAsync("sh", ["scripts/conversa-longa.sh"], {
      env: { ...process.env, CHAT_URL: `http://127.0.0.1:${address.port}`, CHAT_TURNS: "3" },
    });
    assert.deepEqual(result.stdout.trim().split("\n"), [
      "turn=1 promptTokens=10",
      "turn=2 promptTokens=null",
      "turn=3 promptTokens=30",
    ]);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
