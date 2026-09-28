import type { ApiConfiguration } from "../types/chat.js";

const STORAGE_KEYS = {
  API_URL: "opsspilot_api_url",
  TIMEOUT_MS: "opsspilot_timeout_ms",
  THEME: "opsspilot_theme",
  CONVERSATION_ID: "opsspilot_conversation_id",
};

export const DEFAULT_CONFIG: ApiConfiguration = {
  baseUrl: "http://localhost:3000",
  timeoutMs: 180000,
  theme: "dark",
};

export function loadApiConfig(): ApiConfiguration {
  try {
    const baseUrl = localStorage.getItem(STORAGE_KEYS.API_URL) || DEFAULT_CONFIG.baseUrl;
    const timeoutRaw = localStorage.getItem(STORAGE_KEYS.TIMEOUT_MS);
    const timeoutMs = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : DEFAULT_CONFIG.timeoutMs;
    const themeRaw = localStorage.getItem(STORAGE_KEYS.THEME) as ApiConfiguration["theme"] | null;
    const theme = themeRaw && ["dark", "light", "system"].includes(themeRaw) ? themeRaw : DEFAULT_CONFIG.theme;

    return {
      baseUrl: baseUrl.replace(/\/+$/, ""),
      timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_CONFIG.timeoutMs,
      theme,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveApiConfig(config: Partial<ApiConfiguration>): void {
  try {
    if (config.baseUrl !== undefined) {
      localStorage.setItem(STORAGE_KEYS.API_URL, config.baseUrl.trim().replace(/\/+$/, ""));
    }
    if (config.timeoutMs !== undefined) {
      localStorage.setItem(STORAGE_KEYS.TIMEOUT_MS, String(config.timeoutMs));
    }
    if (config.theme !== undefined) {
      localStorage.setItem(STORAGE_KEYS.THEME, config.theme);
    }
  } catch (error) {
    console.warn("Falha ao salvar configuração no localStorage:", error);
  }
}

export function getSavedConversationId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.CONVERSATION_ID);
  } catch {
    return null;
  }
}

export function saveConversationId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEYS.CONVERSATION_ID, id);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CONVERSATION_ID);
    }
  } catch (error) {
    console.warn("Falha ao salvar conversationId no localStorage:", error);
  }
}
