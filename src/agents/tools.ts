import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { SqliteOperationalStore, type OperationalRepository } from "../models/store.js";
import { listAlerts as list, openIncident as open, resolveIncident as resolve } from "../services/incidents.js";
import { Severity } from "../models/domain.js";
import type { MemoryStore } from "../memory/memory-store.js";

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

export function createTools(store: OperationalRepository = new SqliteOperationalStore(), memories?: MemoryStore) {
  const operationalTools = [
    tool(async ({ status }) => JSON.stringify(await list(store, status === "all" ? undefined : status)), {
      name: "list_alerts", description: "Lista alertas por status.", schema: z.object({ status: z.enum(["firing", "resolved", "all"]).default("firing") }),
    }),
    tool(async ({ title, service, severity }) => JSON.stringify(await open(store, title, service, severity)), {
      name: "open_incident", description: "Abre um incidente. Serviços novos são criados no store em memória; severity aceita low/medium/high/critical ou sev1-sev4.", schema: z.object({ title: z.string().min(1), service: z.string().min(1), severity: IncidentSeverity }),
    }),
    tool(async ({ id }) => JSON.stringify(await resolve(store, id)), {
      name: "resolve_incident", description: "Resolve um incidente.", schema: z.object({ id: z.string().min(1) }),
    }),
  ];
  if (!memories) return operationalTools;
  return [
    ...operationalTools,
    tool(async ({ userId, memoryId }) => JSON.stringify({
      removed: await memories.forget(userId, memoryId),
    }), {
      name: "forget_preference",
      description: "Esquece uma preferência do usuário sem revelar memórias de outros usuários.",
      schema: z.object({ userId: z.string().min(1), memoryId: z.string().min(1) }),
    }),
  ];
}
// Tools are created per request so production always receives the configured SQLite store.
