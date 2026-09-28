import assert from "node:assert/strict";
import test from "node:test";
import { InMemoryMemoryStore, decodeEmbedding, encodeEmbedding } from "../src/memory/memory-store.js";
import type { EmbeddingProvider } from "../src/memory/embeddings.js";

class FakeEmbeddingProvider implements EmbeddingProvider {
  private readonly vectors = new Map<string, number[]>();

  constructor(entries: Record<string, number[]>) {
    Object.entries(entries).forEach(([text, vector]) => this.vectors.set(text, vector));
  }

  async embed(text: string): Promise<number[]> {
    const vector = this.vectors.get(text);
    if (!vector) throw new Error(`Missing fake embedding: ${text}`);
    return [...vector];
  }
}

test("remember normalizes embeddings and deduplicates semantic duplicates per user", async () => {
  const provider = new FakeEmbeddingProvider({
    original: [1, 0],
    duplicate: [0.99, 0.01],
  });
  const store = new InMemoryMemoryStore(provider);
  const first = await store.remember("user-a", "original");
  const duplicate = await store.remember("user-a", "duplicate");

  assert.equal(duplicate.id, first.id);
  assert.ok(Math.abs(first.embedding[0] ** 2 + first.embedding[1] ** 2 - 1) < 0.00001);
  assert.equal((await store.recall("user-a", "original")).length, 1);
  assert.equal((await store.recall("user-b", "original")).length, 0);
});

test("recall filters by relevance, sorts by dot product and returns at most three", async () => {
  const provider = new FakeEmbeddingProvider({
    query: [1, 0],
    high: [0.97, 0.24],
    medium: [0.7, 0.7],
    low: [0.3, 0.954],
    unrelated: [-1, 0],
  });
  const store = new InMemoryMemoryStore(provider);
  await store.remember("user-a", "medium");
  await store.remember("user-a", "low");
  await store.remember("user-a", "high");
  await store.remember("user-a", "unrelated");

  const recalled = await store.recall("user-a", "query");
  assert.deepEqual(recalled.map((memory) => memory.fact), ["high", "medium"]);
  assert.ok(recalled.every((memory) => (memory.score ?? 0) >= 0.3));
});

test("recall works for semantically related text without shared words", async () => {
  const provider = new FakeEmbeddingProvider({
    "qual o contato": [1, 0],
    "A equipe financeira é dona dos pagamentos": [0.99, 0.01],
  });
  const store = new InMemoryMemoryStore(provider);
  await store.remember("user-a", "A equipe financeira é dona dos pagamentos");

  const result = await store.recall("user-a", "qual o contato");
  assert.equal(result[0]?.fact, "A equipe financeira é dona dos pagamentos");
});

test("forget protects user ownership and removes the selected memory", async () => {
  const provider = new FakeEmbeddingProvider({ fact: [1, 0] });
  const store = new InMemoryMemoryStore(provider);
  const memory = await store.remember("user-a", "fact");
  await store.remember("user-b", "fact");

  assert.equal(await store.forget("user-b", memory.id), false);
  assert.equal(await store.forget("user-a", memory.id), true);
  assert.deepEqual(await store.recall("user-a", "fact"), []);
});

test("embedding BLOB encoding round-trips normalized vectors", () => {
  const decoded = decodeEmbedding(encodeEmbedding([3, 4]));
  assert.deepEqual(decoded.map((value) => Number(value.toFixed(6))), [0.6, 0.8]);
});
