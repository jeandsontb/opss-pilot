import assert from "node:assert/strict";
import test from "node:test";
import { ConversationNotFoundError, InMemoryConversationStore } from "../src/models/conversation-store.js";

test("conversation store creates, appends, orders, isolates, and limits messages", async () => {
  const store = new InMemoryConversationStore();
  const first = await store.create();
  const second = await store.create();
  await store.append(first, "user", "one");
  await store.append(first, "assistant", "two");
  await store.append(second, "user", "other");

  assert.deepEqual((await store.lastMessages(first, 12)).map((message) => message.content), ["one", "two"]);
  assert.deepEqual((await store.lastMessages(second, 12)).map((message) => message.content), ["other"]);

  for (let index = 0; index < 13; index += 1) await store.append(first, "user", `message-${index}`);
  assert.equal((await store.lastMessages(first, 12)).length, 12);
  assert.equal((await store.lastMessages(first, 12))[0]?.content, "message-1");
});

test("conversation store rejects unknown conversations", async () => {
  const store = new InMemoryConversationStore();
  await assert.rejects(() => store.lastMessages("missing", 12), ConversationNotFoundError);
  await assert.rejects(() => store.append("missing", "user", "message"), ConversationNotFoundError);
});
