import type { ConversationStore } from "../models/conversation-store.js";
import type { ReasoningResult, ReasoningStrategy } from "../agents/types.js";
import type { MemoryStore } from "../memory/memory-store.js";
import type { LearningReflector } from "../agents/learning-reflector.js";
import { contextBreakdown } from "../context/tokens.js";
import { ContextBuilder } from "../context/context-builder.js";
import type { ObservabilityRepository } from "../obs/trace-persistence.js";
import { persistableTraceEvent } from "../obs/trace-persistence.js";
import { createLogger, type Logger } from "../obs/logger.js";
import type { RequestRecord } from "../obs/types.js";
import { randomUUID } from "node:crypto";

const HISTORY_LIMIT = 8;
const SYSTEM_PROMPT = "Você é o OpssPilot, um copiloto de plantão para incidentes de produção.";

export type ChatInput = {
  message: string;
  requestId?: string;
  conversationId?: string;
  userId?: string;
  strategy?: string;
};

export type ChatResult = ReasoningResult & {
  requestId: string;
  conversationId: string;
  metrics: ReasoningResult["metrics"] & {
    historyMessages: number;
    promptTokens: number | null;
    contextBreakdown: ReturnType<typeof contextBreakdown>;
  };
};

function composeHistoryText(history: Array<{ role: "user" | "assistant"; content: string }>): string {
  return history.length === 0
    ? "(nenhuma mensagem anterior)"
    : history.map(({ role, content }) => `${role}: ${content}`).join("\n");
}

function composeMemoryText(memories: Array<{ fact: string }>): string {
  return memories.length === 0
    ? "(nenhuma memória relevante)"
    : memories.map(({ fact }) => `- ${fact}`).join("\n");
}

export async function runChat(
  input: ChatInput,
  conversations: ConversationStore,
  strategy: ReasoningStrategy,
  memories?: MemoryStore,
  learningReflector?: LearningReflector,
  contextBuilder: ContextBuilder = new ContextBuilder(),
  observability?: ObservabilityRepository,
  requestId: string = randomUUID(),
  log: Logger = createLogger(),
): Promise<ChatResult> {
  const started = Date.now();
  if (observability) {
    await observability.startRequest({
      requestId,
      userId: input.userId,
      status: "running",
      createdAt: new Date().toISOString(),
      route: input.strategy ?? strategy.name,
    } satisfies RequestRecord);
  }
  const conversationId = input.conversationId ?? await conversations.create();
  try {
    const history = await conversations.lastMessages(conversationId, HISTORY_LIMIT);
    const recalledMemories = input.userId && memories
      ? await memories.recall(input.userId, input.message)
      : [];
    const builtContext = contextBuilder.build({
      system: SYSTEM_PROMPT,
      window: history.map(({ role, content }) => ({ role, content })),
      memories: recalledMemories
        .filter((memory): memory is typeof memory & { score: number } => typeof memory.score === "number")
        .map(({ fact, score }) => ({ fact, score })),
      message: input.message,
    });
    await conversations.append(conversationId, "user", input.message);
    const result = await strategy.run(builtContext.prompt, {
      memoryStore: memories,
      strategyOverride: input.strategy,
    });
    const trace = result.trace.map((event) => ({
      ...event,
      node: event.node?.trim() || strategy.name,
    }));
    const route = trace.find((event): event is Extract<typeof event, { type: "route" }> => event.type === "route")?.route
      ?? input.strategy
      ?? strategy.name;
    if (observability) {
      for (const [sequence, event] of trace.entries()) {
        await observability.appendTraceEvent(persistableTraceEvent(requestId, sequence, event));
        log.info({
          requestId,
          event: "trace",
          type: event.type,
          node: event.node,
          sequence,
        });
      }
    }
    await conversations.append(conversationId, "assistant", result.answer);
    if (learningReflector) {
      void learningReflector.reflect({
        userId: input.userId,
        lastUserMessage: input.message,
        answer: result.answer,
        conversationId,
      }).catch((error: unknown) => {
        log.error({ requestId, event: "learning-reflector-failed", errorKind: error instanceof Error ? error.name : "unknown" });
      });
    }
    const finalResult = {
      requestId,
      conversationId,
      ...result,
      trace,
      metrics: {
        ...result.metrics,
        promptTokens: result.metrics.promptTokens ?? null,
        contextBreakdown: contextBreakdown({
          currentMessage: input.message,
          history: composeHistoryText(builtContext.selectedWindow),
          memories: composeMemoryText(builtContext.selectedMemories),
        }),
        historyMessages: builtContext.selectedWindow.length,
      },
    };
    if (observability) {
      await observability.completeRequest(requestId, { ...finalResult, route });
      log.info({
        requestId,
        event: "done",
        type: "done",
        node: "resposta",
        route,
        tokens: finalResult.metrics.promptTokens,
        status: "succeeded",
        durationMs: Date.now() - started,
      });
    }
    return finalResult;
  } catch (error) {
    if (observability) {
      try {
        await observability.failRequest(requestId, error instanceof Error ? error.name : "unknown");
        log.error({ requestId, event: "failed", status: "failed", errorKind: error instanceof Error ? error.name : "unknown" });
      } catch (persistenceError) {
        log.error({ requestId, event: "observability-failed", errorKind: persistenceError instanceof Error ? persistenceError.name : "unknown" });
      }
    }
    throw error;
  }
}
