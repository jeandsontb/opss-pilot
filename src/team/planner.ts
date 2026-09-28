import { invokeWithResilience } from "../agents/model.js";
import { extractPromptTokens } from "../context/tokens.js";
import type { TraceEvent } from "../agents/types.js";
import { TeamState } from "./state.js";

// ---------------------------------------------------------------------------
// Prompt do planejador
// ---------------------------------------------------------------------------

const PLANNER_PROMPT = `Você é o PLANEJADOR do plantão. Com base na análise do analista, elabore um plano de resposta ao incidente.

Regras:
- Produza exclusivamente um plano textual numerado com passos claros e executáveis.
- NÃO invoque ferramentas. NÃO execute ações. NÃO verifique sistemas.
- Cada passo deve ser uma instrução para o EXECUTOR, não para você.
- Seja específico: inclua nomes de serviços, severidades e sequência lógica.

Formato: lista numerada de passos (ex.: "1. Abrir incidente de alta severidade para o serviço X").`;

// ---------------------------------------------------------------------------
// T010 + T019: nó planejador (sem tool bindings)
// ---------------------------------------------------------------------------

export async function plannerNode(state: typeof TeamState.State) {
  const brief = state.supervisorDecision?.brief ?? "";
  const events: TraceEvent[] = [];

  // T019: O planejador é instanciado SEM bindTools — constraint estrutural
  const result = await invokeWithResilience(
    (model) => model.invoke([
      ["system", PLANNER_PROMPT],
      ["user", [
        `Instrução do supervisor: ${brief}`,
        `\nAnálise do analista:\n${state.analysis || "(sem análise disponível)"}`,
      ].join("\n")],
    ]),
    { node: "planner" },
  );

  const rawMessage = result.value as { content?: unknown; tool_calls?: unknown[] };

  // T019: Assertion de segurança — planejador nunca deve ter tool_calls
  if (Array.isArray(rawMessage.tool_calls) && rawMessage.tool_calls.length > 0) {
    events.push({
      type: "thought",
      content: "[planner] tentativa de invocar tools bloqueada",
      node: "planner",
    });
    // Ignora tool_calls — não executa
  }

  const planText = typeof rawMessage.content === "string"
    ? rawMessage.content
    : JSON.stringify(rawMessage.content ?? "");

  events.push({ type: "plan", steps: planText.split("\n").filter((l) => l.trim()), node: "planner" });
  events.push(...result.trace);

  const promptTokens = extractPromptTokens(result.value) ?? null;

  return {
    plan: planText,
    trace: events,
    llCalls: result.metrics.llCalls,
    promptTokens,
    modelUsed: result.metrics.modelUsed,
  };
}
