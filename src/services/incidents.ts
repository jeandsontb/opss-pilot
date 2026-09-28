import type { OperationalRepository } from "../models/store.js";
import type { Alert, Incident } from "../models/domain.js";
export const listAlerts = async (store: OperationalRepository, status?: Alert["status"]) => store.listAlerts(status);
export const openIncident = async (store: OperationalRepository, title: string, service: string, severity: Incident["severity"]) =>
  store.openIncident({ title, serviceId: service, severity });
export const resolveIncident = async (store: OperationalRepository, id: string) => store.resolveIncident(id);
