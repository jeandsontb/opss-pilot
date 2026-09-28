import { z } from "zod";
import { invokeWithResilience } from "./model.js";
import type { MemoryStore } from "../memory/memory-store.js";

export const learningReflectionSchema = z.object({
  hasLearning: z.boolean(),
  fact: z.string().optional(),
});

export type LearningReflection = z.infer<typeof learningReflectionSchema>;

export type LearningContext = {
  userId?: string;
  lastUserMessage: string;
  answer: string;
  conversationId: string;
};

type StructuredInvoker = {
  invoke(input: unknown): Promise<unknown>;
};

export type LearningReflector = {
  reflect(context: LearningContext): Promise<void>;
};

export type LearningReflectorOptions = {
  memories: MemoryStore;
  invokeStructured?: (messages: Array<["system" | "user", string]>) => Promise<unknown>;
  logger?: (event: { outcome: "saved" | "skipped" | "failed"; reason: string }) => void;
};

const secretPattern = /\b(password|senha|token|secret|segredo|api[_ -]?key|chave privada|private key|bearer)\b/i;
const pointInTimePattern = /^(me ajude|liste|mostre|abra|feche|resolva|verifique|consulte|qual|como|quando|onde|por que)\b/i;

function isEligibleFact(fact: string): boolean {
  const normalized = fact.trim();
  return normalized.length > 0 &&
    !secretPattern.test(normalized) &&
    !pointInTimePattern.test(normalized) &&
    !/[?]$/.test(normalized);
}

function defaultInvokeStructured(messages: Array<["system" | "user", string]>): Promise<unknown> {
  return invokeWithResilience(
    (model) => (model.withStructuredOutput(learningReflectionSchema) as unknown as StructuredInvoker).invoke(messages),
    { node: "learning-reflector" },
  ).then((result) => result.value);
}

export function createLearningReflector(options: LearningReflectorOptions): LearningReflector {
  const invokeStructured = options.invokeStructured ?? defaultInvokeStructured;
  const logger = options.logger ?? ((event: { outcome: "saved" | "skipped" | "failed"; reason: string }) => {
    if (event.outcome === "failed") {
      console.error(JSON.stringify({ component: "learning-reflector", outcome: event.outcome, reason: event.reason }));
    }
  });

  return {
    async reflect(context) {
      if (!context.userId) {
        logger({ outcome: "skipped", reason: "missing-user-id" });
        return;
      }
      if (context.lastUserMessage.trim().length === 0) {
        logger({ outcome: "skipped", reason: "empty-user-message" });
        return;
      }

      try {
        const raw = await invokeStructured([
          [
            "system",
            "Extraia apenas fatos duráveis sobre o usuário a partir da última mensagem. " +
            "Nunca extraia pedidos pontuais, comandos, perguntas, credenciais, tokens, senhas, chaves ou segredos. " +
            "Retorne hasLearning=false quando não houver aprendizado seguro.",
          ],
          ["user", context.lastUserMessage],
        ]);
        const reflection = learningReflectionSchema.parse(raw);
        if (!reflection.hasLearning || !reflection.fact || !isEligibleFact(reflection.fact)) {
          logger({ outcome: "skipped", reason: "ineligible-fact" });
          return;
        }
        await options.memories.remember(context.userId, reflection.fact);
        logger({ outcome: "saved", reason: "durable-fact" });
      } catch (error) {
        logger({
          outcome: "failed",
          reason: error instanceof Error ? error.name : "unknown-error",
        });
      }
    },
  };
}
