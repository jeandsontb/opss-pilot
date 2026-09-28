import { AIMessage } from "@langchain/core/messages";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { z } from "zod";
import { createModel, invokeWithResilience } from "./model.js";
import { createTools } from "./tools.js";
import { SqliteOperationalStore, type OperationalRepository } from "../models/store.js";
import type { ReasoningStrategy, TraceEvent } from "./types.js";
import { extractPromptTokens } from "../context/tokens.js";

const MAX_STEPS = 8;
const plannerSchema = z.object({
  steps: z.array(z.string().min(1)).max(MAX_STEPS),
});
const replannerSchema = z.object({
  remaining: z.array(z.string().min(1)).max(MAX_STEPS),
  answer: z.string().default(""),
  done: z.boolean(),
});

const PEState = Annotation.Root({
  input: Annotation<string>(),
  plan: Annotation<string[]>({ reducer: (_left, right) => right, default: () => [] }),
  done: Annotation<[string, string][]>({
    reducer: (left, right) => left.concat(right),
    default: () => [],
  }),
  answer: Annotation<string>({ reducer: (_left, right) => right, default: () => "" }),
  finished: Annotation<boolean>({ reducer: (_left, right) => right, default: () => false }),
  iterations: Annotation<number>({
    reducer: (left, right) => left + right,
    default: () => 0,
  }),
  trace: Annotation<TraceEvent[]>({
    reducer: (left, right) => left.concat(right),
    default: () => [],
  }),
  llCalls: Annotation<number>({
    reducer: (left, right) => left + right,
    default: () => 0,
  }),
  promptTokens: Annotation<number | null>({
    reducer: (left, right) => left === null ? right : right === null ? left : left + right,
    default: () => null,
  }),
  modelUsed: Annotation<string | undefined>({ reducer: (_left, right) => right, default: () => undefined }),
  maxIterations: Annotation<number>({ reducer: (_left, right) => right, default: () => MAX_STEPS }),
  noReplanner: Annotation<boolean>({ reducer: (_left, right) => right, default: () => false }),
  store: Annotation<OperationalRepository>(),
  memoryStore: Annotation<import("../memory/memory-store.js").MemoryStore | undefined>(),
});

type PlanState = typeof PEState.State;

const contentText = (content: unknown): string =>
  typeof content === "string" ? content : JSON.stringify(content);

const toolCallArgs = (args: unknown): Record<string, unknown> =>
  typeof args === "object" && args !== null ? args as Record<string, unknown> : {};

async function invokeWithFallback<T>(
  invoke: (model: ReturnType<typeof createModel>) => Promise<T>,
): Promise<{ value: T; promptTokens: number | null; llCalls: number; modelUsed?: string; fallbackTrace: TraceEvent[] }> {
  const result = await invokeWithResilience(invoke, { node: "plan-and-execute" });
  return {
    value: result.value,
    promptTokens: extractPromptTokens(result.value) ?? (
      typeof result.value === "object" && result.value !== null
        ? extractPromptTokens((result.value as { raw?: unknown }).raw)
        : null
    ),
    llCalls: result.metrics.llCalls,
    modelUsed: result.metrics.modelUsed,
    fallbackTrace: result.trace,
  };
}

function planner(state: PlanState) {
  return invokeWithFallback((model) => model
    .withStructuredOutput(plannerSchema, { includeRaw: true })
    .invoke([
      ["system", "Crie passos curtos, ordenados e executáveis com as ferramentas disponíveis. Nunca crie mais de oito passos."],
      ["user", state.input],
    ]))
    .then(({ value, promptTokens, llCalls, modelUsed, fallbackTrace }) => {
      const steps = plannerSchema.parse(
        (value as { parsed?: unknown }).parsed ?? value,
      ).steps.slice(0, MAX_STEPS);
      return {
        plan: steps,
        llCalls,
        promptTokens,
        modelUsed,
        trace: [...fallbackTrace, { type: "plan", steps } satisfies TraceEvent],
      };
    });
}

