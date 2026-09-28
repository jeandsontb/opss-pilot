import type Database from "better-sqlite3";
import { RequestConflictError, RequestNotFoundError } from "../obs/errors.js";
import type { ObservabilityRepository } from "../obs/trace-persistence.js";
import { requestIdSchema, requestStatusSchema, type RequestRecord, type TraceEventRecord } from "../obs/types.js";
import { getDefaultDatabase, openDatabase } from "./sqlite.js";

type RequestRow = {
  request_id: string;
  status: string;
  created_at: string;
  user_id: string | null;
  route: string | null;
  completed_at: string | null;
  conversation_id: string | null;
  answer: string | null;
  error: string | null;
  metrics: string | null;
};

type TraceEventRow = {
  request_id: string;
  sequence: number;
  type: TraceEventRecord["type"];
  node: string;
  payload: string;
  created_at: string;
};

function toRecord(row: RequestRow): RequestRecord {
  return {
    requestId: row.request_id,
    status: requestStatusSchema.parse(row.status),
    createdAt: row.created_at,
    userId: row.user_id ?? undefined,
    route: row.route ?? undefined,
    completedAt: row.completed_at ?? undefined,
    conversationId: row.conversation_id ?? undefined,
    answer: row.answer ?? undefined,
    error: row.error ?? undefined,
    metrics: row.metrics ? JSON.parse(row.metrics) : undefined,
  };
}

export class SqliteObservabilityRepository implements ObservabilityRepository {
  private readonly db: Database.Database;

  constructor(database: Database.Database | string = getDefaultDatabase()) {
    this.db = typeof database === "string" ? openDatabase(database) : database;
    this.ensureTables();
  }

  private ensureTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS requests (
        request_id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        user_id TEXT,
        route TEXT,
        completed_at TEXT,
        conversation_id TEXT,
        answer TEXT,
        error TEXT,
        metrics TEXT
      );
      CREATE TABLE IF NOT EXISTS trace_events (
        request_id TEXT NOT NULL,
        sequence INTEGER NOT NULL,
        type TEXT NOT NULL,
        node TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (request_id, sequence),
        FOREIGN KEY (request_id) REFERENCES requests(request_id)
      );
      CREATE INDEX IF NOT EXISTS trace_events_request_sequence ON trace_events(request_id, sequence);
      CREATE INDEX IF NOT EXISTS requests_created_at ON requests(created_at);
    `);
  }

  async startRequest(record: RequestRecord): Promise<void> {
    requestIdSchema.parse(record.requestId);
    requestStatusSchema.parse(record.status);
    try {
      this.db.prepare(`
        INSERT INTO requests
          (request_id, status, created_at, user_id, route, completed_at, conversation_id, answer, error, metrics)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        record.requestId,
        record.status,
        record.createdAt,
        record.userId ?? null,
        record.route ?? null,
        record.completedAt ?? null,
        record.conversationId ?? null,
        record.answer ?? null,
        record.error ?? null,
        record.metrics ? JSON.stringify(record.metrics) : null
      );
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err?.code === "SQLITE_CONSTRAINT_PRIMARYKEY" || err?.message?.includes("UNIQUE constraint failed")) {
        throw new RequestConflictError();
      }
      throw error;
    }
  }

  async appendTraceEvent(event: TraceEventRecord): Promise<void> {
    try {
      this.db.prepare(`
        INSERT INTO trace_events
          (request_id, sequence, type, node, payload, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        event.requestId,
        event.sequence,
        event.type,
        event.node,
        JSON.stringify(event.payload),
        event.createdAt
      );
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err?.code === "SQLITE_CONSTRAINT_PRIMARYKEY" || err?.message?.includes("UNIQUE constraint failed")) {
        throw new RequestConflictError();
      }
      throw error;
    }
  }

  async completeRequest(requestId: string, result: { conversationId: string; answer: string; metrics: RequestRecord["metrics"]; route?: string }): Promise<void> {
    const now = new Date().toISOString();
    const update = this.db.prepare(`
      UPDATE requests
      SET status = 'succeeded',
          completed_at = ?,
          conversation_id = ?,
          answer = ?,
          metrics = ?,
          route = COALESCE(?, route)
      WHERE request_id = ?
    `).run(
      now,
      result.conversationId,
      result.answer,
      JSON.stringify(result.metrics ?? {}),
      result.route ?? null,
      requestId
    );
    if (update.changes === 0) throw new RequestNotFoundError();
  }

  async failRequest(requestId: string, errorKind: string): Promise<void> {
    const now = new Date().toISOString();
    const update = this.db.prepare(`
      UPDATE requests
      SET status = 'failed',
          completed_at = ?,
          error = ?
      WHERE request_id = ?
    `).run(now, errorKind, requestId);
    if (update.changes === 0) throw new RequestNotFoundError();
  }

  async getRequest(requestId: string): Promise<{ request: RequestRecord; trace: TraceEventRecord[] } | undefined> {
    const row = this.db.prepare("SELECT * FROM requests WHERE request_id = ?").get(requestId) as RequestRow | undefined;
    if (!row) return undefined;

    const eventRows = this.db.prepare("SELECT * FROM trace_events WHERE request_id = ? ORDER BY sequence ASC").all(requestId) as TraceEventRow[];
    return {
      request: toRecord(row),
      trace: eventRows.map((event) => ({
        requestId: event.request_id,
        sequence: event.sequence,
        type: event.type,
        node: event.node,
        payload: JSON.parse(event.payload),
        createdAt: event.created_at,
      })),
    };
  }

  async getRequestsSince(since: Date): Promise<RequestRecord[]> {
    const iso = since.toISOString();
    const rows = this.db.prepare("SELECT * FROM requests WHERE created_at >= ?").all(iso) as RequestRow[];
    return rows.map(toRecord);
  }
}

export { SqliteObservabilityRepository as PostgresObservabilityRepository };
