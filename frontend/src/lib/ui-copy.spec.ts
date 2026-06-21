import test from "node:test";
import assert from "node:assert/strict";

import { detectUiLanguage, getUiCopy } from "./ui-copy.ts";

test("detectUiLanguage falls back to English and maps Sinhala locales", () => {
  assert.equal(detectUiLanguage("si-LK"), "si");
  assert.equal(detectUiLanguage("en-US"), "en");
  assert.equal(getUiCopy("ta").trackMyOrder.length > 0, true);
});
