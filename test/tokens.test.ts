import assert from "node:assert/strict";
import test from "node:test";
import { contextBreakdown, estimateTokens, extractPromptTokens, sumPromptTokens } from "../src/context/tokens.js";

test("estimateTokens is deterministic and uses chars divided by four", () => {
  assert.equal(estimateTokens(""), 0);
  assert.equal(estimateTokens("1234"), 1);
  assert.equal(estimateTokens("12345"), 2);
  assert.equal(estimateTokens("ação"), 1);
});

test("extractPromptTokens accepts supported LangChain usage shapes", () => {
  assert.equal(extractPromptTokens({ usage_metadata: { input_tokens: 7 } }), 7);
  assert.equal(extractPromptTokens({ usage_metadata: { prompt_tokens: 8 } }), 8);
  assert.equal(extractPromptTokens({ response_metadata: { tokenUsage: { promptTokens: 9 } } }), 9);
  assert.equal(extractPromptTokens({ response_metadata: { promptTokens: 10 } }), 10);
  assert.equal(extractPromptTokens({ usage_metadata: { input_tokens: 0 } }), 0);
  assert.equal(extractPromptTokens({ usage_metadata: { input_tokens: -1 } }), null);
  assert.equal(extractPromptTokens({}), null);
});

test("sumPromptTokens distinguishes missing usage from measured zero", () => {
  assert.equal(sumPromptTokens([]), null);
  assert.equal(sumPromptTokens([null, undefined]), null);
  assert.equal(sumPromptTokens([0, null, 4]), 4);
});

test("contextBreakdown estimates each source independently", () => {
  assert.deepEqual(contextBreakdown({
    currentMessage: "1234",
    history: "",
    memories: "abcdef",
  }), {
    currentMessage: 1,
    history: 0,
    memories: 2,
  });
});
