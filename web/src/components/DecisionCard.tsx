import React from "react";
import type { DecisionCardState } from "../types/chat.js";

type DecisionCardProps = {
  decision: DecisionCardState;
  onApprove: () => void;
  onDeny: () => void;
};

export const DecisionCard: React.FC<DecisionCardProps> = ({
  decision,
  onApprove,
  onDeny,
}) => {
  const isPending = decision.status === "pending";

  return (
    <div
      style={{
        marginTop: "var(--space-3)",
        padding: "var(--space-3)",
        backgroundColor: "var(--bg-overlay)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--color-warning)",
        boxShadow: "var(--shadow-md)",
      }}
      role="alert"
      aria-live="polite"
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <span style={{ fontSize: "16px" }}>⚠️</span>
          <span style={{ color: "var(--color-warning)", fontWeight: "var(--font-weight-semibold)", fontSize: "var(--font-size-sm)" }}>
            Ação Operacional Crítica (Human-in-the-Loop)
          </span>
        </div>
        <span
          style={{
            fontSize: "var(--font-size-xs)",
            padding: "2px 8px",
            borderRadius: "var(--radius-full)",
            backgroundColor:
              decision.status === "approved"
                ? "var(--color-success-subtle)"
                : decision.status === "denied"
                ? "var(--color-danger-subtle)"
                : "var(--color-warning-subtle)",
            color:
              decision.status === "approved"
                ? "var(--color-success)"
                : decision.status === "denied"
                ? "var(--color-danger)"
                : "var(--color-warning)",
            fontWeight: "var(--font-weight-medium)",
          }}
        >
          {decision.status === "approved" ? "Aprovado" : decision.status === "denied" ? "Rejeitado" : "Aguardando Decisão"}
        </span>
      </div>

      <div style={{ fontWeight: "var(--font-weight-semibold)", color: "var(--text-primary)", fontSize: "var(--font-size-sm)", marginBlock: "var(--space-1)" }}>
        {decision.action.title}
      </div>

      {decision.action.description && (
        <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-secondary)", marginBottom: "var(--space-2)" }}>
          {decision.action.description}
        </div>
      )}

      {isPending ? (
        <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
          <button
            type="button"
            onClick={onApprove}
            style={{
              padding: "var(--space-2) var(--space-4)",
              backgroundColor: "var(--color-success)",
              color: "#ffffff",
              borderRadius: "var(--radius-sm)",
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-semibold)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            ✓ Aprovar Operação
          </button>
          <button
            type="button"
            onClick={onDeny}
            style={{
              padding: "var(--space-2) var(--space-4)",
              backgroundColor: "var(--color-danger)",
              color: "#ffffff",
              borderRadius: "var(--radius-sm)",
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-semibold)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            ✕ Negar Operação
          </button>
        </div>
      ) : (
        <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", marginTop: "var(--space-2)" }}>
          Decisão registrada em {decision.decidedAt ? new Date(decision.decidedAt).toLocaleTimeString() : "agora"}.
        </div>
      )}
    </div>
  );
};
