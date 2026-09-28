export type StructuredLogEvent = {
  timestamp: string;
  requestId?: string;
  event: string;
  type?: string;
  node?: string;
  sequence?: number;
  status?: string;
  durationMs?: number;
  errorKind?: string;
  route?: string;
  tokens?: number | null;
};

const allowedKeys = new Set(["timestamp", "requestId", "event", "type", "node", "sequence", "status", "durationMs", "errorKind", "route", "tokens"]);

export type Logger = {
  info(event: Omit<StructuredLogEvent, "timestamp"> & { timestamp?: string }): void;
  error(event: Omit<StructuredLogEvent, "timestamp"> & { timestamp?: string }): void;
};

export function createLogger(write: (line: string) => void = console.log): Logger {
  const emit = (event: Omit<StructuredLogEvent, "timestamp"> & { timestamp?: string }) => {
    const record: Record<string, unknown> = {
      timestamp: event.timestamp ?? new Date().toISOString(),
      ...event,
    };
    for (const key of Object.keys(record)) {
      if (!allowedKeys.has(key)) delete record[key];
    }
    write(JSON.stringify(record));
  };
  return { info: emit, error: emit };
}

export const logger = createLogger();
