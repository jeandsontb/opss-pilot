import express, { type Express } from "express";
import { z } from "zod";
import { productionGraph, resolveStrategy, strategyRegistry } from "../agents/index.js";
import { withReflection } from "../agents/reflection.js";
import type { ReasoningResult, ReasoningStrategy } from "../agents/types.js";
import { ConversationNotFoundError, SqliteConversationStore, type ConversationStore } from "../models/conversation-store.js";
import { runChat } from "../services/chat.js";
import { SqliteMemoryStore, type MemoryStore } from "../memory/memory-store.js";
import { getEmbeddingProvider } from "../memory/embeddings.js";
import { createLearningReflector, type LearningReflector } from "../agents/learning-reflector.js";
import { ContextBuilder } from "../context/context-builder.js";
import { createProductionGraph, normalizeRoute } from "../graph/production-graph.js";
import { ModelUnavailableError } from "../agents/model.js";
import { randomUUID } from "node:crypto";
import { SqliteObservabilityRepository } from "../models/observability-sqlite.js";
import { RequestNotFoundError } from "../obs/errors.js";
import { requestIdSchema } from "../obs/types.js";
import type { ObservabilityRepository } from "../obs/trace-persistence.js";
import { logger } from "../obs/logger.js";
import { summarizeRequests } from "../obs/stats.js";
import { runTeam, teamRequestSchema, teamResponseSchema } from "../team/graph.js";
import type { OperationalRepository } from "../models/store.js";
import { SqliteOperationalStore } from "../models/store.js";

const chatRequestSchema = z.object({
  message: z.string().min(1),
  requestId: requestIdSchema.optional(),
  conversationId: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
  strategy: z.string().min(1).optional(),
  reflect: z.boolean().optional().default(false),
});

const traceEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("thought"), content: z.string(), node: z.string().min(1) }),
  z.object({ type: z.literal("action"), tool: z.string(), args: z.record(z.string(), z.unknown()), node: z.string().min(1) }),
  z.object({ type: z.literal("observation"), content: z.string(), node: z.string().min(1) }),
  z.object({ type: z.literal("plan"), steps: z.array(z.string()), node: z.string().min(1) }),
  z.object({ type: z.literal("critique"), content: z.string(), node: z.string().min(1) }),
  z.object({ type: z.literal("answer"), content: z.string(), node: z.string().min(1) }),
  z.object({ type: z.literal("route"), route: z.string().min(1), reason: z.string().min(1), source: z.enum(["router", "override"]), node: z.string().min(1) }),
  z.object({ type: z.literal("fallback"), fromModel: z.string().min(1), toModel: z.string().min(1), reason: z.string().min(1), node: z.string().min(1) }),
]);
const chatResponseSchema = z.object({
  requestId: requestIdSchema,
  conversationId: z.string().min(1),
  answer: z.string(),
  trace: z.array(traceEventSchema),
  metrics: z.object({
    llCalls: z.number(),
    latencyMs: z.number(),
    historyMessages: z.number().int().nonnegative(),
    promptTokens: z.number().int().nonnegative().nullable(),
    contextBreakdown: z.object({
      currentMessage: z.number().int().nonnegative(),
      history: z.number().int().nonnegative(),
      memories: z.number().int().nonnegative(),
    }),
    modelUsed: z.string().min(1).optional(),
  }),
});
const requestLookupSchema = z.object({
  request: z.object({
    requestId: requestIdSchema,
    status: z.enum(["running", "succeeded", "failed"]),
    createdAt: z.string(),
    completedAt: z.string().optional(),
    conversationId: z.string().optional(),
    answer: z.string().optional(),
    error: z.string().optional(),
    metrics: z.object({
      llCalls: z.number().int().nonnegative(),
      latencyMs: z.number().int().nonnegative(),
      promptTokens: z.number().int().nonnegative().nullable().optional(),
      modelUsed: z.string().optional(),
    }).optional(),
  }),
  trace: z.array(z.object({
    requestId: requestIdSchema,
    sequence: z.number().int().nonnegative(),
    type: z.string(),
    node: z.string().min(1),
    payload: z.record(z.string(), z.unknown()),
    createdAt: z.string(),
  })),
});
const statsSinceSchema = z.string().regex(/^([1-9]\d*)(h|d)$/, "since must use a positive h or d duration");
const statsResponseSchema = z.object({
  since: statsSinceSchema,
  from: z.string(),
  total: z.number().int().nonnegative(),
  errors: z.number().int().nonnegative(),
  tokens: z.number().int().nonnegative(),
  cost: z.literal(0),
  latencyMs: z.object({ p50: z.number().nonnegative().nullable(), p95: z.number().nonnegative().nullable() }),
  byRoute: z.array(z.object({
    key: z.string(), total: z.number().int().nonnegative(), errors: z.number().int().nonnegative(),
    tokens: z.number().int().nonnegative(), cost: z.literal(0),
    latencyMs: z.object({ p50: z.number().nonnegative().nullable(), p95: z.number().nonnegative().nullable() }),
  })),
  byModel: z.array(z.object({
    key: z.string(), total: z.number().int().nonnegative(), errors: z.number().int().nonnegative(),
    tokens: z.number().int().nonnegative(), cost: z.literal(0),
    latencyMs: z.object({ p50: z.number().nonnegative().nullable(), p95: z.number().nonnegative().nullable() }),
  })),
});

