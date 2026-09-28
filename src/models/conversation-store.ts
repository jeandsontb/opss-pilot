import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import { getDefaultDatabase, openDatabase } from "./sqlite.js";

export const messageRoles = ["user", "assistant"] as const;
export type MessageRole = (typeof messageRoles)[number];

export type ConversationMessage = {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: Date;
};

export class ConversationNotFoundError extends Error {
  constructor(conversationId: string) {
    super(`Conversation not found: ${conversationId}`);
    this.name = "ConversationNotFoundError";
  }
}

export interface ConversationStore {
  create(): Promise<string>;
  append(conversationId: string, role: MessageRole, content: string): Promise<ConversationMessage>;
  lastMessages(conversationId: string, limit: number): Promise<ConversationMessage[]>;
}

export class InMemoryConversationStore implements ConversationStore {
  private readonly conversations = new Set<string>();
  private readonly messages = new Map<string, ConversationMessage[]>();

  async create(): Promise<string> {
    const conversationId = randomUUID();
    this.conversations.add(conversationId);
    this.messages.set(conversationId, []);
    return conversationId;
  }

  async append(conversationId: string, role: MessageRole, content: string): Promise<ConversationMessage> {
    this.ensureConversation(conversationId);
    if (!messageRoles.includes(role) || content.trim().length === 0) {
      throw new Error("Message role and content are required");
    }
    const message: ConversationMessage = {
      id: randomUUID(),
      conversationId,
      role,
      content,
      createdAt: new Date(),
    };
    this.messages.get(conversationId)?.push(message);
    return message;
  }

  async lastMessages(conversationId: string, limit: number): Promise<ConversationMessage[]> {
    this.ensureConversation(conversationId);
    if (!Number.isInteger(limit) || limit < 1) throw new Error("Message limit must be a positive integer");
    const messages = this.messages.get(conversationId) ?? [];
    return messages.slice(Math.max(0, messages.length - limit)).map((message) => ({ ...message }));
  }

  private ensureConversation(conversationId: string): void {
    if (!this.conversations.has(conversationId)) throw new ConversationNotFoundError(conversationId);
  }
}

export class SqliteConversationStore implements ConversationStore {
  private readonly db: Database.Database;

  constructor(database: Database.Database | string = getDefaultDatabase()) {
    this.db = typeof database === "string" ? openDatabase(database) : database;
    this.ensureTables();
  }

  private ensureTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES conversations(id),
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS messages_conversation_created_at ON messages(conversation_id, created_at);
    `);
  }

  async create(): Promise<string> {
    const id = randomUUID();
    this.db.prepare("INSERT INTO conversations (id) VALUES (?)").run(id);
    return id;
  }

  async append(conversationId: string, role: MessageRole, content: string): Promise<ConversationMessage> {
    if (!messageRoles.includes(role) || content.trim().length === 0) {
      throw new Error("Message role and content are required");
    }
    const conv = this.db.prepare("SELECT id FROM conversations WHERE id = ?").get(conversationId);
    if (!conv) {
      throw new ConversationNotFoundError(conversationId);
    }
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    try {
      this.db.prepare(`
        INSERT INTO messages (id, conversation_id, role, content, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, conversationId, role, content, createdAt);
      return { id, conversationId, role, content, createdAt: new Date(createdAt) };
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err?.code === "SQLITE_CONSTRAINT_FOREIGNKEY" || err?.message?.includes("FOREIGN KEY constraint failed")) {
        throw new ConversationNotFoundError(conversationId);
      }
      throw error;
    }
  }

  async lastMessages(conversationId: string, limit: number): Promise<ConversationMessage[]> {
    if (!Number.isInteger(limit) || limit < 1) throw new Error("Message limit must be a positive integer");
    const conv = this.db.prepare("SELECT id FROM conversations WHERE id = ?").get(conversationId);
    if (!conv) {
      throw new ConversationNotFoundError(conversationId);
    }
    const rows = this.db.prepare(`
      SELECT id, conversation_id as conversationId, role, content, created_at as createdAt
      FROM (
        SELECT id, conversation_id, role, content, created_at, rowid
        FROM messages
        WHERE conversation_id = ?
        ORDER BY created_at DESC, rowid DESC
        LIMIT ?
      ) recent
      ORDER BY createdAt ASC, rowid ASC
    `).all(conversationId, limit) as Array<{ id: string; conversationId: string; role: MessageRole; content: string; createdAt: string }>;

    return rows.map((row) => ({
      id: row.id,
      conversationId: row.conversationId,
      role: row.role,
      content: row.content,
      createdAt: new Date(row.createdAt),
    }));
  }
}

export { SqliteConversationStore as PostgresConversationStore };
