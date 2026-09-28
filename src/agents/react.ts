import { createReactAgent, createReactAgentAnnotation } from "@langchain/langgraph/prebuilt";
import { createModel, invokeWithResilience } from "./model.js";
import { createTools } from "./tools.js";
import type { ReasoningStrategy, TraceEvent } from "./types.js";
import { SqliteOperationalStore } from "../models/store.js";
import { extractPromptTokens } from "../context/tokens.js";

function text(message: unknown): string { return typeof message === "string" ? message : JSON.stringify(message); }
export const reactStrategy: ReasoningStrategy = {
  name: "react",
  async run(input, options = {}) {
    const started = Date.now(); const events: TraceEvent[] = []; const store = options.store ?? new SqliteOperationalStore();
    const agentState = createReactAgentAnnotation();
    const tools = createTools(store, options.memoryStore);
    const createAgent = (model: ReturnType<typeof createModel>) =>
      createReactAgent({ llm: model, tools, stateSchema: agentState });
    const maxIterations = Math.max(1, options.maxIterations ?? 12);
    const agentInput = { messages: [{ role: "user", content: input }] };
    const invokeOptions = { recursionLimit: maxIterations * 3 + 4 };
    let result;
    let modelMetrics;
    let resilienceTrace: TraceEvent[] = [];
    let promptTokens: number | null = null;
    const invocation = await invokeWithResilience(
      (model) => createAgent(model).invoke(agentInput, invokeOptions),
      { node: "react" },
    );
    result = invocation.value;
    modelMetrics = invocation.metrics;
    resilienceTrace = invocation.trace;
    promptTokens = (result as { messages?: unknown[] }).messages
      ?.map(extractPromptTokens)
      .filter((value): value is number => value !== null)
      .reduce((total, value) => total + value, 0) ?? null;
    const messages = (result as { messages?: Array<{ content?: unknown; type?: string; tool_calls?: unknown[] }> }).messages ?? [];
    for (const message of messages) {
      if (message.tool_calls && message.tool_calls.length > 0) events.push({ type: "action", tool: "tool", args: { calls: message.tool_calls } });
      else events.push({ type: message.type === "ai" ? "thought" : "observation", content: text(message.content) });
    }
    const answer = text(messages.at(-1)?.content ?? "");
    events.push(...resilienceTrace, { type: "answer", content: answer });
    return {
      answer,
      trace: events,
      metrics: {
        llCalls: Math.max(messages.filter((m) => m.type === "ai").length, modelMetrics?.llCalls ?? 0),
        latencyMs: Date.now() - started,
        promptTokens,
        modelUsed: modelMetrics?.modelUsed,
      },
    };
  },
};
