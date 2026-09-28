import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import type { BaseMessage } from "@langchain/core/messages";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { randomUUID } from "node:crypto";
import { sumPromptTokens } from "../context/tokens.js";
import type { TraceEvent } from "../agents/types.js";
import type { OperationalRepository } from "../models/store.js";
import { SqliteOperationalStore } from "../models/store.js";
import type { ConversationStore } from "../models/conversation-store.js";
import { SqliteConversationStore, ConversationNotFoundError } from "../models/conversation-store.js";
import { teamRequestSchema, teamResponseSchema, type TeamRequest, type TeamResult } from "./types.js";
import { TeamState } from "./state.js";
import { supervisorNode } from "./supervisor.js";
import { analystNode } from "./analyst.js";
import { plannerNode } from "./planner.js";
import { executorNode } from "./executor.js";

// ---------------------------------------------------------------------------
// T013: Função de roteamento condicional do supervisor
// ---------------------------------------------------------------------------

function routingFn(state: typeof TeamState.State): string {
  // Guard de teto: encerra graciosamente se número de ciclos atingiu o máximo
  if (state.cycleCount >= state.maxSteps) return END;

  const next = state.supervisorDecision?.next;
  if (next === "analyst" || next === "planner" || next === "executor") return next;

  // next inválido, undefined ou "END" → encerra o grafo
  return END;
}

// ---------------------------------------------------------------------------
// T012: Montagem do StateGraph com addConditionalEdges
// ---------------------------------------------------------------------------

const graph = new StateGraph(TeamState)
  .addNode("supervisor", supervisorNode)
  .addNode("analyst", analystNode)
  .addNode("planner", plannerNode)
  .addNode("executor", executorNode)
  .addEdge(START, "supervisor")
  .addConditionalEdges("supervisor", routingFn, {
    analyst: "analyst",
    planner: "planner",
    executor: "executor",
    [END]: END,
  })
  .addEdge("analyst", "supervisor")
  .addEdge("planner", "supervisor")
  .addEdge("executor", "supervisor");

const compiledGraph = graph.compile();

import type { ObservabilityRepository } from "../obs/trace-persistence.js";
import { persistableTraceEvent } from "../obs/trace-persistence.js";

// ---------------------------------------------------------------------------
// T014 / T030: runTeam — ponto de entrada público do módulo src/team/
// ---------------------------------------------------------------------------

export async function runTeam(
  input: TeamRequest,
  conversations: ConversationStore = new SqliteConversationStore(),
  store: OperationalRepository = new SqliteOperationalStore(),
  observability?: ObservabilityRepository,
): Promise<TeamResult> {
  const started = Date.now();
  const requestId = input.requestId ?? randomUUID();

  if (observability) {
    try {
      await observability.startRequest({
        requestId,
        status: "running",
        createdAt: new Date().toISOString(),
        route: "team",
        conversationId: input.conversationId,
      });
    } catch {
      // Ignorar erro de início de observabilidade para não bloquear execução
    }
  }

  try {
    // Criar ou retomar conversa (lança ConversationNotFoundError se o ID não existe)
    const conversationId = input.conversationId ?? await conversations.create();
    const history = await conversations.lastMessages(conversationId, 8);

    const historyMessages: BaseMessage[] = history.map((msg) =>
      msg.role === "user" ? new HumanMessage(msg.content) : new AIMessage(msg.content),
    );

    const initialState = {
      input: input.message,
      conversationId,
      history: historyMessages,
      maxSteps: input.maxSteps ?? 8,
      store,
    };

    const finalState = await compiledGraph.invoke(initialState);

    const sections: string[] = [];
    if (finalState.analysis && finalState.analysis !== "(sem dados disponíveis)") {
      sections.push(`### 🔍 Diagnóstico do Analista\n${finalState.analysis}`);
    }
    if (finalState.plan) {
      sections.push(`### 📋 Plano de Resposta\n${finalState.plan}`);
    }
    if (finalState.executionResult) {
      sections.push(`### ⚡ Ações Executadas\n${finalState.executionResult}`);
    }

    const answer = sections.length > 0
      ? sections.join("\n\n")
      : (finalState.executionResult || finalState.plan || finalState.analysis || "Sem resposta gerada.");

    // Persistir turno na conversa
    await conversations.append(conversationId, "user", input.message);
    await conversations.append(conversationId, "assistant", answer);

    const result: TeamResult = {
      answer,
      conversationId,
      requestId,
      trace: finalState.trace as TraceEvent[],
      metrics: {
        llCalls: finalState.llCalls,
        latencyMs: Date.now() - started,
        promptTokens: finalState.promptTokens,
        modelUsed: finalState.modelUsed,
      },
    };

    if (observability) {
      try {
        let seq = 0;
        for (const evt of (finalState.trace as TraceEvent[])) {
          await observability.appendTraceEvent(
            persistableTraceEvent(requestId, seq++, { ...evt, node: evt.node ?? "team" }),
          );
        }
        await observability.completeRequest(requestId, {
          conversationId,
          answer,
          metrics: {
            llCalls: finalState.llCalls,
            latencyMs: Date.now() - started,
            promptTokens: finalState.promptTokens ?? null,
            modelUsed: finalState.modelUsed,
          },
          route: "team",
        });
      } catch {
        // Ignorar falha de observabilidade
      }
    }

    return result;
  } catch (error) {
    if (observability) {
      try {
        await observability.failRequest(requestId, error instanceof Error ? error.name : "unknown");
      } catch {
        // Ignorar falha de observabilidade
      }
    }
    throw error;
  }
}

export { TeamState };
export { teamRequestSchema, teamResponseSchema };
export type { TeamRequest, TeamResult };
export { ConversationNotFoundError };
