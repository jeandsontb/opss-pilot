import { ChatOpenAI } from "@langchain/openai";
import type { Metrics, TraceEvent } from "./types.js";
import { extractPromptTokens } from "../context/tokens.js";

const DEFAULT_FALLBACK_MODEL = "openai/gpt-4o-mini";

export function createModel(modelOverride?: string): ChatOpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = modelOverride ?? process.env.OPENROUTER_MODEL;
  if (!apiKey || !model) throw new Error("OPENROUTER_API_KEY and OPENROUTER_MODEL are required");
  return new ChatOpenAI({ model, apiKey, configuration: { baseURL: "https://openrouter.ai/api/v1" }, temperature: 0 });
}

export function createFallbackModel(): ChatOpenAI {
  const model = process.env.OPENROUTER_MODEL_FALLBACK ??
    process.env.OPENROUTER_FALLBACK_MODEL ??
    DEFAULT_FALLBACK_MODEL;
  return createModel(model);
}

export function isRateLimitError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as { status?: number; code?: number; message?: string };
  return candidate.status === 429 ||
    candidate.code === 429 ||
    candidate.message?.includes("rate limit") === true ||
    candidate.message?.includes("free-models-per-day") === true;
}

export class ModelUnavailableError extends Error {
  readonly code = "MODEL_UNAVAILABLE";
  constructor() {
    super("Model service unavailable");
    this.name = "ModelUnavailableError";
  }
}

export type ModelResilienceOptions = {
  primary?: string;
  fallback?: string;
  maxAttempts?: number;
  node?: string;
  create?: (model: string) => ChatOpenAI;
  onFallback?: (event: Extract<TraceEvent, { type: "fallback" }>) => void;
};

export type ResilientInvocation<T> = {
  value: T;
  metrics: Pick<Metrics, "llCalls" | "latencyMs" | "promptTokens" | "modelUsed">;
  trace: Extract<TraceEvent, { type: "fallback" }>[];
};

function isTransientModelError(error: unknown): boolean {
  if (isRateLimitError(error)) return true;
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as { status?: number; code?: string | number; message?: string };
  if (typeof candidate.status === "number" && (candidate.status === 408 || candidate.status >= 500)) return true;
  if (candidate.code === "ECONNRESET" || candidate.code === "ETIMEDOUT" || candidate.code === "ENOTFOUND") return true;
  return /timeout|temporar|unavailable|overloaded/i.test(candidate.message ?? "");
}

function modelName(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed || fallback;
}

export async function invokeWithResilience<T>(
  invoke: (model: ChatOpenAI) => Promise<T>,
  options: ModelResilienceOptions = {},
): Promise<ResilientInvocation<T>> {
  const primary = modelName(options.primary, process.env.OPENROUTER_MODEL ?? "");
  if (!primary) throw new Error("OPENROUTER_MODEL is required");
  const fallback = options.fallback === undefined
    ? process.env.OPENROUTER_MODEL_FALLBACK?.trim()
    : options.fallback.trim();
  const maxAttempts = options.maxAttempts ?? 2;
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new RangeError("maxAttempts must be a positive integer");
  }
  const create = options.create ?? ((model: string) => createModel(model));
  const trace: Extract<TraceEvent, { type: "fallback" }>[] = [];
  let calls = 0;
  let latencyMs = 0;
  let promptTokens: number | null = null;

  const models = [primary, fallback]
    .filter((value): value is string => Boolean(value))
    .filter((value, index, values) => values.indexOf(value) === index);
  for (const [index, model] of models.entries()) {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const started = Date.now();
      calls += 1;
      try {
        const value = await invoke(create(model));
        latencyMs += Date.now() - started;
        promptTokens = extractPromptTokens(value);
        const event = index > 0
          ? {
            type: "fallback" as const,
            node: options.node ?? "model",
            fromModel: primary,
            toModel: model,
            reason: "primary-unavailable",
          }
          : undefined;
        if (event) {
          trace.push(event);
          options.onFallback?.(event);
        }
        return {
          value,
          metrics: { llCalls: calls, latencyMs, promptTokens, modelUsed: model },
          trace,
        };
      } catch (error) {
        latencyMs += Date.now() - started;
        if (!isTransientModelError(error)) throw error;
      }
    }
  }
  throw new ModelUnavailableError();
}
