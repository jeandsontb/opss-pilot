import React, { useState, useEffect } from "react";
import type { ApiConfiguration } from "../types/chat.js";
import { checkHealth } from "../services/api.js";

type SettingsModalProps = {
  isOpen: boolean;
  config: ApiConfiguration;
  onClose: () => void;
  onSave: (config: Partial<ApiConfiguration>) => void;
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  config,
  onClose,
  onSave,
}) => {
  const [url, setUrl] = useState(config.baseUrl);
  const [timeoutMs, setTimeoutMs] = useState(config.timeoutMs);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; latencyMs: number; error?: string } | null>(null);

  useEffect(() => {
    setUrl(config.baseUrl);
    setTimeoutMs(config.timeoutMs);
    setTestResult(null);
  }, [isOpen, config]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const res = await checkHealth(url);
    setIsTesting(false);
    setTestResult(res);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      baseUrl: url.trim().replace(/\/+$/, ""),
      timeoutMs: Number(timeoutMs) || 180000,
    });
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: "var(--space-4)",
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-strong)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-xl)",
          padding: "var(--space-5)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 id="settings-modal-title" style={{ fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-bold)" }}>
            Configurações de Conexão da API
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-muted)",
              fontSize: "16px",
            }}
            aria-label="Fechar diálogo de configurações"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div>
            <label
              htmlFor="api-url-input"
              style={{ display: "block", fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)", marginBottom: "var(--space-1)" }}
            >
              URL Base da API OpssPilot
            </label>
            <input
              id="api-url-input"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://localhost:3000"
              required
              style={{ width: "100%", fontSize: "var(--font-size-sm)" }}
            />
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
              Endpoint principal do backend Express (com suporte a CORS habilitado).
            </span>
          </div>

          <div>
            <label
              htmlFor="timeout-input"
              style={{ display: "block", fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)", marginBottom: "var(--space-1)" }}
            >
              Timeout Máximo de Espera (segundos)
            </label>
            <input
              id="timeout-input"
              type="number"
              min={10}
              max={600}
              value={Math.round(timeoutMs / 1000)}
              onChange={(e) => setTimeoutMs(Number(e.target.value) * 1000)}
              style={{ width: "100%", fontSize: "var(--font-size-sm)" }}
            />
          </div>

          {/* Teste de Conexão */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || !url.trim()}
              style={{
                alignSelf: "flex-start",
                padding: "var(--space-2) var(--space-3)",
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--font-size-xs)",
                color: "var(--text-primary)",
                fontWeight: "var(--font-weight-medium)",
              }}
            >
              {isTesting ? "Testando conexão..." : "🔍 Testar Conexão (/health)"}
            </button>

            {testResult && (
              <div
                style={{
                  padding: "var(--space-2) var(--space-3)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "var(--font-size-xs)",
                  backgroundColor: testResult.ok ? "var(--color-success-subtle)" : "var(--color-danger-subtle)",
                  color: testResult.ok ? "var(--color-success)" : "var(--color-danger)",
                  border: `1px solid ${testResult.ok ? "var(--color-success)" : "var(--color-danger)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>
                  {testResult.ok ? "✓ Conexão bem-sucedida! API saudável." : `✕ Falha: ${testResult.error}`}
                </span>
                <span style={{ fontWeight: "var(--font-weight-bold)" }}>{testResult.latencyMs}ms</span>
              </div>
            )}
          </div>

          {/* Botões do Rodapé */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "var(--space-2) var(--space-4)",
                backgroundColor: "transparent",
                color: "var(--text-secondary)",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--font-size-sm)",
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{
                padding: "var(--space-2) var(--space-4)",
                backgroundColor: "var(--color-primary)",
                color: "#ffffff",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--font-size-sm)",
                fontWeight: "var(--font-weight-semibold)",
              }}
            >
              Salvar Configurações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
