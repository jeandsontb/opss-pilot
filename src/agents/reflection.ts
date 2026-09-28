import { z } from "zod";
import { invokeWithResilience } from "./model.js";
import type { Metrics, ReasoningResult, ReasoningStrategy, TraceEvent } from "./types.js";

const MAX_REFLECTIONS = 8;

const verdictSchema = z.object({
  approved: z.boolean(),
  feedback: z.string().min(1),
});

export type ReflectionVerdict = z.infer<typeof verdictSchema>;

export type ReflectionOptions = {
  maxReflections?: number;
  critique?: (input: string, result: ReasoningResult) => Promise<ReflectionVerdict>;
};

function observationsOf(trace: TraceEvent[]): string {
  return trace
    .filter((event) => event.type === "observation")
    .map((event) => event.content)
    .join("\n");
}

function addMetrics(left: Metrics, right: Metrics): Metrics {
  return {
    llCalls: left.llCalls + right.llCalls,
    latencyMs: left.latencyMs + right.latencyMs,
    promptTokens: left.promptTokens != null && right.promptTokens != null
      ? left.promptTokens + right.promptTokens
      : left.promptTokens ?? right.promptTokens ?? null,
    modelUsed: right.modelUsed ?? left.modelUsed,
  };
}

async function critique(input: string, result: ReasoningResult): Promise<{ verdict: ReflectionVerdict; metrics: Metrics; trace: TraceEvent[] }> {
  const messages: Array<["system" | "user", string]> = [
    [
      "system",
      "Avalie a resposta APENAS contra o pedido e as observações do trace. " +
      "Se reprovar, forneça feedback específico e acionável. Não invoque ferramentas.",
    ],
    [
      "user",
      `Pedido: ${input}\nObservações: ${observationsOf(result.trace)}\nResposta: ${result.answer}`,
    ],
  ];
  const invocation = await invokeWithResilience(
    (model) => model.withStructuredOutput(verdictSchema).invoke(messages),
    { node: "reflection" },
  );
  return {
    verdict: verdictSchema.parse(invocation.value),
    metrics: {
      ...invocation.metrics,
      promptTokens: invocation.metrics.promptTokens ?? null,
    },
    trace: invocation.trace,
  };
}

function critiqueEvent(verdict: ReflectionVerdict): TraceEvent {
  return {
    type: "critique",
    content: `${verdict.approved ? "approved" : "rejected"}: ${verdict.feedback}`,
  };
}

export function withReflection(
  strategy: ReasoningStrategy,
  options: ReflectionOptions = {},
): ReasoningStrategy {
  const maxReflections = options.maxReflections ?? 2;
  if (!Number.isInteger(maxReflections) || maxReflections < 0 || maxReflections > MAX_REFLECTIONS) {
    throw new RangeError(`maxReflections must be an integer between 0 and ${MAX_REFLECTIONS}`);
  }

  return {
    name: `reflect:${strategy.name}`,
    async run(input, runOptions) {
      let currentInput = input;
      let result = await strategy.run(currentInput, runOptions);
      let metrics = result.metrics;
      let accumulatedTrace = [...result.trace];

      for (let reflection = 0; reflection < maxReflections; reflection += 1) {
        const critiqueStarted = Date.now();
        const critiqueResult = options.critique
          ? { verdict: await options.critique(input, result), metrics: { llCalls: 1, latencyMs: Date.now() - critiqueStarted }, trace: [] }
          : await critique(input, result);
        const verdict = critiqueResult.verdict;
        metrics = addMetrics(metrics, critiqueResult.metrics);
        if (critiqueResult.metrics.modelUsed) metrics.modelUsed = critiqueResult.metrics.modelUsed;
        accumulatedTrace = [...accumulatedTrace, ...critiqueResult.trace, critiqueEvent(verdict)];
        result = {
          ...result,
          trace: accumulatedTrace,
          metrics,
        };

        if (verdict.approved || reflection === maxReflections - 1) break;

        currentInput =
          `${input}\n\nFeedback da reflexão anterior (corrija a resposta): ${verdict.feedback}`;
        result = await strategy.run(currentInput, runOptions);
        metrics = addMetrics(metrics, result.metrics);
        accumulatedTrace = [...accumulatedTrace, ...result.trace];
        result = { ...result, trace: accumulatedTrace, metrics };
      }

      return result;
    },
  };
}
