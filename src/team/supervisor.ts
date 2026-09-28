import { invokeWithResilience } from "../agents/model.js";
import { extractPromptTokens } from "../context/tokens.js";
import type { TraceEvent } from "../agents/types.js";
import { supervisorSchema, type SupervisorDecision } from "./types.js";
import { TeamState } from "./state.js";

// ---------------------------------------------------------------------------
// Prompt do supervisor
// ---------------------------------------------------------------------------

const SUPERVISOR_PROMPT = `Você é o SUPERVISOR de uma equipe de plantão de produção.
Sua função é coordenar três especialistas para responder a incidentes operacionais:

- analyst: Coleta e relata dados factuais (alertas ativos, métricas, incidentes). Não propõe ações.
- planner: Elabora plano estruturado de resposta com base no diagnóstico do analista. Não executa ferramentas.
- executor: Executa ações concretas de gerenciamento de incidentes (abrir/resolver incidentes) com base no plano.

Critérios estritos de transição:
1. Se a Análise do Analista ainda não foi realizada ou está vazia: acione next: "analyst" com instrução clara para listar alertas e métricas.
2. Se a Análise já foi realizada e o Plano ainda não foi elaborado: acione next: "planner" com instrução para criar o plano de resposta aos itens analisados.
3. Se o Plano já foi elaborado e a Execução ainda não foi feita: acione next: "executor" com instrução para executar os passos do plano (ex: abrir incidentes necessários).
4. Se o executor já executou as ações ou não há mais ações pendentes: acione next: "END" com o resumo final das ações e da situação.

Responda SEMPRE com a estrutura JSON:
{ "next": "analyst" | "planner" | "executor" | "END", "brief": "sua instrução aqui" }

Estado atual da equipe (blackboard):
{blackboard}`;

function blackboardAsText(state: typeof TeamState.State): string {
  const lines: string[] = [];
  if (state.input) lines.push(`Solicitação: ${state.input}`);
  if (state.analysis) lines.push(`Análise do Analista:\n${state.analysis}`);
  if (state.plan) lines.push(`Plano do Planejador:\n${state.plan}`);
  if (state.executionResult) lines.push(`Resultado da Execução:\n${state.executionResult}`);
  lines.push(`Ciclos realizados: ${state.cycleCount} / ${state.maxSteps}`);
  return lines.join("\n\n") || "(sem dados ainda)";
}

// ---------------------------------------------------------------------------
// Normalização defensiva da decisão do supervisor
// ---------------------------------------------------------------------------

function normalizeSupervisorDecision(data: unknown, state?: typeof TeamState.State): SupervisorDecision {
  if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>;
    let next = String(obj.next ?? "").trim();
    const brief = String(obj.brief ?? obj.instruction ?? obj.resumo ?? "").trim() || "Instrução não informada";

    // Normalização de sinônimos/aliases comuns
    if (next.toLowerCase() === "analista") next = "analyst";
    if (next.toLowerCase() === "planejador") next = "planner";
    if (next.toLowerCase() === "done" || next.toLowerCase() === "fim" || next.toLowerCase() === "finalizar") next = "END";

    const parsed = supervisorSchema.safeParse({ next, brief });
    if (parsed.success) {
      return parsed.data;
    }
  }

  // Fallback inteligente baseado no progresso do blackboard
  if (!state?.analysis || state.analysis === "(sem dados disponíveis)") {
    return {
      next: "analyst",
      brief: "Listar alertas ativos e diagnosticar serviços afetados.",
    };
  }
  if (!state?.plan) {
    return {
      next: "planner",
      brief: "Elaborar plano de resposta operacional com base nos alertas identificados.",
    };
  }
  if (!state?.executionResult) {
    return {
      next: "executor",
      brief: "Executar o plano de resposta abrindo os incidentes necessários.",
    };
  }

  return {
    next: "END",
    brief: "Operação concluída com sucesso com base nas ações do executor.",
  };
}

// ---------------------------------------------------------------------------
// T008: nó supervisor
// ---------------------------------------------------------------------------

export async function supervisorNode(state: typeof TeamState.State) {
  const blackboard = blackboardAsText(state);
  const systemPrompt = SUPERVISOR_PROMPT.replace("{blackboard}", blackboard);

  const result = await invokeWithResilience(
    (model) => model
      .withStructuredOutput(supervisorSchema, { includeRaw: true })
      .invoke([
        ["system", systemPrompt],
        ["user", state.input],
      ]),
    { node: "supervisor" },
  );

  const raw = result.value as { parsed?: unknown; raw?: unknown } | unknown;
  let candidateData = (typeof raw === "object" && raw !== null && "parsed" in raw && (raw as any).parsed)
    ? (raw as any).parsed
    : raw;

  if (!candidateData || typeof candidateData !== "object" || !("next" in candidateData)) {
    // Tentar extrair do raw message content (string ou array de text parts)
    const rawMsg = (typeof raw === "object" && raw !== null && "raw" in raw) ? (raw as any).raw : raw;
    let messageContent = "";
    if (typeof rawMsg === "string") {
      messageContent = rawMsg;
    } else if (typeof rawMsg?.content === "string") {
      messageContent = rawMsg.content;
    } else if (Array.isArray(rawMsg?.content)) {
      messageContent = rawMsg.content.map((p: any) => p.text || p.content || "").join("");
    }

    if (messageContent) {
      const cleaned = messageContent.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
      const match = cleaned.match(/\{[\s\S]*?\}/);
      if (match) {
        try {
          candidateData = JSON.parse(match[0]);
        } catch {
          // ignore
        }
      }
    }
  }

  const decision = normalizeSupervisorDecision(candidateData, state);

  const handoffEvent: TraceEvent = {
    type: "handoff",
    from: "supervisor",
    to: decision.next,
    brief: decision.brief,
    node: "supervisor",
  };

  const rawObj = (typeof raw === "object" && raw !== null) ? (raw as { raw?: unknown; parsed?: unknown }) : undefined;
  const promptTokens = extractPromptTokens(rawObj?.raw) ?? extractPromptTokens(rawObj?.parsed) ?? null;

  return {
    supervisorDecision: decision,
    cycleCount: 1,
    trace: [...result.trace, handoffEvent],
    llCalls: result.metrics.llCalls,
    promptTokens,
    modelUsed: result.metrics.modelUsed,
  };
}
