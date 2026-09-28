import { z } from "zod";
import type { Metrics, TraceEvent } from "../agents/types.js";

export const requestIdSchema = z.string()
  .min(1)
  .max(128)
  .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), "requestId contains control characters");

export const requestStatusSchema = z.enum(["running", "succeeded", "failed"]);
export type RequestStatus = z.infer<typeof requestStatusSchema>;

export const persistedTracePayloadSchema = z.record(z.string(), z.unknown());
export type PersistedTracePayload = z.infer<typeof persistedTracePayloadSchema>;

export type RequestRecord = {
  requestId: string;
  status: RequestStatus;
  createdAt: string;
  userId?: string;
  /** The strategy/graph route selected for this execution. */
  route?: string;
  completedAt?: string;
  conversationId?: string;
  answer?: string;
  error?: string;
  metrics?: Pick<Metrics, "llCalls" | "latencyMs" | "promptTokens" | "modelUsed">;
};

export type TraceEventRecord = {
  requestId: string;
  sequence: number;
  type: TraceEvent["type"];
  node: string;
  payload: PersistedTracePayload;
  createdAt: string;
};
