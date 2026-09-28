#!/bin/sh
set -eu

URL="${CHAT_URL:-http://127.0.0.1:3000}"
TURNS="${CHAT_TURNS:-5}"
STRATEGY="${CHAT_STRATEGY:-react}"

URL="$URL" TURNS="$TURNS" STRATEGY="$STRATEGY" node --input-type=module <<'NODE'
const url = process.env.URL;
const turns = Number.parseInt(process.env.TURNS ?? "5", 10);
const strategy = process.env.STRATEGY ?? "react";
let conversationId;

if (!Number.isInteger(turns) || turns < 1) {
  throw new Error("CHAT_TURNS must be a positive integer");
}

for (let turn = 1; turn <= turns; turn += 1) {
  const response = await fetch(`${url}/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      message: `diagnóstico de conversa longa turno ${turn}`,
      strategy,
      ...(conversationId ? { conversationId } : {}),
    }),
  });
  const body = await response.json();
  if (!response.ok) {
    console.error(`turn=${turn} error=${body.error ?? `HTTP ${response.status}`}`);
    continue;
  }
  conversationId = body.conversationId;
  console.log(`turn=${turn} promptTokens=${body.metrics?.promptTokens ?? "null"}`);
}
NODE
