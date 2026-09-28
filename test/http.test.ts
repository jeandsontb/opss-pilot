import assert from "node:assert/strict";
import test from "node:test";
import type { AddressInfo } from "node:net";
import { createServer } from "../src/http/server.js";
import type { ReasoningStrategy } from "../src/agents/types.js";
import { InMemoryConversationStore } from "../src/models/conversation-store.js";
import { InMemoryMemoryStore } from "../src/memory/memory-store.js";
import type { EmbeddingProvider } from "../src/memory/embeddings.js";
import type { LearningReflector } from "../src/agents/learning-reflector.js";
import { ModelUnavailableError } from "../src/agents/model.js";
import { InMemoryObservabilityRepository } from "./helpers/in-memory-observability.js";

const result = {
  answer: "Alertas ativos: 3",
  trace: [{ type: "answer" as const, content: "Alertas ativos: 3" }],
  metrics: { llCalls: 1, latencyMs: 2 },
};
const conversations = new InMemoryConversationStore();

async function withServer(
  server: ReturnType<typeof createServer>,
  run: (url: string) => Promise<void>,
): Promise<void> {
  const listener = server.listen(0);
  await new Promise<void>((resolve) => listener.once("listening", resolve));
  const address = listener.address() as AddressInfo;
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()));
  }
}

const fakeStrategy: ReasoningStrategy = {
  name: "fake",
  async run() {
    return result;
  },
};

test("POST /chat returns deterministic strategy result", async () => {
  const server = createServer({ strategies: new Map([["fake", fakeStrategy]]), conversations, observability: new InMemoryObservabilityRepository() });
  await withServer(server, async (url) => {
    const response = await fetch(`${url}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "liste alertas", strategy: "fake" }),
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.conversationId.length > 0, true);
    assert.deepEqual(body.answer, result.answer);
    assert.equal(body.metrics.historyMessages, 0);
    assert.equal(body.metrics.promptTokens, null);
    assert.deepEqual(Object.keys(body.metrics.contextBreakdown).sort(), ["currentMessage", "history", "memories"]);
    assert.deepEqual((await conversations.lastMessages(body.conversationId, 12)).map((message) => message.role), ["user", "assistant"]);
  });

});

test("POST /chat preserves real prompt usage over context estimates", async () => {
  const strategy: ReasoningStrategy = {
    name: "usage",
    async run() {
      return {
        ...result,
        metrics: { llCalls: 2, latencyMs: 4, promptTokens: 37 },
      };
    },
  };
  const server = createServer({
    observability: new InMemoryObservabilityRepository(),
    strategies: new Map([["usage", strategy]]),
    conversations: new InMemoryConversationStore(),
  });
  await withServer(server, async (url) => {
    const response = await fetch(`${url}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "mensagem", strategy: "usage" }),
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.metrics.promptTokens, 37);
    assert.equal(body.metrics.contextBreakdown.currentMessage, 2);
  });
});

test("POST /chat reports validation and unknown strategy errors", async () => {
  const server = createServer({ strategies: new Map([["fake", fakeStrategy]]), conversations, observability: new InMemoryObservabilityRepository() });
  await withServer(server, async (url) => {
    const invalid = await fetch(`${url}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: 42 }),
    });

    assert.equal(invalid.status, 400);
    assert.ok(Array.isArray((await invalid.json()).issues));

    const unknown = await fetch(`${url}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "oi", strategy: "missing" }),
    });
    assert.equal(unknown.status, 422);
  });
});

