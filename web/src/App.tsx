import React, { useState, useEffect, useCallback } from "react";
import type { ChatMessage as ChatMessageType, ApiConfiguration } from "./types/chat.js";
import { Header } from "./components/Header.js";
import { ChatFeed } from "./components/ChatFeed.js";
import { ChatInput } from "./components/ChatInput.js";
import { TraceDrawer } from "./components/TraceDrawer.js";
import { SettingsModal } from "./components/SettingsModal.js";
import { sendMessage, checkHealth } from "./services/api.js";
import { loadApiConfig, saveApiConfig, getSavedConversationId, saveConversationId } from "./services/storage.js";

export const App: React.FC = () => {
  const [config, setConfig] = useState<ApiConfiguration>(loadApiConfig);
  const [conversationId, setConversationId] = useState<string | null>(getSavedConversationId);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isApiOnline, setIsApiOnline] = useState<boolean | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedTraceMessage, setSelectedTraceMessage] = useState<ChatMessageType | null>(null);

  // Modo de Rota (Chat vs Equipe Multi-Agente) e Teto de Passos
  const [routeMode, setRouteMode] = useState<"chat" | "team">("team");
  const [maxSteps, setMaxSteps] = useState<number>(8);

  // Aplicação do Tema no DOM
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", config.theme);
  }, [config.theme]);

  // Verificação de Conectividade da API
  const verifyConnection = useCallback(async (baseUrl?: string) => {
    const res = await checkHealth(baseUrl || config.baseUrl);
    setIsApiOnline(res.ok);
  }, [config.baseUrl]);

  useEffect(() => {
    verifyConnection();
    const interval = setInterval(() => verifyConnection(), 30000);
    return () => clearInterval(interval);
  }, [verifyConnection]);

  // Envio de Mensagem
  const handleSendMessage = async (text: string, mode?: "chat" | "team", steps?: number) => {
    const activeMode = mode ?? routeMode;
    const activeMaxSteps = steps ?? maxSteps;

    const userMsgId = `usr-${Date.now()}`;
    const userMessage: ChatMessageType = {
      id: userMsgId,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
      status: "success",
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await sendMessage({
        message: text,
        conversationId: conversationId || undefined,
        mode: activeMode,
        maxSteps: activeMode === "team" ? activeMaxSteps : undefined,
      });

      // Salva conversationId se fornecido
      if (response.conversationId) {
        setConversationId(response.conversationId);
        saveConversationId(response.conversationId);
      }

      const assistantMessage: ChatMessageType = {
        id: response.requestId || `ast-${Date.now()}`,
        role: "assistant",
        content: response.answer,
        timestamp: new Date().toISOString(),
        conversationId: response.conversationId,
        requestId: response.requestId,
        trace: response.trace,
        metrics: response.metrics,
        pendingDecision: response.pendingAction
          ? { action: response.pendingAction, status: "pending" }
          : undefined,
        status: "success",
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsApiOnline(true);
    } catch (error) {
      console.error("Erro no envio:", error);
      const errorMessage: ChatMessageType = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: "Não foi possível obter resposta do OpssPilot no momento.",
        timestamp: new Date().toISOString(),
        status: "error",
        errorMessage: error instanceof Error ? error.message : "Erro desconhecido",
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsApiOnline(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Reenvio de Mensagem com Erro
  const handleRetry = (_msg: ChatMessageType) => {
    const userMsgs = messages.filter((m) => m.role === "user");
    const lastUserMsg = userMsgs[userMsgs.length - 1];
    if (lastUserMsg) {
      handleSendMessage(lastUserMsg.content);
    }
  };

  // Human-in-the-Loop: Decisão no Cartão 202
  const handleApproveDecision = (message: ChatMessageType) => {
    if (!message.pendingDecision) return;
    const action = message.pendingDecision.action;
    setMessages((prev) =>
      prev.map((m) =>
        m.id === message.id
          ? {
              ...m,
              pendingDecision: {
                ...m.pendingDecision!,
                status: "approved",
                decidedAt: new Date().toISOString(),
              },
            }
          : m
      )
    );
    handleSendMessage(`Autorizo formalmente a execução da ação: ${action.title} (${action.id})`);
  };

  const handleDenyDecision = (message: ChatMessageType) => {
    if (!message.pendingDecision) return;
    const action = message.pendingDecision.action;
    setMessages((prev) =>
      prev.map((m) =>
        m.id === message.id
          ? {
              ...m,
              pendingDecision: {
                ...m.pendingDecision!,
                status: "denied",
                decidedAt: new Date().toISOString(),
              },
            }
          : m
      )
    );
    handleSendMessage(`Rejeito a execução da ação: ${action.title} (${action.id})`);
  };

  // Nova Conversa / Limpar
  const handleNewConversation = () => {
    setMessages([]);
    setConversationId(null);
    saveConversationId(null);
  };

  // Alternância de Tema
  const handleToggleTheme = () => {
    const nextTheme: ApiConfiguration["theme"] = config.theme === "dark" ? "light" : "dark";
    const updated: ApiConfiguration = { ...config, theme: nextTheme };
    setConfig(updated);
    saveApiConfig({ theme: nextTheme });
  };

  // Salvar Configurações
  const handleSaveConfig = (updated: Partial<ApiConfiguration>) => {
    const merged = { ...config, ...updated };
    setConfig(merged);
    saveApiConfig(merged);
    verifyConnection(merged.baseUrl);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        backgroundColor: "var(--bg-primary)",
      }}
    >
      <Header
        config={config}
        isApiOnline={isApiOnline}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleTheme={handleToggleTheme}
        onNewConversation={handleNewConversation}
      />

      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <ChatFeed
          messages={messages}
          isLoading={isLoading}
          onOpenTrace={(msg) => setSelectedTraceMessage(msg)}
          onSelectSuggestion={(sug) => handleSendMessage(sug)}
          onRetry={handleRetry}
          onApproveDecision={handleApproveDecision}
          onDenyDecision={handleDenyDecision}
        />

        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          routeMode={routeMode}
          onRouteModeChange={setRouteMode}
          maxSteps={maxSteps}
          onMaxStepsChange={setMaxSteps}
        />
      </main>

      <TraceDrawer
        isOpen={Boolean(selectedTraceMessage)}
        message={selectedTraceMessage}
        onClose={() => setSelectedTraceMessage(null)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        config={config}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveConfig}
      />
    </div>
  );
};

export default App;