function sinceToDate(value: string, now = new Date()): Date {
  const parsed = statsSinceSchema.parse(value).match(/^([1-9]\d*)(h|d)$/);
  if (!parsed) throw new Error("Invalid since duration");
  const amount = Number(parsed[1]);
  const milliseconds = parsed[2] === "h" ? amount * 60 * 60 * 1000 : amount * 24 * 60 * 60 * 1000;
  return new Date(now.getTime() - milliseconds);
}

type ServerOptions = {
  strategies?: Map<string, ReasoningStrategy>;
  timeoutMs?: number;
  reflectStrategy?: (strategy: ReasoningStrategy) => ReasoningStrategy;
  conversations?: ConversationStore;
  memories?: MemoryStore;
  learningReflector?: LearningReflector;
  contextBuilder?: ContextBuilder;
  router?: (prompt: string) => Promise<{ decision: unknown; metrics: ReasoningResult["metrics"] }>;
  observability?: ObservabilityRepository;
  operational?: OperationalRepository;
}

export function createServer(options: ServerOptions = {}): Express {
  const app = express();
  const conversations = options.conversations ?? new SqliteConversationStore();
  const memories = options.memories ?? new SqliteMemoryStore(getEmbeddingProvider());
  const learningReflector = options.learningReflector ?? createLearningReflector({ memories });
  const observability = options.observability ?? new SqliteObservabilityRepository();
  const operational = options.operational ?? new SqliteOperationalStore();

  app.use((request, response, next) => {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-Id");
    response.setHeader("Access-Control-Expose-Headers", "X-Request-Id");
    if (request.method === "OPTIONS") {
      response.status(204).end();
      return;
    }
    next();
  });

  app.use(express.json());

  app.get("/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });

  app.get("/stats", async (request, response, next) => {
    const since = typeof request.query.since === "string" ? request.query.since : "24h";
    const parsedSince = statsSinceSchema.safeParse(since);
    if (!parsedSince.success) {
      response.status(400).json({ error: "since must use a positive h or d duration" });
      return;
    }
    try {
      const from = sinceToDate(parsedSince.data);
      const stats = summarizeRequests(await observability.getRequestsSince(from));
      response.status(200).json(statsResponseSchema.parse({ since: parsedSince.data, from: from.toISOString(), ...stats }));
    } catch (error) {
      next(error);
    }
  });

  app.post("/chat", async (request, response, next) => {
    const parsed = chatRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ issues: parsed.error.issues });
      return;
    }
    const requestId = parsed.data.requestId ?? randomUUID();
    response.setHeader("X-Request-Id", requestId);

    const strategyName = parsed.data.strategy;
    const customStrategy = strategyName ? options.strategies?.get(strategyName) : undefined;
    const officialStrategy = strategyName ? strategyRegistry.get(strategyName) : undefined;
    if (strategyName && !customStrategy && !officialStrategy) {
      const requestId = parsed.data.requestId ?? randomUUID();
      response.setHeader("X-Request-Id", requestId);
      response.status(422).json({ requestId, error: `Unknown strategy: ${strategyName}` });
      return;
    }

    const officialRoute = strategyName
      ? (() => {
        try {
          normalizeRoute(strategyName);
          return true;
        } catch {
          return false;
        }
      })()
      : false;
    const selectedStrategy = (officialRoute
      ? createProductionGraph({
        strategies: {
          react: customStrategy ?? strategyRegistry.get("react"),
          "plan-and-execute": customStrategy ?? strategyRegistry.get("plan-and-execute"),
          reflection: customStrategy ?? strategyRegistry.get("reflection"),
        },
        router: options.router,
      })
      : customStrategy && parsed.data.reflect
      ? (options.reflectStrategy ?? withReflection)(customStrategy)
      : customStrategy) ?? (
      strategyName
        ? (parsed.data.reflect
          ? (options.reflectStrategy ?? withReflection)(officialStrategy as ReasoningStrategy)
          : createProductionGraph({
            strategies: {
              react: strategyRegistry.get("react"),
              "plan-and-execute": strategyRegistry.get("plan-and-execute"),
              reflection: strategyRegistry.get("reflection"),
            },
            router: options.router,
          })
        )
        : (options.router
          ? createProductionGraph({
            strategies: {
              react: strategyRegistry.get("react"),
              "plan-and-execute": strategyRegistry.get("plan-and-execute"),
              reflection: strategyRegistry.get("reflection"),
            },
            router: options.router,
          })
          : productionGraph)
    );

    const timeoutMs = options.timeoutMs ?? 180_000;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;
    try {
      const result = await Promise.race([
        runChat(
          { message: parsed.data.message, requestId, conversationId: parsed.data.conversationId, userId: parsed.data.userId, strategy: strategyName },
          conversations,
          selectedStrategy,
          memories,
          learningReflector,
          options.contextBuilder,
          observability,
          requestId,
          logger,
        ),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => {
            timedOut = true;
            reject(new Error("Chat strategy timed out"));
          }, timeoutMs);
        }),
      ]);
      if (!timedOut) response.status(200).json(chatResponseSchema.parse(result));
    } catch (error) {
      if (timedOut) {
        response.status(504).json({ requestId, error: "Chat strategy timed out" });
        return;
      }
      if (error instanceof ConversationNotFoundError) {
        response.status(404).json({ requestId, error: error.message });
        return;
      }
      if (error instanceof ModelUnavailableError) {
        response.status(503).json({ requestId, error: "Model service unavailable" });
        return;
      }
      next(error);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  });

  app.get("/requests/:id", async (request, response, next) => {
    const parsedId = requestIdSchema.safeParse(request.params.id);
    if (!parsedId.success) {
      response.status(404).json({ error: "Request not found" });
      return;
    }
    try {
      const record = await observability.getRequest(parsedId.data);
      if (!record) throw new RequestNotFoundError();
      response.status(200).json(requestLookupSchema.parse(record));
    } catch (error) {
      if (error instanceof RequestNotFoundError) {
        response.status(404).json({ error: "Request not found" });
        return;
      }
      next(error);
    }
  });

  // ---------------------------------------------------------------------------
  // T015: Rota POST /team — modo equipe multi-agente
  // ---------------------------------------------------------------------------

  app.post("/team", async (request, response, next) => {
    const parsed = teamRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(422).json({ issues: parsed.error.issues });
      return;
    }

    const requestId = parsed.data.requestId ?? randomUUID();
    response.setHeader("X-Request-Id", requestId);

    const timeoutMs = 180_000;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;

    try {
      const result = await Promise.race([
        runTeam({ ...parsed.data, requestId }, conversations, operational, observability),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => {
            timedOut = true;
            reject(new Error("Team graph timed out"));
          }, timeoutMs);
        }),
      ]);
      if (!timedOut) {
        response.status(200).json(teamResponseSchema.parse(result));
      }
    } catch (error) {
      if (timedOut) {
        response.status(504).json({ requestId, error: "Team graph timed out" });
        return;
      }
      if (error instanceof ConversationNotFoundError) {
        response.status(404).json({ requestId, error: error.message });
        return;
      }
      if (error instanceof ModelUnavailableError) {
        response.status(503).json({ requestId, error: "Model service unavailable" });
        return;
      }
      next(error);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  });

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    if (response.headersSent) return;
    response.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
  });

  return app;
}
