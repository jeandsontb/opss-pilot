import { ConflictError, NotFoundError, type Alert, type Incident, type Service } from "./domain.js";
import { loadSeedSnapshot } from "./seed.js";
import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { getDefaultDatabase, openDatabase } from "./sqlite.js";

export type StoreSnapshot = { services: Service[]; alerts: Alert[]; incidents: Incident[] };
export type OperationalRepository = {
  listAlerts(status?: Alert["status"]): Alert[] | Promise<Alert[]>;
  openIncident(input: Omit<Incident, "id" | "status" | "createdAt">): Incident | Promise<Incident>;
  resolveIncident(id: string): Incident | Promise<Incident>;
};

export class OperationalStore {
  private readonly state: StoreSnapshot;
  constructor(snapshot: StoreSnapshot = loadSeedSnapshot()) {
    this.state = structuredClone(snapshot);
  }
  seed(): void {
    const seed = loadSeedSnapshot();
    this.state.services = seed.services;
    this.state.alerts = seed.alerts;
    this.state.incidents = seed.incidents;
  }
  snapshot(): StoreSnapshot { return structuredClone(this.state); }
  clone(): OperationalStore { return new OperationalStore(this.snapshot()); }
  listServices(): Service[] { return structuredClone(this.state.services); }
  listAlerts(status?: Alert["status"]): Alert[] {
    return structuredClone(this.state.alerts.filter((alert) => !status || alert.status === status));
  }
  private ensureService(nameOrId: string): Service {
    const existing = this.state.services.find((service) => service.name === nameOrId || service.id === nameOrId);
    if (existing) return existing;
    const service: Service = {
      id: `svc-${this.state.services.length + 1}`,
      name: nameOrId,
      createdAt: new Date().toISOString(),
    };
    this.state.services.push(service);
    return service;
  }
  openIncident(input: Omit<Incident, "id" | "status" | "createdAt">): Incident {
    const service = this.ensureService(input.serviceId);
    const incident: Incident = { ...input, serviceId: service.id,
      id: `incident-${this.state.incidents.length + 1}`, status: "open", createdAt: new Date().toISOString() };
    if (this.state.incidents.some((item) => item.id === incident.id)) throw new ConflictError("Incident ID already exists");
    this.state.incidents.push(incident);
    return structuredClone(incident);
  }
  resolveIncident(id: string): Incident {
    const incident = this.state.incidents.find((item) => item.id === id);
    if (!incident) throw new NotFoundError(`Incident not found: ${id}`);
    if (incident.status === "resolved") throw new ConflictError(`Incident already resolved: ${id}`);
    incident.status = "resolved"; incident.resolvedAt = new Date().toISOString();
    return structuredClone(incident);
  }
}

export const store = new OperationalStore();

export class SqliteOperationalStore implements OperationalRepository {
  private readonly db: Database.Database;

  constructor(database: Database.Database | string = getDefaultDatabase()) {
    this.db = typeof database === "string" ? openDatabase(database) : database;
    this.ensureTables();
  }

  private ensureTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS services (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        service_id TEXT NOT NULL REFERENCES services(id),
        title TEXT NOT NULL,
        status TEXT NOT NULL,
        severity TEXT NOT NULL,
        created_at TEXT NOT NULL,
        resolved_at TEXT
      );
      CREATE TABLE IF NOT EXISTS incidents (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        service_id TEXT NOT NULL REFERENCES services(id),
        severity TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        resolved_at TEXT
      );
      CREATE INDEX IF NOT EXISTS alerts_status ON alerts(status);
    `);

    const count = this.db.prepare("SELECT COUNT(*) as count FROM services").get() as { count: number };
    if (count.count === 0) {
      try {
        const seed = loadSeedSnapshot();
        const insertService = this.db.prepare("INSERT OR IGNORE INTO services (id, name, created_at) VALUES (?, ?, ?)");
        const insertAlert = this.db.prepare("INSERT OR IGNORE INTO alerts (id, service_id, title, status, severity, created_at, resolved_at) VALUES (?, ?, ?, ?, ?, ?, ?)");
        const tx = this.db.transaction(() => {
          for (const s of seed.services) insertService.run(s.id, s.name, s.createdAt);
          for (const a of seed.alerts) insertAlert.run(a.id, a.serviceId, a.title, a.status, a.severity, a.createdAt, a.resolvedAt ?? null);
        });
        tx();
      } catch {
        // Ignored if seed file unavailable
      }
    }
  }

  async listAlerts(status?: Alert["status"]): Promise<Alert[]> {
    const rows = (status
      ? this.db.prepare("SELECT id, service_id as serviceId, title, status, severity, created_at as createdAt, resolved_at as resolvedAt FROM alerts WHERE status = ?").all(status)
      : this.db.prepare("SELECT id, service_id as serviceId, title, status, severity, created_at as createdAt, resolved_at as resolvedAt FROM alerts").all()
    ) as Array<{ id: string; serviceId: string; title: string; status: Alert["status"]; severity: Alert["severity"]; createdAt: string; resolvedAt: string | null }>;

    return rows.map((row) => ({
      id: row.id,
      serviceId: row.serviceId,
      title: row.title,
      status: row.status,
      severity: row.severity,
      createdAt: row.createdAt,
      resolvedAt: row.resolvedAt ?? undefined,
    }));
  }

  async openIncident(input: Omit<Incident, "id" | "status" | "createdAt">): Promise<Incident> {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const existing = this.db.prepare("SELECT id FROM services WHERE id = ? OR name = ? LIMIT 1").get(input.serviceId, input.serviceId) as { id: string } | undefined;
    const serviceId = existing?.id ?? `svc-${randomUUID()}`;
    if (!existing) {
      this.db.prepare("INSERT INTO services (id, name, created_at) VALUES (?, ?, ?)").run(serviceId, input.serviceId, createdAt);
    }
    this.db.prepare("INSERT INTO incidents (id, title, service_id, severity, status, created_at) VALUES (?, ?, ?, ?, 'open', ?)").run(
      id, input.title, serviceId, input.severity, createdAt
    );
    return {
      id,
      title: input.title,
      serviceId,
      severity: input.severity,
      status: "open",
      createdAt,
    };
  }

  async resolveIncident(id: string): Promise<Incident> {
    const now = new Date().toISOString();
    const result = this.db.prepare(
      "UPDATE incidents SET status = 'resolved', resolved_at = ? WHERE id = ? AND status = 'open'"
    ).run(now, id);
    if (result.changes === 0) {
      throw new NotFoundError(`Incident not found or already resolved: ${id}`);
    }
    const row = this.db.prepare("SELECT id, title, service_id as serviceId, severity, status, created_at as createdAt, resolved_at as resolvedAt FROM incidents WHERE id = ?").get(id) as { id: string; title: string; serviceId: string; severity: Incident["severity"]; status: Incident["status"]; createdAt: string; resolvedAt: string };
    return {
      id: row.id,
      title: row.title,
      serviceId: row.serviceId,
      severity: row.severity,
      status: row.status,
      createdAt: row.createdAt,
      resolvedAt: row.resolvedAt,
    };
  }
}

export { SqliteOperationalStore as PostgresOperationalStore };
