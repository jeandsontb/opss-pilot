import React, { useState, useRef, useEffect } from "react";

type ChatInputProps = {
  onSendMessage: (message: string, mode?: "chat" | "team", maxSteps?: number) => void;
  isLoading: boolean;
  routeMode: "chat" | "team";
  onRouteModeChange: (mode: "chat" | "team") => void;
  maxSteps: number;
  onMaxStepsChange: (steps: number) => void;
};

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  routeMode,
  onRouteModeChange,
  maxSteps,
  onMaxStepsChange,
}) => {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    onSendMessage(trimmed, routeMode, routeMode === "team" ? maxSteps : undefined);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [text]);

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "var(--space-3) var(--space-4)",
        backgroundColor: "var(--bg-surface)",
        borderTop: "1px solid var(--border-subtle)",
        position: "relative",
      }}
    >
      {/* Barra de Seleção de Rota e Parâmetros (T024) */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-2)",
          marginBottom: "var(--space-2)",
          fontSize: "var(--font-size-xs)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <span style={{ color: "var(--text-muted)", fontWeight: "var(--font-weight-medium)" }}>
            Modo:
          </span>
          <div
            style={{
              display: "inline-flex",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              overflow: "hidden",
              backgroundColor: "var(--bg-elevated)",
            }}
            role="group"
            aria-label="Seletor de rota de execução"
          >
            <button
              type="button"
              onClick={() => onRouteModeChange("chat")}
              style={{
                padding: "var(--space-1) var(--space-3)",
                fontSize: "var(--font-size-xs)",
                border: "none",
                backgroundColor: routeMode === "chat" ? "var(--color-primary)" : "transparent",
                color: routeMode === "chat" ? "#ffffff" : "var(--text-secondary)",
                fontWeight: routeMode === "chat" ? "var(--font-weight-semibold)" : "normal",
                cursor: "pointer",
                transition: "background-color 0.15s ease",
              }}
              title="Executar fluxo de chat convencional (monolítico/roteador)"
            >
              💬 Chat
            </button>
            <button
              type="button"
              onClick={() => onRouteModeChange("team")}
              style={{
                padding: "var(--space-1) var(--space-3)",
                fontSize: "var(--font-size-xs)",
                border: "none",
                backgroundColor: routeMode === "team" ? "var(--color-primary)" : "transparent",
                color: routeMode === "team" ? "#ffffff" : "var(--text-secondary)",
                fontWeight: routeMode === "team" ? "var(--font-weight-semibold)" : "normal",
                cursor: "pointer",
                transition: "background-color 0.15s ease",
              }}
              title="Executar modo equipe multi-agente (supervisor, analista, planejador, executor)"
            >
              👥 Equipe (Team)
            </button>
          </div>
        </div>

        {routeMode === "team" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              backgroundColor: "var(--bg-elevated)",
              padding: "2px var(--space-2)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <label
              htmlFor="team-max-steps-input"
              style={{ color: "var(--text-secondary)", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-medium)" }}
            >
              Teto de Passos:
            </label>
            <input
              id="team-max-steps-input"
              type="number"
              min={1}
              max={8}
              value={maxSteps}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!Number.isNaN(val) && val >= 1 && val <= 8) {
                  onMaxStepsChange(val);
                }
              }}
              style={{
                width: "44px",
                height: "24px",
                padding: "0 4px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-strong)",
                backgroundColor: "var(--bg-primary)",
                color: "var(--text-primary)",
                fontSize: "var(--font-size-xs)",
                textAlign: "center",
              }}
              aria-label="Teto de passos do modo equipe (1 a 8)"
            />
            <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
              (1–8, padrão 8)
            </span>
          </div>
        )}
      </div>

      {/* Linha do Textarea e Botão de Envio */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: "var(--space-2)", width: "100%" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              routeMode === "team"
                ? "Descreva o incidente para a equipe multi-agente (supervisor, analista, planejador, executor)..."
                : "Descreva o incidente ou comando operacional... (Enter envia, Shift+Enter pula linha)"
            }
            disabled={isLoading}
            rows={1}
            style={{
              width: "100%",
              resize: "none",
              maxHeight: "160px",
              minHeight: "44px",
              paddingRight: "var(--space-4)",
              lineHeight: 1.5,
            }}
            aria-label="Mensagem para o copiloto OpssPilot"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !text.trim()}
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "var(--radius-md)",
            backgroundColor: text.trim() && !isLoading ? "var(--color-primary)" : "var(--bg-elevated)",
            color: text.trim() && !isLoading ? "#ffffff" : "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            border: "1px solid var(--border-subtle)",
          }}
          aria-label={isLoading ? "Enviando mensagem..." : "Enviar mensagem"}
        >
          {isLoading ? (
            <svg
              style={{ width: "20px", height: "20px", animation: "spin 1s linear infinite" }}
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
              <path
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
              <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            </svg>
          ) : (
            <svg style={{ width: "20px", height: "20px" }} viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          )}
        </button>
      </div>
    </form>
  );
};
