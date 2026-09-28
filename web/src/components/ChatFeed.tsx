import React, { useEffect, useRef } from "react";
import type { ChatMessage as ChatMessageType } from "../types/chat.js";
import { ChatMessage } from "./ChatMessage.js";

type ChatFeedProps = {
  messages: ChatMessageType[];
  isLoading: boolean;
  onOpenTrace: (message: ChatMessageType) => void;
  onSelectSuggestion: (text: string) => void;
  onRetry: (message: ChatMessageType) => void;
  onApproveDecision: (message: ChatMessageType) => void;
  onDenyDecision: (message: ChatMessageType) => void;
};

const SUGGESTIONS = [
  "me chame de Thiago e abra um low no auth",
  "listar alertas firing no cluster",
  "verificar status e latência do pagamento",
  "qual o resumo dos últimos incidentes?",
];

export const ChatFeed: React.FC<ChatFeedProps> = ({
  messages,
  isLoading,
  onOpenTrace,
  onSelectSuggestion,
  onRetry,
  onApproveDecision,
  onDenyDecision,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (messages.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--space-6)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "var(--radius-xl)",
            backgroundColor: "var(--color-primary-subtle)",
            color: "var(--color-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "28px",
            marginBottom: "var(--space-4)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          🛡️
        </div>

        <h2 style={{ fontSize: "var(--font-size-xl)", marginBottom: "var(--space-2)" }}>
          War Room Operacional OpssPilot
        </h2>

        <p style={{ maxWidth: "480px", color: "var(--text-secondary)", marginBottom: "var(--space-6)" }}>
          Copiloto autônomo conectado à observabilidade e plantão de produção. Relate incidentes, inspecione alertas ou solicite diagnósticos.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", width: "100%", maxWidth: "420px" }}>
          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Sugestões rápidas de comando:
          </span>
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onSelectSuggestion(suggestion)}
              style={{
                padding: "var(--space-2) var(--space-3)",
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
                fontSize: "var(--font-size-sm)",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "var(--space-2)",
              }}
            >
              <span>{suggestion}</span>
              <span style={{ color: "var(--text-muted)" }}>↳</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "var(--space-4)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {messages.map((message) => (
        <ChatMessage
          key={message.id}
          message={message}
          onOpenTrace={onOpenTrace}
          onRetry={onRetry}
          onApproveDecision={onApproveDecision}
          onDenyDecision={onDenyDecision}
        />
      ))}

      {isLoading && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: "var(--space-3) var(--space-4)",
            backgroundColor: "var(--bg-surface)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)",
            width: "fit-content",
            marginBlock: "var(--space-2)",
          }}
        >
          <div style={{ display: "flex", gap: "4px" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "var(--color-primary)", animation: "bounce 1.4s infinite ease-in-out both" }} />
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "var(--color-primary)", animation: "bounce 1.4s infinite ease-in-out both 0.2s" }} />
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "var(--color-primary)", animation: "bounce 1.4s infinite ease-in-out both 0.4s" }} />
            <style>{`
              @keyframes bounce {
                0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
                40% { transform: scale(1); opacity: 1; }
              }
            `}</style>
          </div>
          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
            OpssPilot analisando contexto e raciocinando...
          </span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};
