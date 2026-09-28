import { z } from "zod";
import type { TraceEvent, Metrics } from "../agents/types.js";

// ---------------------------------------------------------------------------
// Enumeração de papéis
// ---------------------------------------------------------------------------

export const teamRoles = ["analyst", "planner", "executor"] as const;
export type TeamRole = (typeof teamRoles)[number];

// ---------------------------------------------------------------------------
// Decisão estruturada do supervisor
// ---------------------------------------------------------------------------

export type SupervisorDecision = {
  next: TeamRole | "END";
  brief: string;
};

// Schema Zod usado pelo withStructuredOutput do supervisor
export const supervisorSchema = z.object({
  next: z.enum(["analyst", "planner", "executor", "END"]),
  brief: z.string().min(1).describe("instrução de trabalho para o próximo papel ou resumo final se END"),
});

// ---------------------------------------------------------------------------
// Schemas HTTP (validação de fronteira)
// ---------------------------------------------------------------------------

export const teamRequestSchema = z.object({
  message: z.string().min(1),
  conversationId: z.string().uuid().optional(),
  maxSteps: z.number().int().min(1).max(8).default(8),
  requestId: z.string().uuid().optional(),
});

export const teamResponseSchema = z.object({
  answer: z.string(),
  conversationId: z.string(),
  requestId: z.string(),
  trace: z.array(z.unknown()),
  metrics: z.object({
    llCalls: z.number(),
    latencyMs: z.number(),
    promptTokens: z.number().nullable().optional(),
    modelUsed: z.string().optional(),
  }),
});

// ---------------------------------------------------------------------------
// Tipos de entrada/saída da função runTeam
// ---------------------------------------------------------------------------

export type TeamRequest = z.infer<typeof teamRequestSchema>;

export type TeamResult = {
  answer: string;
  conversationId: string;
  requestId: string;
  trace: TraceEvent[];
  metrics: Metrics;
};
