import type { RequestRecord } from "./types.js";

export type LatencyPercentiles = { p50: number | null; p95: number | null };
export type StatsBucket = {
  key: string;
  total: number;
  errors: number;
  tokens: number;
  cost: number;
  latencyMs: LatencyPercentiles;
};

export type RequestStats = {
  total: number;
  errors: number;
  tokens: number;
  cost: number;
  latencyMs: LatencyPercentiles;
  byRoute: StatsBucket[];
  byModel: StatsBucket[];
};

function percentile(values: number[], percentileValue: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.ceil((percentileValue / 100) * sorted.length) - 1] ?? null;
}

function bucket(key: string, requests: RequestRecord[]): StatsBucket {
  const latencies = requests
    .map((request) => request.metrics?.latencyMs)
    .filter((value): value is number => typeof value === "number");
  return {
    key,
    total: requests.length,
    errors: requests.filter((request) => request.status === "failed").length,
    tokens: requests.reduce((total, request) => total + (request.metrics?.promptTokens ?? 0), 0),
    // Current supported models are free; retaining this field makes paid pricing additive later.
    cost: 0,
    latencyMs: { p50: percentile(latencies, 50), p95: percentile(latencies, 95) },
  };
}

function groupBy(requests: RequestRecord[], keyOf: (request: RequestRecord) => string): StatsBucket[] {
  const groups = new Map<string, RequestRecord[]>();
  for (const request of requests) {
    const key = keyOf(request) || "unknown";
    const group = groups.get(key);
    if (group) group.push(request);
    else groups.set(key, [request]);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, values]) => bucket(key, values));
}

export function summarizeRequests(requests: RequestRecord[]): RequestStats {
  const overall = bucket("all", requests);
  return {
    total: overall.total,
    errors: overall.errors,
    tokens: overall.tokens,
    cost: overall.cost,
    latencyMs: overall.latencyMs,
    byRoute: groupBy(requests, (request) => request.route ?? "unknown"),
    byModel: groupBy(requests, (request) => request.metrics?.modelUsed ?? "unknown"),
  };
}
