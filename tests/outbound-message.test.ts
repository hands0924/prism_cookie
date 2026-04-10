import { test } from "node:test";
import assert from "node:assert/strict";
import { composeOutboundMessage } from "../lib/outbound-message";

test("composeOutboundMessage injects name and mapped interests", () => {
  const msg = composeOutboundMessage({
    name: "test",
    interests: ["보험상담", "채용/이직"]
  });

  assert.match(msg, /\[포용적 금융서비스, 프리즘지점\]test님,/);
  assert.match(msg, /보험상담을 의뢰하고 싶어요!, 채용\/이직을 알아보고 싶어요!/);
  assert.match(msg, /www\.instagram\.com\/prism\.fin/);
});