test("POST /chat maps total model failure to a generic 503", async () => {
  const unavailable: ReasoningStrategy = {
    name: "unavailable",
    async run() {
      throw new ModelUnavailableError();
    },
  };
  const server = createServer({
    observability: new InMemoryObservabilityRepository(),
    strategies: new Map([["unavailable", unavailable]]),
    conversations: new InMemoryConversationStore(),
  });
  await withServer(server, async (url) => {
    const response = await fetch(`${url}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "oi", strategy: "unavailable" }),
    });
    assert.equal(response.status, 503);
    const body = await response.json();
    assert.equal(body.error, "Model service unavailable");
    assert.equal(body.requestId, response.headers.get("x-request-id"));
  });
});

test("POST /chat correlates requestId in the body and response header", async () => {
  const observability = new InMemoryObservabilityRepository();
  const server = createServer({
    strategies: new Map([["fake", fakeStrategy]]),
    conversations: new InMemoryConversationStore(),
    observability,
  });
  await withServer(server, async (url) => {
    const response = await fetch(`${url}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "oi", strategy: "fake", requestId: "req-http-1" }),
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.requestId, "req-http-1");
    assert.equal(response.headers.get("x-request-id"), "req-http-1");

    const generated = await fetch(`${url}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "oi", strategy: "fake" }),
    });
    const generatedBody = await generated.json();
    assert.match(generatedBody.requestId, /^[0-9a-f-]{36}$/);
    assert.equal(generatedBody.requestId, generated.headers.get("x-request-id"));
  });
});

test("GET /requests/:id returns persisted metrics and ordered trace", async () => {
  const observability = new InMemoryObservabilityRepository();
  const strategy: ReasoningStrategy = {
    name: "traceable",
    async run() {
      return {
        answer: "ok",
        trace: [
          { type: "observation", content: "second", node: "worker" },
          { type: "answer", content: "ok", node: "resposta" },
        ],
        metrics: { llCalls: 2, latencyMs: 7, promptTokens: 3, modelUsed: "fake" },
      };
    },
  };
  const server = createServer({
    strategies: new Map([["traceable", strategy]]),
    conversations: new InMemoryConversationStore(),
    observability,
  });
  await withServer(server, async (url) => {
    const chat = await fetch(`${url}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "trace", strategy: "traceable", requestId: "req-trace-1" }),
    });
    assert.equal(chat.status, 200);
    const lookup = await fetch(`${url}/requests/req-trace-1`);
    const body = await lookup.json();
    assert.equal(lookup.status, 200);
    assert.equal(body.request.metrics.modelUsed, "fake");
    assert.deepEqual(body.trace.map((event: { sequence: number }) => event.sequence), [0, 1]);
    assert.deepEqual(body.trace.map((event: { node: string }) => event.node), ["worker", "resposta"]);

    const missing = await fetch(`${url}/requests/does-not-exist`);
    assert.equal(missing.status, 404);
    assert.deepEqual(await missing.json(), { error: "Request not found" });
  });
});

test("GET /stats aggregates recent requests by route and model", async () => {
  const observability = new InMemoryObservabilityRepository();
  const createdAt = new Date().toISOString();
  for (const [requestId, route, model, latencyMs, promptTokens] of [
    ["req-stats-1", "react", "free-model", 10, 5],
    ["req-stats-2", "react", "free-model", 30, 7],
    ["req-stats-3", "reflection", "other-free-model", 100, 11],
  ] as const) {
    await observability.startRequest({ requestId, route, status: "running", createdAt });
    await observability.completeRequest(requestId, {
      conversationId: `conversation-${requestId}`,
      answer: "ok",
      metrics: { llCalls: 1, latencyMs, promptTokens, modelUsed: model },
    });
  }
  await observability.startRequest({ requestId: "req-stats-failed", route: "react", status: "running", createdAt });
  await observability.failRequest("req-stats-failed", "ModelUnavailableError");

  const server = createServer({ observability });
  await withServer(server, async (url) => {
    const response = await fetch(`${url}/stats?since=24h`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.total, 4);
    assert.equal(body.errors, 1);
    assert.equal(body.tokens, 23);
    assert.equal(body.cost, 0);
    assert.deepEqual(body.latencyMs, { p50: 30, p95: 100 });
    assert.deepEqual(body.byRoute.find((item: { key: string }) => item.key === "react"), {
      key: "react", total: 3, errors: 1, tokens: 12, cost: 0, latencyMs: { p50: 10, p95: 30 },
    });
    assert.deepEqual(body.byModel.find((item: { key: string }) => item.key === "free-model"), {
      key: "free-model", total: 2, errors: 0, tokens: 12, cost: 0, latencyMs: { p50: 10, p95: 30 },
    });

    const invalid = await fetch(`${url}/stats?since=0h`);
    assert.equal(invalid.status, 400);
  });
});

