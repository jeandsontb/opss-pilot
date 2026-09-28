import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "../src/http/server.js";
import type { Server } from "node:http";

test("CORS middleware handles preflight OPTIONS requests", async () => {
  const app = createServer();
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Server failed to bind");
  const port = address.port;

  try {
    const response = await fetch(`http://localhost:${port}/chat`, {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:5173",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type, x-request-id",
      },
    });

    assert.equal(response.status, 204);
    assert.equal(response.headers.get("access-control-allow-origin"), "*");
    assert.ok(response.headers.get("access-control-allow-methods")?.includes("POST"));
    assert.ok(response.headers.get("access-control-allow-headers")?.includes("Content-Type"));
  } finally {
    server.close();
  }
});

test("CORS headers are present on GET /health", async () => {
  const app = createServer();
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Server failed to bind");
  const port = address.port;

  try {
    const response = await fetch(`http://localhost:${port}/health`, {
      headers: {
        Origin: "http://localhost:5173",
      },
    });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("access-control-allow-origin"), "*");
  } finally {
    server.close();
  }
});
