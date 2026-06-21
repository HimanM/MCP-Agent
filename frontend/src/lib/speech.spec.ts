import test from "node:test";
import assert from "node:assert/strict";

import { stripForSpeech } from "./speech.ts";

test("stripForSpeech removes markdown and keeps readable text", () => {
  assert.equal(
    stripForSpeech("**Order Ready!** [Pay now](https://example.com) 🎉"),
    "Order Ready! Pay now"
  );
});
