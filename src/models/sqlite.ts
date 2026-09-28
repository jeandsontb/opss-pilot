import Database from "better-sqlite3";

export function getDatabasePath(explicit?: string): string {
  if (explicit && explicit.trim().length > 0) return explicit;
  if (process.env.DATABASE_PATH && process.env.DATABASE_PATH.trim().length > 0) {
    return process.env.DATABASE_PATH;
  }
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0) {
    return process.env.DATABASE_URL.replace(/^sqlite:\/\//, "");
  }
  return "opss_pilot.sqlite";
}

let sharedDb: Database.Database | undefined;

export function openDatabase(databasePath?: string): Database.Database {
  const path = getDatabasePath(databasePath);
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

export function getDefaultDatabase(): Database.Database {
  if (!sharedDb) {
    sharedDb = openDatabase();
  }
  return sharedDb;
}

export function closeDefaultDatabase(): void {
  if (sharedDb) {
    try {
      sharedDb.close();
    } catch {
      // ignore
    }
    sharedDb = undefined;
  }
}
