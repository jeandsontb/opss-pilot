import type { ReasoningResult, TraceEvent } from "./types.js";
export function formatTraceEvent(event: TraceEvent): string {
  if (event.type === "action") return `[action] ${event.tool} ${JSON.stringify(event.args)}`;
  if (event.type === "plan") return `[plan] ${event.steps.join(" -> ")}`;
  if (event.type === "route") return `[route] ${event.route}: ${event.reason}`;
  if (event.type === "fallback") return `[fallback] ${event.fromModel} -> ${event.toModel}: ${event.reason}`;
  if (event.type === "handoff") return `[handoff] ${event.from} → ${event.to}: ${event.brief}`;
  return `[${event.type}] ${event.content}`;
}
export function formatTrace(result: Pick<ReasoningResult, "trace">): string {
  return result.trace.map(formatTraceEvent).join("\n");
}
