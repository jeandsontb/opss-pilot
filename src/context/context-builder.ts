import { estimateTokens } from "./tokens.js";

export type ContextBudget = {
  summary: number;
  window: number;
  memories: number;
};

export type ContextMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ContextMemory = {
  fact: string;
  score: number;
};

export type ContextInput = {
  system: string;
  summary?: string;
  window: ContextMessage[];
  memories: ContextMemory[];
  message: string;
};

export type BuiltContext = {
  prompt: string;
  system: string;
  message: string;
  summary: string;
  selectedWindow: ContextMessage[];
  selectedMemories: ContextMemory[];
  budgets: ContextBudget;
};

export const DEFAULT_CONTEXT_BUDGET: ContextBudget = {
  summary: 200,
  window: 1200,
  memories: 300,
};

const budgetNames = ["summary", "window", "memories"] as const;
type BudgetName = (typeof budgetNames)[number];

function parseBudget(value: string | undefined, name: BudgetName, fallback: number): number {
  if (value === undefined) return fallback;
  if (!/^(0|[1-9]\d*)$/.test(value)) {
    throw new RangeError(`Invalid CONTEXT_BUDGET_${name.toUpperCase()}: expected a non-negative integer`);
  }
  return Number(value);
}

export function contextBudgetFromEnv(
  env: Record<string, string | undefined> = process.env,
): ContextBudget {
  return {
    summary: parseBudget(env.CONTEXT_BUDGET_SUMMARY, "summary", DEFAULT_CONTEXT_BUDGET.summary),
    window: parseBudget(env.CONTEXT_BUDGET_WINDOW, "window", DEFAULT_CONTEXT_BUDGET.window),
    memories: parseBudget(env.CONTEXT_BUDGET_MEMORIES, "memories", DEFAULT_CONTEXT_BUDGET.memories),
  };
}

export class ContextBuilder {
  constructor(public readonly budgets: ContextBudget = contextBudgetFromEnv()) {
    for (const name of budgetNames) {
      const value = budgets[name];
      if (!Number.isInteger(value) || value < 0) {
        throw new RangeError(`Context budget ${name} must be a non-negative integer`);
      }
    }
  }

  build(input: ContextInput): BuiltContext {
    const summary = fitSummary(input.summary ?? "", this.budgets.summary);
    const selectedWindow = fitWindow(input.window, this.budgets.window);
    const selectedMemories = fitMemories(input.memories, this.budgets.memories);
    const prompt = [
      `system:\n${input.system}`,
      `summary:\n${summary || "(nenhum resumo disponível)"}`,
      `window:\n${selectedWindow.length === 0
        ? "(nenhuma mensagem anterior)"
        : selectedWindow.map(({ role, content }) => `${role}: ${content}`).join("\n")}`,
      `memories:\n${selectedMemories.length === 0
        ? "(nenhuma memória relevante)"
        : selectedMemories.map(({ fact }) => `- ${fact}`).join("\n")}`,
      `message:\n${input.message}`,
      `Mensagem atual do usuário:\n${input.message}`,
    ].join("\n\n");

    return {
      prompt,
      system: input.system,
      message: input.message,
      summary,
      selectedWindow: selectedWindow.map((item) => ({ ...item })),
      selectedMemories: selectedMemories.map((item) => ({ ...item })),
      budgets: { ...this.budgets },
    };
  }
}

function fitSummary(summary: string, budget: number): string {
  return budget === 0 ? "" : summary.slice(0, budget * 4);
}

function fitWindow(messages: ContextMessage[], budget: number): ContextMessage[] {
  if (budget === 0) return [];
  const selected: ContextMessage[] = [];
  let used = 0;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    const cost = estimateTokens(`${message.role}: ${message.content}`);
    if (used + cost > budget) break;
    selected.unshift({ ...message });
    used += cost;
  }
  return selected;
}

function fitMemories(memories: ContextMemory[], budget: number): ContextMemory[] {
  if (budget === 0) return [];
  const ranked = memories
    .map((memory, index) => ({ memory, index }))
    .sort((left, right) => right.memory.score - left.memory.score || left.index - right.index);
  const selected: Array<{ memory: ContextMemory; index: number }> = [];
  let used = 0;
  for (const candidate of ranked) {
    const cost = estimateTokens(`- ${candidate.memory.fact}`);
    if (used + cost > budget) continue;
    selected.push(candidate);
    used += cost;
  }
  return selected
    .sort((left, right) => left.index - right.index)
    .map(({ memory }) => ({ ...memory }));
}

export function buildContext(input: ContextInput, budgets?: ContextBudget): BuiltContext {
  return new ContextBuilder(budgets ?? contextBudgetFromEnv()).build(input);
}
