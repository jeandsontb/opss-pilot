import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { AlertSchema, IncidentSchema, ServiceSchema } from "./domain.js";
import type { Alert, Incident, Service } from "./domain.js";
import type { StoreSnapshot } from "./store.js";

const SeedFileSchema = z.object({
  services: z.array(ServiceSchema),
  alerts: z.array(AlertSchema),
  incidents: z.array(IncidentSchema),
});

const seedFile = fileURLToPath(new URL("../data/seed.json", import.meta.url));

export function loadSeedSnapshot(): StoreSnapshot {
  return SeedFileSchema.parse(JSON.parse(readFileSync(seedFile, "utf8")));
}

const seed = loadSeedSnapshot();
export const seedServices: Service[] = seed.services;
export const seedAlerts: Alert[] = seed.alerts;
export const seedIncidents: Incident[] = seed.incidents;
