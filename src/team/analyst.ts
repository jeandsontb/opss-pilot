import { invokeWithResilience } from "../agents/model.js";
import { extractPromptTokens } from "../context/tokens.js";
import type { TraceEvent } from "../agents/types.js";
import { createAnalystTools } from "./tools.js";
import { TeamState } from "./state.js";

// ---------------------------------------------------------------------------
// Prompt do analista (conforme exemplo do usuário)
// ---------------------------------------------------------------------------

const ANALYST_PROMPT = `Você é o ANALISTA do plantão. Sua única função: produzir diagnóstico FACTUAL do estado atual usando as ferramentas de leitura.

Liste:
- Alertas disparando (com data e severidade)
- Incidentes recentes (abertos e resolvidos)
- Status dos serviços relevantes
- Fatos conhecidos que sejam visíveis nas observações

NÃO proponha soluções. NÃO abra nem resolva nada. NÃO use ferramentas de escrita.
Formato: tópicos telegráficos. Seja cético: se um dado não está nas observações, não afirme.`;

// Padrões que indicam proposta de ação — devem ser filtrados da análise
const ACTION_PROPOSAL_PATTERNS = [
  /^(Execute|Abra|Resolva|Feche|Escale|Reinicie|Remova|Adicione|Crie|Atualize|Desative|Ative)\b/im,
  /\b(devemos|deveríamos|recomendo|sugiro|proponho)\b/im,
];

function stripActionProposals(text: string): { cleaned: string; hadProposals: boolean } {
  const lines = text.split("\n");
  const cleaned: string[] = [];
  let hadProposals = false;

  for (const line of lines) {
    if (ACTION_PROPOSAL_PATTERNS.some((pattern) => pattern.test(line))) {
      hadProposals = true;
      // Suprime a linha com proposta
      continue;
    }
    cleaned.push(line);
  }

  return { cleaned: cleaned.join("\n").trim(), hadProposals };
}

import { ToolMessage, type BaseMessage } from "@langchain/core/messages";

// ---------------------------------------------------------------------------
// T009 + T018: nó analista com guard pós-LLM
// ---------------------------------------------------------------------------

export async function analystNode(state: typeof TeamState.State) {
  const brief = state.supervisorDecision?.brief ?? "";
  const store = state.store;
  const tools = createAnalystTools(store);

  const events: TraceEvent[] = [];

  const result = await invokeWithResilience(
    (model) => model.bindTools(tools).invoke([
      ["system", ANALYST_PROMPT],
      ["user", `Instrução do supervisor: ${brief}\n\nSolicitação original: ${state.input}`],
    ]),
    { node: "analyst" },
  );

  const rawMessage = result.value as { content?: unknown; tool_calls?: Array<{ name: string; args: unknown; id?: string }> };

  let rawText = typeof rawMessage.content === "string" ? rawMessage.content : "";
  let totalCalls = result.metrics.llCalls;
  let totalTokens = result.metrics.promptTokens;

  // Executar chamadas de ferramentas e coletar observações reais
  if (Array.isArray(rawMessage.tool_calls) && rawMessage.tool_calls.length > 0) {
    const toolMessages: BaseMessage[] = [];
    const observationParts: string[] = [];

    for (const call of rawMessage.tool_calls) {
      events.push({
        type: "action",
        tool: call.name,
        args: (call.args ?? {}) as Record<string, unknown>,
        node: "analyst",
      });
      const targetTool = tools.find((t) => t.name === call.name);
      let observationStr = "(sem dados)";
      if (targetTool) {
        try {
          const toolOutput = await (targetTool as any).invoke(call.args ?? {});
          observationStr = typeof toolOutput === "string" ? toolOutput : JSON.stringify(toolOutput);
        } catch (err) {
          observationStr = `Erro ao executar ${call.name}: ${err instanceof Error ? err.message : String(err)}`;
        }
      }
      events.push({
        type: "observation",
        content: observationStr,
        node: "analyst",
      });
      observationParts.push(observationStr);
      toolMessages.push(new ToolMessage({
        tool_call_id: call.id ?? `call_${Date.now()}`,
        content: observationStr,
        name: call.name,
      }));
    }

    try {
      const followUp = await invokeWithResilience(
        (model) => model.invoke([
          ["system", ANALYST_PROMPT],
          ["user", `Instrução do supervisor: ${brief}\n\nSolicitação original: ${state.input}`],
          result.value as any,
          ...toolMessages,
        ]),
        { node: "analyst" },
      );
      totalCalls += followUp.metrics.llCalls;
      if (followUp.metrics.promptTokens) {
        totalTokens = (totalTokens ?? 0) + followUp.metrics.promptTokens;
      }
      const followUpText = typeof (followUp.value as any)?.content === "string"
        ? (followUp.value as any).content
        : "";
      rawText = followUpText || observationParts.join("\n\n");
    } catch {
      rawText = observationParts.join("\n\n");
    }
  }

  // T018: Guard — remover propostas de ação da resposta do analista
  const { cleaned: analysis, hadProposals } = stripActionProposals(rawText || "(sem dados disponíveis)");

  if (hadProposals) {
    events.push({ type: "thought", content: "[analyst] proposta de ação removida do diagnóstico", node: "analyst" });
  }

  // Se não houve chamadas de tool e nenhuma observação foi adicionada antes, adiciona a análise como observação
  if (!events.some((e) => e.type === "observation")) {
    events.push({ type: "observation", content: analysis || "(sem dados disponíveis)", node: "analyst" });
  }
  events.push(...result.trace);

  return {
    analysis: analysis || "(sem dados disponíveis)",
    trace: events,
    llCalls: totalCalls,
    promptTokens: totalTokens,
    modelUsed: result.metrics.modelUsed,
  };
}
