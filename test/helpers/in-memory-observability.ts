import { RequestConflictError, RequestNotFoundError } from "../../src/obs/errors.js";
import type { ObservabilityRepository } from "../../src/obs/trace-persistence.js";
import type { RequestRecord, TraceEventRecord } from "../../src/obs/types.js";

/** Test double only. Production persistence is SQLite. */
export class InMemoryObservabilityRepository implements ObservabilityRepository {
  private readonly requests = new Map<string, RequestRecord>();
  private readonly events = new Map<string, TraceEventRecord[]>();

  async startRequest(record: RequestRecord): Promise<void> {
    if (this.requests.has(record.requestId)) throw new RequestConflictError();
    this.requests.set(record.requestId, structuredClone(record));
  }
  async appendTraceEvent(event: TraceEventRecord): Promise<void> {
    if (!this.requests.has(event.requestId)) throw new RequestNotFoundError();
    const events = this.events.get(event.requestId) ?? [];
    if (events.some((item) => item.sequence === event.sequence)) throw new RequestConflictError();
    this.events.set(event.requestId, [...events, structuredClone(event)]);
  }
  async completeRequest(requestId: string, result: { conversationId: string; answer: string; metrics: RequestRecord["metrics"]; route?: string }): Promise<void> {
    const request = this.requests.get(requestId);
    if (!request) throw new RequestNotFoundError();
    this.requests.set(requestId, { ...request, status: "succeeded", completedAt: new Date().toISOString(), ...result });
  }
  async failRequest(requestId: string, errorKind: string): Promise<void> {
    const request = this.requests.get(requestId);
    if (!request) throw new RequestNotFoundError();
    this.requests.set(requestId, { ...request, status: "failed", completedAt: new Date().toISOString(), error: errorKind });
  }
  async getRequest(requestId: string): Promise<{ request: RequestRecord; trace: TraceEventRecord[] } | undefined> {
    const request = this.requests.get(requestId);
    if (!request) return undefined;
    return { request: structuredClone(request), trace: structuredClone(this.events.get(requestId) ?? []).sort((a, b) => a.sequence - b.sequence) };
  }
  async getRequestsSince(since: Date): Promise<RequestRecord[]> {
    return [...this.requests.values()].filter((request) => new Date(request.createdAt) >= since).map((request) => structuredClone(request));
  }
}
