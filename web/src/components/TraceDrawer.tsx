import React, { useEffect, useState } from "react";
import type { ChatMessage, TraceEvent } from "../types/chat.js";

type TraceDrawerProps = {
  isOpen: boolean;
  message: ChatMessage | null;
  onClose: () => void;
};

export const TraceDrawer: React.FC<TraceDrawerProps> = ({ isOpen, message, onClose }) => {
  const [expandedIndices, setExpandedIndices] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !message) return null;

  const trace = message.trace || [];
  const metrics = message.metrics;

  const toggleExpand = (index: number) => {
    setExpandedIndices((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const getEventBadge = (event: TraceEvent) => {
    switch (event.type) {
      case "route":
        return { label: `ROTA: ${event.route}`, color: "var(--color-primary)", bg: "var(--color-primary-subtle)", icon: "🧭" };
      case "action":
        return { label: `AÇÃO: ${event.tool}`, color: "var(--color-warning)", bg: "var(--color-warning-subtle)", icon: "⚡" };
      case "observation":
        return { label: "OBSERVAÇÃO", color: "var(--color-success)", bg: "var(--color-success-subtle)", icon: "👁️" };
      case "thought":
        return { label: "PENSAMENTO", color: "var(--color-info)", bg: "var(--color-info-subtle)", icon: "💭" };
      case "plan":
        return { label: `PLANO (${event.steps.length} passos)`, color: "var(--color-primary)", bg: "var(--color-primary-subtle)", icon: "📋" };
      case "critique":
        return { label: "REFLEXÃO / CRÍTICA", color: "var(--color-warning)", bg: "var(--color-warning-subtle)", icon: "🔍" };
      case "fallback":
        return { label: `CONTINGÊNCIA (${event.fromModel} ➔ ${event.toModel})`, color: "var(--color-danger)", bg: "var(--color-danger-subtle)", icon: "🔄" };
      case "answer":
        return { label: "RESPOSTA FINAL", color: "var(--color-success)", bg: "var(--color-success-subtle)", icon: "💬" };
      default:
        return { label: "EVENTO", color: "var(--text-muted)", bg: "var(--bg-elevated)", icon: "⚙️" };
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        zIndex: 50,
        display: "flex",
        justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "540px",
          height: "100%",
          backgroundColor: "var(--bg-surface)",
          borderLeft: "1px solid var(--border-strong)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "var(--shadow-xl)",
          animation: "slideIn 0.2s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
        role="region"
        aria-label="Painel de Raciocínio do Copiloto"
      >
        <style>{`
          @keyframes slideIn {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
        `}</style>

        {/* Cabeçalho do Drawer */}
        <div
          style={{
            padding: "var(--space-4)",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2 style={{ fontSize: "var(--font-size-md)", fontWeight: "var(--font-weight-bold)" }}>
              🧠 Raciocínio & Linha do Tempo
            </h2>
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
              {trace.length} passos executados pelo grafo operacional
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-muted)",
              fontSize: "18px",
            }}
            aria-label="Fechar painel de raciocínio"
          >
            ✕
          </button>
        </div>

        {/* Barra de Métricas */}
        {metrics && (
          <div
            style={{
              padding: "var(--space-3) var(--space-4)",
              backgroundColor: "var(--bg-elevated)",
              borderBottom: "1px solid var(--border-subtle)",
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "var(--space-2)",
              textAlign: "center",
            }}
          >
            <div>
              <span style={{ display: "block", fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Latência</span>
              <span style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--text-primary)" }}>
                {metrics.latencyMs}ms
              </span>
            </div>
            <div>
              <span style={{ display: "block", fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Chamadas IA</span>
              <span style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--text-primary)" }}>
                {metrics.llCalls}
              </span>
            </div>
            <div>
              <span style={{ display: "block", fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Tokens Prompt</span>
              <span style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--text-primary)" }}>
                {metrics.promptTokens ?? "N/D"}
              </span>
            </div>
          </div>
        )}

        {/* Linha do Tempo de Passos */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "var(--space-4)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          {trace.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-muted)", marginTop: "var(--space-8)", fontSize: "var(--font-size-sm)" }}>
              Nenhum evento registrado no trace desta mensagem.
            </div>
          ) : (
            trace.map((event, idx) => {
              const badge = getEventBadge(event);
              const isExpanded = expandedIndices[idx];

              return (
                <div
                  key={idx}
                  style={{
                    backgroundColor: "var(--bg-overlay)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    padding: "var(--space-3)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-2)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                      <span>{badge.icon}</span>
                      <span
                        style={{
                          fontSize: "var(--font-size-xs)",
                          fontWeight: "var(--font-weight-semibold)",
                          padding: "2px 8px",
                          borderRadius: "var(--radius-full)",
                          backgroundColor: badge.bg,
                          color: badge.color,
                        }}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                      Passo {idx + 1} • Nó: {event.node}
                    </span>
                  </div>

                  {/* Conteúdo Específico do Passo */}
                  {event.type === "route" && (
                    <div style={{ fontSize: "var(--font-size-sm)", color: "var(--text-secondary)" }}>
                      {event.reason}
                    </div>
                  )}

                  {event.type === "thought" && (
                    <div style={{ fontSize: "var(--font-size-sm)", color: "var(--text-primary)", fontStyle: "italic" }}>
                      "{event.content}"
                    </div>
                  )}

                  {event.type === "action" && (
                    <div>
                      <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", marginBottom: "4px" }}>
                        Argumentos passados para <code>{event.tool}</code>:
                      </div>
                      <pre
                        style={{
                          backgroundColor: "var(--bg-primary)",
                          padding: "var(--space-2)",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "11px",
                          fontFamily: "var(--font-mono)",
                          overflowX: "auto",
                          color: "var(--text-primary)",
                        }}
                      >
                        {JSON.stringify(event.args, null, 2)}
                      </pre>
                    </div>
                  )}

                  {event.type === "observation" && (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>Retorno da observação:</span>
                        {event.content.length > 180 && (
                          <button
                            type="button"
                            onClick={() => toggleExpand(idx)}
                            style={{ fontSize: "10px", color: "var(--color-primary)", textDecoration: "underline" }}
                          >
                            {isExpanded ? "Recolher" : "Expandir tudo"}
                          </button>
                        )}
                      </div>
                      <pre
                        style={{
                          backgroundColor: "var(--bg-primary)",
                          padding: "var(--space-2)",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "11px",
                          fontFamily: "var(--font-mono)",
                          overflowX: "auto",
                          color: "var(--text-secondary)",
                          maxHeight: isExpanded ? "none" : "120px",
                        }}
                      >
                        {event.content}
                      </pre>
                    </div>
                  )}

                  {event.type === "plan" && (
                    <ol style={{ paddingLeft: "var(--space-4)", fontSize: "var(--font-size-sm)", color: "var(--text-secondary)" }}>
                      {event.steps.map((st, sIdx) => (
                        <li key={sIdx} style={{ marginBottom: "2px" }}>{st}</li>
                      ))}
                    </ol>
                  )}

                  {event.type === "critique" && (
                    <div style={{ fontSize: "var(--font-size-sm)", color: "var(--text-secondary)" }}>
                      {event.content}
                    </div>
                  )}

                  {event.type === "fallback" && (
                    <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-danger)" }}>
                      Motivo: {event.reason}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
