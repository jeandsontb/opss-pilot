import React from "react";
import type { ChatMessage as ChatMessageType } from "../types/chat.js";

type ChatMessageProps = {
  message: ChatMessageType;
  onOpenTrace?: (message: ChatMessageType) => void;
  onRetry?: (message: ChatMessageType) => void;
  onApproveDecision?: (message: ChatMessageType) => void;
  onDenyDecision?: (message: ChatMessageType) => void;
};

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onOpenTrace,
  onRetry,
  onApproveDecision,
  onDenyDecision,
}) => {
  const isUser = message.role === "user";
  const hasTrace = Boolean(message.trace && message.trace.length > 0);
  const timeFormatted = new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start",
        marginBlock: "var(--space-3)",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "var(--space-2)",
          maxWidth: "85%",
          flexDirection: isUser ? "row-reverse" : "row",
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "var(--radius-full)",
            backgroundColor: isUser ? "var(--color-primary-subtle)" : "var(--bg-elevated)",
            color: isUser ? "var(--color-primary)" : "var(--color-info)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "var(--font-size-xs)",
            fontWeight: "var(--font-weight-bold)",
            border: "1px solid var(--border-subtle)",
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          {isUser ? "OP" : "AI"}
        </div>

        {/* Balão de Mensagem */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
          }}
        >
          <div
            style={{
              padding: "var(--space-3) var(--space-4)",
              borderRadius: isUser ? "var(--radius-lg) var(--radius-sm) var(--radius-lg) var(--radius-lg)" : "var(--radius-sm) var(--radius-lg) var(--radius-lg) var(--radius-lg)",
              backgroundColor: isUser ? "var(--color-primary)" : "var(--bg-surface)",
              color: isUser ? "#ffffff" : "var(--text-primary)",
              border: isUser ? "none" : "1px solid var(--border-subtle)",
              boxShadow: "var(--shadow-sm)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontSize: "var(--font-size-base)",
              lineHeight: 1.5,
            }}
          >
            {message.content}

            {/* Cartão de Ação Crítica / Decisão Human-in-the-Loop */}
            {message.pendingDecision && (
              <div
                style={{
                  marginTop: "var(--space-3)",
                  padding: "var(--space-3)",
                  backgroundColor: "var(--bg-overlay)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-warning)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-1)" }}>
                  <span style={{ color: "var(--color-warning)", fontWeight: "var(--font-weight-semibold)", fontSize: "var(--font-size-sm)" }}>
                    ⚠️ Ação Crítica Pendente
                  </span>
                  <span
                    style={{
                      fontSize: "var(--font-size-xs)",
                      padding: "2px 6px",
                      borderRadius: "var(--radius-full)",
                      backgroundColor:
                        message.pendingDecision.status === "approved"
                          ? "var(--color-success-subtle)"
                          : message.pendingDecision.status === "denied"
                          ? "var(--color-danger-subtle)"
                          : "var(--color-warning-subtle)",
                      color:
                        message.pendingDecision.status === "approved"
                          ? "var(--color-success)"
                          : message.pendingDecision.status === "denied"
                          ? "var(--color-danger)"
                          : "var(--color-warning)",
                      fontWeight: "var(--font-weight-medium)",
                    }}
                  >
                    {message.pendingDecision.status === "approved" ? "Aprovado" : message.pendingDecision.status === "denied" ? "Negado" : "Aguardando"}
                  </span>
                </div>
                <div style={{ fontWeight: "var(--font-weight-semibold)", color: "var(--text-primary)", fontSize: "var(--font-size-sm)" }}>
                  {message.pendingDecision.action.title}
                </div>
                {message.pendingDecision.action.description && (
                  <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-secondary)", marginTop: "var(--space-1)" }}>
                    {message.pendingDecision.action.description}
                  </div>
                )}
                {message.pendingDecision.status === "pending" && (
                  <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
                    <button
                      type="button"
                      onClick={() => onApproveDecision?.(message)}
                      style={{
                        padding: "var(--space-1) var(--space-3)",
                        backgroundColor: "var(--color-success)",
                        color: "#fff",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "var(--font-size-xs)",
                        fontWeight: "var(--font-weight-semibold)",
                      }}
                    >
                      ✓ Aprovar
                    </button>
                    <button
                      type="button"
                      onClick={() => onDenyDecision?.(message)}
                      style={{
                        padding: "var(--space-1) var(--space-3)",
                        backgroundColor: "var(--color-danger)",
                        color: "#fff",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "var(--font-size-xs)",
                        fontWeight: "var(--font-weight-semibold)",
                      }}
                    >
                      ✕ Negar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Rodapé da Mensagem (Horário + Botão Raciocínio) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              alignSelf: isUser ? "flex-end" : "flex-start",
              paddingInline: "var(--space-1)",
            }}
          >
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
              {timeFormatted}
            </span>

            {!isUser && hasTrace && (
              <button
                type="button"
                onClick={() => onOpenTrace?.(message)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "var(--space-1)",
                  padding: "2px 8px",
                  borderRadius: "var(--radius-full)",
                  backgroundColor: "var(--color-primary-subtle)",
                  color: "var(--color-primary)",
                  fontSize: "var(--font-size-xs)",
                  fontWeight: "var(--font-weight-medium)",
                  border: "1px solid var(--border-subtle)",
                }}
                title="Abrir linha do tempo detalhada dos passos do modelo"
              >
                <span>🧠 Ver raciocínio</span>
                <span
                  style={{
                    backgroundColor: "var(--color-primary)",
                    color: "#fff",
                    borderRadius: "var(--radius-full)",
                    padding: "0 5px",
                    fontSize: "10px",
                    lineHeight: "14px",
                  }}
                >
                  {message.trace?.length}
                </span>
              </button>
            )}

            {message.status === "error" && (
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-danger)" }}>
                  {message.errorMessage || "Erro no envio"}
                </span>
                <button
                  type="button"
                  onClick={() => onRetry?.(message)}
                  style={{
                    color: "var(--color-primary)",
                    fontSize: "var(--font-size-xs)",
                    textDecoration: "underline",
                    cursor: "pointer",
                  }}
                >
                  Tentar novamente
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
