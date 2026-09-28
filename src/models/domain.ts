import { z } from "zod";

export const AlertStatus = z.enum(["firing", "resolved"]);
export const IncidentStatus = z.enum(["open", "resolved"]);
export const Severity = z.enum(["low", "medium", "high", "critical"]);

export const ServiceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  createdAt: z.string(),
});
export const AlertSchema = z.object({
  id: z.string().min(1),
  serviceId: z.string().min(1),
  title: z.string().min(1),
  status: AlertStatus,
  severity: Severity,
  createdAt: z.string(),
  resolvedAt: z.string().optional(),
});
export const IncidentSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  serviceId: z.string().min(1),
  severity: Severity,
  status: IncidentStatus,
  createdAt: z.string(),
  resolvedAt: z.string().optional(),
});

export type Service = z.infer<typeof ServiceSchema>;
export type Alert = z.infer<typeof AlertSchema>;
export type Incident = z.infer<typeof IncidentSchema>;

export class DomainError extends Error {}
export class NotFoundError extends DomainError {}
export class ConflictError extends DomainError {}
