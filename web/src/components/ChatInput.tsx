import React, { useState, useRef, useEffect } from "react";

type ChatInputProps = {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
};

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    onSendMessage(trimmed);
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
        alignItems: "flex-end",
        gap: "var(--space-2)",
        padding: "var(--space-3) var(--space-4)",
        backgroundColor: "var(--bg-surface)",
        borderTop: "1px solid var(--border-subtle)",
        position: "relative",
      }}
    >
      <div style={{ flex: 1, position: "relative" }}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Descreva o incidente ou comando operacional... (Enter envia, Shift+Enter pula linha)"
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
    </form>
  );
};
