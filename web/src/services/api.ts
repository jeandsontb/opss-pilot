import { loadApiConfig } from "./storage.js";
import { chatResponseSchema, type ChatResponse } from "../types/chat.js";

export type SendMessageOptions = {
  message: string;
  conversationId?: string;
  userId?: string;
  strategy?: string;
  reflect?: boolean;
};

export class ApiError extends Error {
  readonly status?: number;
  readonly code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export async function sendMessage(options: SendMessageOptions): Promise<ChatResponse> {
  const config = loadApiConfig();
  const endpoint = `${config.baseUrl}/chat`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        message: options.message,
        conversationId: options.conversationId,
        userId: options.userId,
        strategy: options.strategy,
        reflect: options.reflect,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json().catch(() => null);

    if (response.status === 202) {
      // Human-in-the-loop: Ação pendente de aprovação
      if (data && typeof data === "object") {
        return chatResponseSchema.parse({
          requestId: data.requestId ?? crypto.randomUUID(),
          conversationId: data.conversationId ?? options.conversationId ?? crypto.randomUUID(),
          answer: data.answer ?? "Ação sensível aguardando confirmação operacional.",
          trace: data.trace ?? [],
          metrics: data.metrics,
          pendingAction: data.pendingAction ?? {
            id: `act-${Date.now()}`,
            title: "Ação Operacional Crítica",
            description: data.answer,
            payload: data.payload ?? {},
          },
        });
      }
    }

    if (!response.ok) {
      const errorMessage = data?.error || (typeof data?.issues === "object" ? JSON.stringify(data.issues) : `Erro HTTP ${response.status}`);
      throw new ApiError(errorMessage, response.status);
    }

    return chatResponseSchema.parse(data);
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError(`Tempo limite excedido (${config.timeoutMs / 1000}s). O agente demorou a responder.`, 504, "TIMEOUT");
    }
    const message = error instanceof Error ? error.message : "Erro desconhecido de rede";
    throw new ApiError(`Não foi possível conectar à API em ${config.baseUrl}: ${message}`, 0, "NETWORK_ERROR");
  }
}

export async function checkHealth(customBaseUrl?: string): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const config = loadApiConfig();
  const baseUrl = (customBaseUrl || config.baseUrl).replace(/\/+$/, "");
  const start = performance.now();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${baseUrl}/health`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - start);

    if (response.ok) {
      return { ok: true, latencyMs };
    }
    return { ok: false, latencyMs, error: `Status ${response.status}` };
  } catch (error) {
    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - start);
    return { ok: false, latencyMs, error: error instanceof Error ? error.message : "Falha na conexão" };
  }
}
