export type ContextBreakdown = {
  currentMessage: number;
  history: number;
  memories: number;
};

export type TokenUsage = {
  promptTokens: number | null;
};

function validTokenCount(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function extractPromptTokens(value: unknown): number | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as {
    usage_metadata?: Record<string, unknown>;
    response_metadata?: Record<string, unknown>;
  };
  const usage = candidate.usage_metadata;
  const response = candidate.response_metadata;
  return validTokenCount(usage?.input_tokens)
    ?? validTokenCount(usage?.prompt_tokens)
    ?? validTokenCount(response?.tokenUsage && typeof response.tokenUsage === "object"
      ? (response.tokenUsage as Record<string, unknown>).promptTokens
      : undefined)
    ?? validTokenCount(response?.promptTokens);
}

export function sumPromptTokens(values: Array<number | null | undefined>): number | null {
  const known = values.filter((value): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0);
  return known.length > 0 ? known.reduce((total, value) => total + value, 0) : null;
}

export function contextBreakdown(input: {
  currentMessage: string;
  history: string;
  memories: string;
}): ContextBreakdown {
  return {
    currentMessage: estimateTokens(input.currentMessage),
    history: estimateTokens(input.history),
    memories: estimateTokens(input.memories),
  };
}
