import { z } from "zod";
import type { Metrics, TraceEvent } from "../agents/types.js";
import { requestIdSchema, type RequestRecord, type TraceEventRecord, type PersistedTracePayload } from "./types.js";

export type ObservabilityRepository = {
  startRequest(record: RequestRecord): Promise<void>;
  appendTraceEvent(event: TraceEventRecord): Promise<void>;
  completeRequest(requestId: string, result: { conversationId: string; answer: string; metrics: Metrics; route?: string }): Promise<void>;
  failRequest(requestId: string, errorKind: string): Promise<void>;
  getRequest(requestId: string): Promise<{ request: RequestRecord; trace: TraceEventRecord[] } | undefined>;
  getRequestsSince(since: Date): Promise<RequestRecord[]>;
};

const secretPattern = /(api[_ -]?key|authorization|bearer|password|senha|token|secret|prompt interno|provider)/i;

function safeValue(value: unknown): unknown {
  if (typeof value === "string") {
    if (secretPattern.test(value)) throw new Error("Sensitive trace payload rejected");
    return value;
  }
  if (Array.isArray(value)) return value.map(safeValue);
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => {
      if (secretPattern.test(key)) throw new Error("Sensitive trace payload rejected");
      return [key, safeValue(entry)];
    }));
  }
  if (typeof value === "function" || typeof value === "symbol" || typeof value === "bigint") {
    throw new Error("Trace payload is not serializable");
  }
  return value;
}

export function persistableTraceEvent(requestId: string, sequence: number, event: TraceEvent): TraceEventRecord {
  const node = event.node?.trim();
  if (!requestIdSchema.safeParse(requestId).success || !node) throw new Error("Invalid trace event");
  const payload = z.record(z.string(), z.unknown()).parse(safeValue(event)) as PersistedTracePayload;
  return {
    requestId,
    sequence,
    type: event.type,
    node,
    payload,
    createdAt: new Date().toISOString(),
  };
}
