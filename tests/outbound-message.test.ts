import { test } from "node:test";
import assert from "node:assert/strict";
import { composeOutboundMessage } from "../lib/outbound-message";

test("composeOutboundMessage injects name, type info, and interests", () => {
  const msg = composeOutboundMessage({
    name: "test",
    typeName: "포근한 팬케이크",
    shortDesc: "몸과 마음의 안전을 누구보다 소중히 여기는 당신은, 나를 먼저 돌보는 것이 진짜 용기라는 걸 아는 사람이에요.",
    interests: ["보험상담", "채용/이직"]
  });

  assert.match(msg, /test님, 오늘의 미래 레시피가 도착했어요/);
  assert.match(msg, /포근한 팬케이크 타입!/);
  assert.match(msg, /보험상담, 채용\/이직/);
  assert.match(msg, /instagram\.com\/prism\.fin/);
  assert.match(msg, /litt\.ly\/prism\.fin/);
});
