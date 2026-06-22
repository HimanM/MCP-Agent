import test from "node:test";
import assert from "node:assert/strict";
import { parseChatCommand } from "./chat-command.ts";

test("parseChatCommand returns status for trimmed slash command", () => {
  assert.deepEqual(parseChatCommand("   /status   "), { type: "status" });
});

test("parseChatCommand ignores regular chat input", () => {
  assert.equal(parseChatCommand("track my order"), null);
});
