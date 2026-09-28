import { z } from "zod";
import { isRateLimitError } from "./agents/model.js";
import { planAndExecuteStrategy } from "./agents/plan-and-execute.js";
import { reactStrategy } from "./agents/react.js";
import type { ReasoningResult, ReasoningStrategy } from "./agents/types.js";
import { OperationalStore } from "./models/store.js";

const scenarios = {
  C1: "quantos alertas críticos estão disparando?",
  C2: "abra três incidentes sev2 para checkout, payment e catalog, nessa mesma ordem, e resolva o primeiro.",
  C3: "dos alertas disparando, abra um incidente para o mais antigo e diga quantos sobraram",
} as const;

type ScenarioId = keyof typeof scenarios;
type BenchRow = {
  cenário: ScenarioId;
  estratégia: string;
  acerto: boolean;
  llCalls: number;
  latencyMs: number;
};

const optionsSchema = z.object({
  scenario: z.enum(["C1", "C2", "C3"]).optional(),
  noReplanner: z.boolean(),
});

export function parseBenchArgs(argv: string[]) {
  let scenario: string | undefined;
  let noReplanner = false;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--scenario") scenario = argv[++index];
    else if (argument === "--no-replanner") noReplanner = true;
    else throw new Error(`Unknown bench argument: ${argument}`);
  }
  return optionsSchema.parse({ scenario, noReplanner });
}

function countCriticalFiring(store: OperationalStore): number {
  return store.listAlerts("firing").filter((alert) => alert.severity === "critical").length;
}

function hasAnswer(result: ReasoningResult, pattern: RegExp): boolean {
  return pattern.test(result.answer);
}

function verifyScenario(
  scenario: ScenarioId,
  store: OperationalStore,
  result: ReasoningResult,
): boolean {
  const snapshot = store.snapshot();
  if (scenario === "C1") {
    return countCriticalFiring(store) === 1 &&
      hasAnswer(result, /\b1\b|um|uma/i);
  }
  if (scenario === "C2") {
    const incidents = snapshot.incidents;
    const expectedServices = ["checkout", "payment", "catalog"];
    const created = expectedServices.map((name) =>
      snapshot.services.find((service) => service.name === name)?.id,
    );
    return incidents.length === 3 &&
      incidents.map((incident) => incident.serviceId).join(",") === created.join(",") &&
      incidents[0]?.status === "resolved" &&
      incidents.slice(1).every((incident) => incident.status === "open");
  }
  const firing = store.listAlerts("firing");
  const oldest = firing[0];
  const incident = snapshot.incidents[0];
  const expectedServiceId = oldest
    ? snapshot.services.find((service) => service.id === oldest.serviceId)?.id
    : undefined;
  return firing.length === 3 &&
    snapshot.incidents.length === 1 &&
    incident?.serviceId === expectedServiceId &&
    hasAnswer(result, /\b2\b|dois/i);
}

function renderTable(rows: BenchRow[]): string {
  const header = "| cenário | estratégia | acerto | llCalls | latencyMs |\n|---|---|---:|---:|---:|";
  const body = rows.map((row) =>
    `| ${row.cenário} | ${row.estratégia} | ${row.acerto ? "true" : "false"} | ${row.llCalls} | ${row.latencyMs} |`,
  );
  return [header, ...body].join("\n");
}

export async function runBench(argv: string[]): Promise<BenchRow[]> {
  const options = parseBenchArgs(argv);
  const selected: ScenarioId[] = options.scenario
    ? [options.scenario]
    : (Object.keys(scenarios) as ScenarioId[]);
  const strategies: ReasoningStrategy[] = [reactStrategy, planAndExecuteStrategy];
  const rows: BenchRow[] = [];

  for (const scenario of selected) {
    for (const strategy of strategies) {
      const store = new OperationalStore();
      let result: ReasoningResult;
      try {
        result = await strategy.run(scenarios[scenario], {
          store,
          noReplanner: options.noReplanner && strategy.name === "plan-and-execute",
          maxIterations: 8,
        });
      } catch (error) {
        if (isRateLimitError(error)) {
          throw new Error(
            "OpenRouter recusou a chamada por limite de cota. " +
            "A cota diária do modelo openrouter/free foi esgotada; " +
            "aguarde o reset ou configure um modelo com cota disponível.",
            { cause: error },
          );
        }
        throw error;
      }
      rows.push({
        cenário: scenario,
        estratégia: strategy.name,
        acerto: verifyScenario(scenario, store, result),
        llCalls: result.metrics.llCalls,
        latencyMs: result.metrics.latencyMs,
      });
    }
  }
  return rows;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    console.log(renderTable(await runBench(process.argv.slice(2))));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Benchmark failed");
    process.exitCode = 1;
  }
}
