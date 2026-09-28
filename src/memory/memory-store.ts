import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import type { EmbeddingProvider } from "./embeddings.js";
import { getDefaultDatabase, openDatabase } from "../models/sqlite.js";

export const MEMORY_DEDUPLICATION_THRESHOLD = 0.92;
export const MEMORY_RECALL_THRESHOLD = 0.3;
export const MEMORY_RECALL_LIMIT = 3;

export type Memory = {
  id: string;
  userId: string;
  fact: string;
  embedding: number[];
  createdAt: Date;
  score?: number;
};

export interface MemoryStore {
  remember(userId: string, fact: string): Promise<Memory>;
  recall(userId: string, query: string, k?: number): Promise<Memory[]>;
  forget(userId: string, memoryId: string): Promise<boolean>;
}

function validateText(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} is required`);
  }
}

function normalizeEmbedding(embedding: number[]): number[] {
  if (!Array.isArray(embedding) || embedding.length === 0 || embedding.some((value) => !Number.isFinite(value))) {
    throw new Error("Embedding must be a non-empty finite vector");
  }
  const norm = Math.sqrt(embedding.reduce((sum, value) => sum + value ** 2, 0));
  if (norm === 0) throw new Error("Embedding must not be a zero vector");
  return embedding.map((value) => value / norm);
}

export function dot(left: number[], right: number[]): number {
  if (left.length !== right.length) throw new Error("Embedding dimensions must match");
  return left.reduce((sum, value, index) => sum + value * right[index], 0);
}

export function encodeEmbedding(embedding: number[]): Buffer {
  const normalized = normalizeEmbedding(embedding);
  const buffer = Buffer.allocUnsafe(normalized.length * Float32Array.BYTES_PER_ELEMENT);
  normalized.forEach((value, index) => buffer.writeFloatLE(value, index * Float32Array.BYTES_PER_ELEMENT));
  return buffer;
}

export function decodeEmbedding(buffer: Buffer): number[] {
  if (buffer.length === 0 || buffer.length % Float32Array.BYTES_PER_ELEMENT !== 0) {
    throw new Error("Invalid embedding BLOB");
  }
  const values = Array.from({ length: buffer.length / Float32Array.BYTES_PER_ELEMENT }, (_, index) =>
    buffer.readFloatLE(index * Float32Array.BYTES_PER_ELEMENT));
  return normalizeEmbedding(values);
}

export class InMemoryMemoryStore implements MemoryStore {
  private readonly memories = new Map<string, Memory[]>();

  constructor(private readonly provider: EmbeddingProvider) {}

  async remember(userId: string, fact: string): Promise<Memory> {
    validateText(userId, "userId");
    validateText(fact, "fact");
    const embedding = normalizeEmbedding(await this.provider.embed(fact));
    const existing = this.memories.get(userId) ?? [];
    const duplicate = existing.find((memory) =>
      memory.embedding.length === embedding.length &&
      dot(embedding, memory.embedding) > MEMORY_DEDUPLICATION_THRESHOLD);
    if (duplicate) return { ...duplicate, embedding: [...duplicate.embedding] };
    const memory: Memory = { id: randomUUID(), userId, fact: fact.trim(), embedding, createdAt: new Date() };
    this.memories.set(userId, [...existing, memory]);
    return { ...memory, embedding: [...memory.embedding] };
  }

  async recall(userId: string, query: string, k = MEMORY_RECALL_LIMIT): Promise<Memory[]> {
    validateText(userId, "userId");
    validateText(query, "query");
    if (!Number.isInteger(k) || k < 1) throw new Error("Recall limit must be a positive integer");
    const embedding = normalizeEmbedding(await this.provider.embed(query));
    return (this.memories.get(userId) ?? [])
      .filter((memory) => memory.embedding.length === embedding.length)
      .map((memory) => ({ ...memory, embedding: [...memory.embedding], score: dot(embedding, memory.embedding) }))
      .filter((memory) => (memory.score ?? 0) >= MEMORY_RECALL_THRESHOLD)
      .sort((left, right) => (right.score ?? 0) - (left.score ?? 0))
      .slice(0, Math.min(k, MEMORY_RECALL_LIMIT));
  }

  async forget(userId: string, memoryId: string): Promise<boolean> {
    validateText(userId, "userId");
    validateText(memoryId, "memoryId");
    const existing = this.memories.get(userId) ?? [];
    const next = existing.filter((memory) => memory.id !== memoryId);
    if (next.length === existing.length) return false;
    this.memories.set(userId, next);
    return true;
  }
}

export class SqliteMemoryStore implements MemoryStore {
  private readonly db: Database.Database;

  constructor(private readonly provider: EmbeddingProvider, database: Database.Database | string = getDefaultDatabase()) {
    this.db = typeof database === "string" ? openDatabase(database) : database;
    this.ensureTables();
  }

  private ensureTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        fact TEXT NOT NULL,
        embedding BLOB NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS memories_user_id ON memories(user_id);
    `);
  }

  private allForUser(userId: string): Memory[] {
    const rows = this.db.prepare(
      "SELECT id, user_id, fact, embedding, created_at FROM memories WHERE user_id = ?"
    ).all(userId) as Array<{ id: string; user_id: string; fact: string; embedding: Buffer; created_at: string }>;

    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      fact: row.fact,
      embedding: decodeEmbedding(row.embedding),
      createdAt: new Date(row.created_at),
    }));
  }

  async remember(userId: string, fact: string): Promise<Memory> {
    validateText(userId, "userId");
    validateText(fact, "fact");
    const embedding = normalizeEmbedding(await this.provider.embed(fact));
    const duplicate = (this.allForUser(userId)).find((memory) =>
      memory.embedding.length === embedding.length && dot(embedding, memory.embedding) > MEMORY_DEDUPLICATION_THRESHOLD);
    if (duplicate) return { ...duplicate, embedding: [...duplicate.embedding] };
    const memory: Memory = { id: randomUUID(), userId, fact: fact.trim(), embedding, createdAt: new Date() };
    this.db.prepare(
      "INSERT INTO memories (id, user_id, fact, embedding, created_at) VALUES (?, ?, ?, ?, ?)"
    ).run(memory.id, memory.userId, memory.fact, encodeEmbedding(memory.embedding), memory.createdAt.toISOString());
    return { ...memory, embedding: [...memory.embedding] };
  }

  async recall(userId: string, query: string, k = MEMORY_RECALL_LIMIT): Promise<Memory[]> {
    validateText(userId, "userId");
    validateText(query, "query");
    if (!Number.isInteger(k) || k < 1) throw new Error("Recall limit must be a positive integer");
    const embedding = normalizeEmbedding(await this.provider.embed(query));
    return (this.allForUser(userId))
      .filter((memory) => memory.embedding.length === embedding.length)
      .map((memory) => ({ ...memory, embedding: [...memory.embedding], score: dot(embedding, memory.embedding) }))
      .filter((memory) => (memory.score ?? 0) >= MEMORY_RECALL_THRESHOLD)
      .sort((left, right) => (right.score ?? 0) - (left.score ?? 0))
      .slice(0, Math.min(k, MEMORY_RECALL_LIMIT));
  }

  async forget(userId: string, memoryId: string): Promise<boolean> {
    validateText(userId, "userId");
    validateText(memoryId, "memoryId");
    const result = this.db.prepare("DELETE FROM memories WHERE id = ? AND user_id = ?").run(memoryId, userId);
    return result.changes > 0;
  }
}

export { SqliteMemoryStore as PostgresMemoryStore };
