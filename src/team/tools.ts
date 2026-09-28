import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { SqliteOperationalStore, type OperationalRepository } from "../models/store.js";
import { listAlerts as list, openIncident as open, resolveIncident as resolve } from "../services/incidents.js";
import { Severity } from "../models/domain.js";

// Transformação de aliases de severidade (sev1–sev4) para os valores canônicos
const IncidentSeverity = z.union([
  Severity,
  z.enum(["sev1", "sev2", "sev3", "sev4"]),
]).transform((value) => {
  if (value === "sev1") return "critical";
  if (value === "sev2") return "high";
  if (value === "sev3") return "medium";
  if (value === "sev4") return "low";
  return value;
});

/**
 * Ferramentas exclusivas do analista: somente leitura.
 * O analista NÃO pode abrir nem resolver incidentes.
 */
export function createAnalystTools(store: OperationalRepository = new SqliteOperationalStore()) {
  return [
    tool(async ({ status }) => JSON.stringify(await list(store, status === "all" ? undefined : status)), {
      name: "list_alerts",
      description: "Lista alertas por status (firing, resolved ou all).",
      schema: z.object({ status: z.enum(["firing", "resolved", "all"]).default("firing") }),
    }),
  ];
}

/**
 * Ferramentas do executor: leitura + mutação de incidentes.
 * Exclui ferramentas de preferências de usuário (não são operacionais).
 */
export function createExecutorTools(store: OperationalRepository = new SqliteOperationalStore()) {
  return [
    tool(async ({ status }) => JSON.stringify(await list(store, status === "all" ? undefined : status)), {
      name: "list_alerts",
      description: "Lista alertas por status.",
      schema: z.object({ status: z.enum(["firing", "resolved", "all"]).default("firing") }),
    }),
    tool(async ({ title, service, severity }) => JSON.stringify(await open(store, title, service, severity)), {
      name: "open_incident",
      description: "Abre um incidente. Severity aceita low/medium/high/critical ou sev1–sev4.",
      schema: z.object({
        title: z.string().min(1),
        service: z.string().min(1),
        severity: IncidentSeverity,
      }),
    }),
    tool(async ({ id }) => JSON.stringify(await resolve(store, id)), {
      name: "resolve_incident",
      description: "Resolve um incidente pelo ID.",
      schema: z.object({ id: z.string().min(1) }),
    }),
  ];
}
