import { z } from "zod";

// Schemas Zod dos Eventos de Trace
export const traceRouteSchema = z.object({
  type: z.literal("route"),
  route: z.string().min(1),
  reason: z.string().min(1),
  source: z.enum(["router", "override"]),
  node: z.string().min(1).default("router"),
});

export const traceThoughtSchema = z.object({
  type: z.literal("thought"),
  content: z.string(),
  node: z.string().min(1),
});

export const traceActionSchema = z.object({
  type: z.literal("action"),
  tool: z.string(),
  args: z.record(z.string(), z.unknown()),
  node: z.string().min(1),
});

export const traceObservationSchema = z.object({
  type: z.literal("observation"),
  content: z.string(),
  node: z.string().min(1),
});

export const tracePlanSchema = z.object({
  type: z.literal("plan"),
  steps: z.array(z.string()),
  node: z.string().min(1),
});

export const traceCritiqueSchema = z.object({
  type: z.literal("critique"),
  content: z.string(),
  node: z.string().min(1),
});

export const traceAnswerSchema = z.object({
  type: z.literal("answer"),
  content: z.string(),
  node: z.string().min(1),
});

export const traceFallbackSchema = z.object({
  type: z.literal("fallback"),
  fromModel: z.string().min(1),
  toModel: z.string().min(1),
  reason: z.string().min(1),
  node: z.string().min(1),
});

export const traceHandoffSchema = z.object({
  type: z.literal("handoff"),
  from: z.string().min(1),
  to: z.string().min(1),
  brief: z.string(),
  node: z.string().min(1).optional(),
});

export const traceEventSchema = z.discriminatedUnion("type", [
  traceRouteSchema,
  traceThoughtSchema,
  traceActionSchema,
  traceObservationSchema,
  tracePlanSchema,
  traceCritiqueSchema,
  traceAnswerSchema,
  traceFallbackSchema,
  traceHandoffSchema,
]);

export type TraceEvent = z.infer<typeof traceEventSchema>;

// Métricas de Raciocínio
export const chatMetricsSchema = z.object({
  llCalls: z.number().int().nonnegative(),
  latencyMs: z.number().nonnegative(),
  historyMessages: z.number().int().nonnegative().optional(),
  promptTokens: z.number().int().nonnegative().nullable().optional(),
  modelUsed: z.string().optional(),
  contextBreakdown: z.object({
    currentMessage: z.number().int().nonnegative(),
    history: z.number().int().nonnegative(),
    memories: z.number().int().nonnegative(),
  }).optional(),
});

export type ChatMetrics = z.infer<typeof chatMetricsSchema>;

// Ação Pendente para Human-in-the-Loop (HTTP 202)
export const pendingActionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export type PendingAction = z.infer<typeof pendingActionSchema>;

// Resposta do Endpoint /chat ou /team
export const chatResponseSchema = z.object({
  requestId: z.string().min(1),
  conversationId: z.string().min(1),
  answer: z.string(),
  trace: z.array(traceEventSchema).default([]),
  metrics: chatMetricsSchema.optional(),
  pendingAction: pendingActionSchema.optional(),
});

export type ChatResponse = z.infer<typeof chatResponseSchema>;

// Estado da Mensagem no Chat Web
export type MessageRole = "user" | "assistant";

export type MessageStatus = "sending" | "success" | "error";

export type DecisionStatus = "pending" | "approved" | "denied";

export type DecisionCardState = {
  action: PendingAction;
  status: DecisionStatus;
  decidedAt?: string;
};

export type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  conversationId?: string;
  requestId?: string;
  trace?: TraceEvent[];
  metrics?: ChatMetrics;
  pendingDecision?: DecisionCardState;
  status: MessageStatus;
  errorMessage?: string;
};

// Configuração da API Web
export type ApiConfiguration = {
  baseUrl: string;
  timeoutMs: number;
  theme: "dark" | "light" | "system";
};
