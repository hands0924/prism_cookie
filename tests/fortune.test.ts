import { test } from "node:test";
import assert from "node:assert/strict";
import { generateFortuneMessage } from "../lib/fortune";

test("generateFortuneMessage returns stable 3 lines", () => {
  const message = generateFortuneMessage({
    concern: "아플 때",
    protectTarget: "나 자신",
    neededThing: "정보"
  });

  assert.equal(message.length, 3);
  assert.ok(message.every((line) => typeof line === "string" && line.length > 0));
});
