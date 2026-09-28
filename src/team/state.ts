import { Annotation } from "@langchain/langgraph";
import type { BaseMessage } from "@langchain/core/messages";
import { sumPromptTokens } from "../context/tokens.js";
import type { TraceEvent } from "../agents/types.js";
import type { OperationalRepository } from "../models/store.js";
import type { SupervisorDecision } from "./types.js";

/**
 * T007: TeamState — blackboard compartilhado de todos os nós do grafo de equipe.
 * Cada campo usa um reducer LangGraph: aditivo para contadores e listas,
 * substituição para campos de resultado.
 */
export const TeamState = Annotation.Root({
  input: Annotation<string>(),
  conversationId: Annotation<string>(),
  history: Annotation<BaseMessage[]>({ reducer: (_left, right) => right, default: () => [] }),
  supervisorDecision: Annotation<SupervisorDecision | null>({ reducer: (_left, right) => right, default: () => null }),
  analysis: Annotation<string>({ reducer: (_left, right) => right, default: () => "" }),
  plan: Annotation<string>({ reducer: (_left, right) => right, default: () => "" }),
  executionResult: Annotation<string>({ reducer: (_left, right) => right, default: () => "" }),
  // trace: aditivo — cada nó acrescenta seus eventos sem sobrescrever
  trace: Annotation<TraceEvent[]>({ reducer: (left, right) => left.concat(right), default: () => [] }),
  // cycleCount: aditivo — incrementado +1 a cada ciclo do supervisor
  cycleCount: Annotation<number>({ reducer: (left, right) => left + right, default: () => 0 }),
  maxSteps: Annotation<number>({ reducer: (_left, right) => right, default: () => 8 }),
  llCalls: Annotation<number>({ reducer: (left, right) => left + right, default: () => 0 }),
  promptTokens: Annotation<number | null>({
    reducer: (left, right) => sumPromptTokens([left, right]),
    default: () => null,
  }),
  modelUsed: Annotation<string | undefined>({ reducer: (_left, right) => right, default: () => undefined }),
  store: Annotation<OperationalRepository>(),
});