async function executor(state: PlanState) {
  const step = state.plan[0];
  if (!step) return { iterations: 1, answer: "Nenhum passo restante." };

  const tools = createTools(state.store, state.memoryStore);
  const { value: response, promptTokens, llCalls, modelUsed, fallbackTrace } = await invokeWithFallback((model) => model.bindTools(tools).invoke([
    ["system", "Execute exatamente um passo. Use uma ferramenta quando necessário e retorne uma observação curta. Considere os resultados anteriores para reutilizar IDs criados."],
    ["user", JSON.stringify({ step, completed: state.done })],
  ]));
  const message = response instanceof AIMessage ? response : new AIMessage(contentText(response.content));
  const actionEvents: TraceEvent[] = [];
  const observations: [string, string][] = [];

  for (const call of message.tool_calls ?? []) {
    const tool = tools.find((candidate) => candidate.name === call.name);
    if (!tool) throw new Error(`Unknown tool requested by model: ${call.name}`);
    const executable = tool as unknown as { invoke(input: unknown): Promise<unknown> };
    const result = await executable.invoke(call.args);
    actionEvents.push({ type: "action", tool: call.name, args: toolCallArgs(call.args) });
    observations.push([call.name, contentText(result)]);
  }

  const observation = observations.length > 0
    ? observations.map(([name, result]) => `${name}: ${result}`).join("\n")
    : contentText(message.content);
  return {
    plan: state.plan.slice(1),
    done: [[step, observation] as [string, string]],
    iterations: 1,
    llCalls,
    promptTokens,
    modelUsed,
    trace: [
      ...fallbackTrace,
      { type: "thought", content: step } satisfies TraceEvent,
      ...actionEvents,
      { type: "observation", content: observation } satisfies TraceEvent,
    ],
  };
}

async function replanner(state: PlanState) {
  const completedSteps = state.done.length;
  if (state.plan.length === 0 || completedSteps >= Math.min(state.maxIterations, MAX_STEPS)) {
    return { answer: state.done.at(-1)?.[1] ?? "Execução encerrada sem observação.", finished: true };
  }

  const { value, promptTokens, llCalls, modelUsed, fallbackTrace } = await invokeWithFallback((model) => model.withStructuredOutput(replannerSchema, { includeRaw: true }).invoke([
    ["system", "Revise os passos restantes. Decida seguir, ajustar ou encerrar. Nunca produza mais de oito passos no total."],
    ["user", JSON.stringify({ input: state.input, remaining: state.plan, done: state.done })],
  ]));
  const decision = replannerSchema.parse((value as { parsed?: unknown }).parsed ?? value);
  const remaining = decision.remaining.slice(0, Math.min(state.maxIterations, MAX_STEPS) - completedSteps);
  return {
    plan: remaining,
    answer: decision.answer,
    finished: decision.done || remaining.length === 0,
    llCalls,
    promptTokens,
    modelUsed,
    trace: [...fallbackTrace, { type: "critique", content: decision.done ? "Execução encerrada pelo replanner." : "Passos restantes revisados." } satisfies TraceEvent],
  };
}

function route(state: PlanState): "executor" | typeof END {
  return !state.finished &&
    state.plan.length > 0 &&
    state.done.length < Math.min(state.maxIterations, MAX_STEPS)
    ? "executor"
    : END;
}

function afterExecutor(state: PlanState): "executor" | "replanner" | typeof END {
  if (state.noReplanner) {
    return state.plan.length > 0 &&
      state.done.length < Math.min(state.maxIterations, MAX_STEPS)
      ? "executor"
      : END;
  }
  return "replanner";
}

function buildGraph() {
  return new StateGraph(PEState)
    .addNode("planner", planner)
    .addNode("executor", executor)
    .addNode("replanner", replanner)
    .addEdge(START, "planner")
    .addEdge("planner", "executor")
    .addConditionalEdges("executor", afterExecutor, ["executor", "replanner", END])
    .addConditionalEdges("replanner", route, ["executor", END])
    .compile();
}

export const planAndExecuteStrategy: ReasoningStrategy = {
  name: "plan-and-execute",
  async run(input, options = {}) {
    const started = Date.now();
    const store = options.store ?? new SqliteOperationalStore();
    const maxIterations = Math.min(options.maxIterations ?? MAX_STEPS, MAX_STEPS);
    const result = await buildGraph().invoke({
      input,
      maxIterations,
      noReplanner: options.noReplanner ?? false,
      store,
      memoryStore: options.memoryStore,
    } as typeof PEState.Update, {
      recursionLimit: maxIterations * 3 + 4,
    });
    const answer = result.answer || result.done.at(-1)?.[1] || "Nenhum resultado.";
    const trace = [...result.trace, { type: "answer", content: answer } satisfies TraceEvent];
    return {
      answer,
      trace,
      metrics: {
        llCalls: result.llCalls,
        latencyMs: Date.now() - started,
        promptTokens: result.promptTokens,
        modelUsed: result.modelUsed,
      },
    };
  },
};
