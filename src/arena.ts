import { z } from "zod";
import { reactStrategy } from "./agents/react.js";
import { planAndExecuteStrategy } from "./agents/plan-and-execute.js";
import { withReflection } from "./agents/reflection.js";
import { formatTrace } from "./agents/trace.js";
import { store } from "./models/store.js";

const Args = z.object({ strategies: z.string().default("react"), maxIterations: z.coerce.number().int().positive().default(8), input: z.string().min(1) });
export function parseArgs(argv: string[]) {
  const strategies: string[] = []; let maxIterations = "8"; const input: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--strategies") strategies.push(...(argv[++i] ?? "").split(","));
    else if (argv[i] === "--max-iterations") maxIterations = argv[++i] ?? "";
    else input.push(argv[i]);
  }
  return Args.parse({ strategies: strategies.length ? strategies.join(",") : undefined, maxIterations, input: input.join(" ") });
}
const strategies = { react: reactStrategy, "plan-and-execute": planAndExecuteStrategy };
const reflectedStrategies = {
  "reflect:react": withReflection(reactStrategy),
  "reflect:plan-and-execute": withReflection(planAndExecuteStrategy),
};
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv.slice(2));
  for (const name of args.strategies.split(",")) {
    const strategy =
      strategies[name as keyof typeof strategies] ??
      reflectedStrategies[name as keyof typeof reflectedStrategies];
    if (!strategy) throw new Error(`Unknown strategy: ${name}`);
    let result;
    try {
      result = await strategy.run(args.input, { maxIterations: args.maxIterations, store: store.clone() });
    } catch (error) {
      if (error instanceof Error && error.message === "OPENROUTER_API_KEY and OPENROUTER_MODEL are required") {
        throw new Error(
          "OpenRouter is not configured. Export OPENROUTER_API_KEY and OPENROUTER_MODEL before running the arena.",
          { cause: error },
        );
      }
      throw error;
    }
    console.log(`\n## ${strategy.name}\n${result.answer}\n${formatTrace(result)}\nmetrics=${JSON.stringify(result.metrics)}`);
  }
}
