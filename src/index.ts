import { createServer } from "./http/server.js";
import { getDatabasePath } from "./models/sqlite.js";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const dbPath = getDatabasePath();

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535");
}

const app = createServer();
const server = app.listen(port, () => {
  console.log(`OpssPilot listening on http://localhost:${port} (database: ${dbPath})`);
});

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Set PORT to another value.`);
  } else {
    console.error("Failed to start OpssPilot", error);
  }
  process.exitCode = 1;
});