test("POST /chat applies reflection and returns timeout", async () => {
  let reflected = false;
  const reflectedStrategy: ReasoningStrategy = {
    name: "reflect:fake",
    async run() {
      reflected = true;
      return { ...result, metrics: { llCalls: 2, latencyMs: 3 } };
    },
  };
  const server = createServer({
    observability: new InMemoryObservabilityRepository(),
    strategies: new Map([["fake", fakeStrategy]]),
    conversations: new InMemoryConversationStore(),
    reflectStrategy: () => reflectedStrategy,
    timeoutMs: 10,
  });
  await withServer(server, async (url) => {
    const reflectedResponse = await fetch(`${url}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "oi", strategy: "fake", reflect: true }),
    });
    assert.equal(reflectedResponse.status, 200);
    assert.equal(reflected, true);

    const slow: ReasoningStrategy = {
      name: "slow",
      async run() {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return result;
      },
    };
    const timeoutServer = createServer({
      observability: new InMemoryObservabilityRepository(),
      strategies: new Map([["slow", slow]]),
      timeoutMs: 5,
    });

    const timeoutListener = timeoutServer.listen(0);
    await new Promise<void>((resolve) => timeoutListener.once("listening", resolve));
    const timeoutAddress = timeoutListener.address() as AddressInfo;
    try {
      const timeoutResponse = await fetch(`http://127.0.0.1:${timeoutAddress.port}/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "oi", strategy: "slow" }),
      });
      assert.equal(timeoutResponse.status, 504);
    } finally {
      await new Promise<void>((resolve, reject) => timeoutListener.close((error) => error ? reject(error) : resolve()));
    }
  });
});

test("POST /chat reuses conversation and composes at most 8 history messages", async () => {
  const store = new InMemoryConversationStore();
  const prompts: string[] = [];
  const strategy: ReasoningStrategy = {
    name: "fake",
    async run(prompt) {
      prompts.push(prompt);
      return result;
    },
  };
  const server = createServer({ strategies: new Map([["fake", strategy]]), conversations: store, observability: new InMemoryObservabilityRepository() });
  await withServer(server, async (url) => {
    const first = await fetch(`${url}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "primeira", strategy: "fake" }),
    });

    const firstBody = await first.json();
    const conversationId = firstBody.conversationId;
    for (let index = 0; index < 7; index += 1) {
      await store.append(conversationId, "user", `anterior-${index}`);
    }
    const second = await fetch(`${url}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "segunda", strategy: "fake", conversationId }),
    });
    const secondBody = await second.json();
    assert.equal(secondBody.conversationId, conversationId);
    assert.equal(secondBody.metrics.historyMessages, 8);
    assert.match(prompts.at(-1) ?? "", /Mensagem atual do usuário:\nsegunda/);
  });
});

test("POST /chat injects recalled memories only for a user", async () => {
  const provider: EmbeddingProvider = {
    async embed() {
      return [1, 0];
    },
  };
  const memoryStore = new InMemoryMemoryStore(provider);
  await memoryStore.remember("user-a", "pagamentos pertence ao time financeiro");
  const prompts: string[] = [];
  const strategy: ReasoningStrategy = {
    name: "fake",
    async run(prompt) {
      prompts.push(prompt);
      return result;
    },
  };
  const server = createServer({
    observability: new InMemoryObservabilityRepository(),
    strategies: new Map([["fake", strategy]]),
    conversations: new InMemoryConversationStore(),
    memories: memoryStore,
  });

  await withServer(server, async (url) => {
    const response = await fetch(`${url}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "qual serviço?", userId: "user-a", strategy: "fake" }),
    });
    assert.equal(response.status, 200);
    assert.match(prompts[0] ?? "", /pagamentos pertence ao time financeiro/);

    await fetch(`${url}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "sem usuário", strategy: "fake" }),
    });
    assert.match(prompts[1] ?? "", /\(nenhuma memória relevante\)/);
  });
});

test("POST /chat schedules learning after the response without changing metrics", async () => {
  let resolveLearning: (() => void) | undefined;
  const learningStarted = new Promise<void>((resolve) => { resolveLearning = resolve; });
  const reflector: LearningReflector = {
    async reflect(context) {
      assert.equal(context.lastUserMessage, "prefiro resumos");
      resolveLearning?.();
      await new Promise((resolve) => setTimeout(resolve, 25));
    },
  };
  const server = createServer({
    observability: new InMemoryObservabilityRepository(),
    strategies: new Map([["fake", fakeStrategy]]),
    conversations: new InMemoryConversationStore(),
    learningReflector: reflector,
    memories: new InMemoryMemoryStore({ async embed() { return [1, 0]; } }),
  });
  await withServer(server, async (url) => {
    const response = await fetch(`${url}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "prefiro resumos", userId: "user-1", strategy: "fake" }),
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.metrics.llCalls, 1);
    await learningStarted;
  });
});
