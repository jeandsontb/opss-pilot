import React from "react";
import type { ApiConfiguration } from "../types/chat.js";

type HeaderProps = {
  config: ApiConfiguration;
  isApiOnline: boolean | null;
  onOpenSettings: () => void;
  onToggleTheme: () => void;
  onNewConversation: () => void;
};

export const Header: React.FC<HeaderProps> = ({
  config,
  isApiOnline,
  onOpenSettings,
  onToggleTheme,
  onNewConversation,
}) => {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "var(--space-3) var(--space-4)",
        backgroundColor: "var(--bg-surface)",
        borderBottom: "1px solid var(--border-subtle)",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
    >
      {/* Título e Identidade */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--color-primary-subtle)",
            color: "var(--color-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
            fontWeight: "var(--font-weight-bold)",
          }}
          aria-hidden="true"
        >
          ⚡
        </div>
        <div>
          <h1 style={{ fontSize: "var(--font-size-md)", fontWeight: "var(--font-weight-bold)", margin: 0 }}>
            OpssPilot War Room
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginTop: "2px" }}>
            <span
              style={{
                display: "inline-block",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor:
                  isApiOnline === true
                    ? "var(--color-success)"
                    : isApiOnline === false
                    ? "var(--color-danger)"
                    : "var(--color-warning)",
              }}
            />
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
              {isApiOnline === true ? "API Conectada" : isApiOnline === false ? "API Desconectada" : "Verificando..."}
            </span>
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>•</span>
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>{config.baseUrl}</span>
          </div>
        </div>
      </div>

      {/* Ações do Cabeçalho */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        {/* Botão Nova Conversa */}
        <button
          type="button"
          onClick={onNewConversation}
          style={{
            padding: "var(--space-2) var(--space-3)",
            backgroundColor: "var(--bg-elevated)",
            borderRadius: "var(--radius-md)",
            color: "var(--text-primary)",
            fontSize: "var(--font-size-xs)",
            fontWeight: "var(--font-weight-medium)",
            border: "1px solid var(--border-subtle)",
          }}
          title="Iniciar nova sessão de conversa"
        >
          + Nova Sessão
        </button>

        {/* Alternador de Tema */}
        <button
          type="button"
          onClick={onToggleTheme}
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--bg-elevated)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-subtle)",
            fontSize: "16px",
          }}
          title={`Tema atual: ${config.theme}. Clique para alternar.`}
          aria-label="Alternar tema de cores"
        >
          {config.theme === "dark" ? "🌙" : "☀️"}
        </button>

        {/* Botão de Engrenagem (Configurações) */}
        <button
          type="button"
          onClick={onOpenSettings}
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--bg-elevated)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-subtle)",
            fontSize: "16px",
          }}
          title="Configurações de Conexão da API"
          aria-label="Abrir configurações de conexão da API"
        >
          ⚙️
        </button>
      </div>
    </header>
  );
};
