import assert from "node:assert/strict";
import test from "node:test";
import { generateFortuneMessage } from "../lib/fortune";
import { buildShareSvg } from "../lib/image";
import { normalizePhone } from "../lib/phone";
import { submitSchema } from "../lib/submit-schema";
import { isAuthorizedJobRequest } from "../lib/worker-auth";

test("normalizePhone strips all non-digits", () => {
  assert.equal(normalizePhone("+82 10-1234-5678"), "821012345678");
  assert.equal(normalizePhone("abc"), "");
});

test("submitSchema applies defaults and validates enums", () => {
  const payload = submitSchema.parse({
    name: "테스터",
    phone: "01012345678",
    concern: "아플 때",
    protectTarget: "나 자신",
    neededThing: "정보"
  });
  assert.deepEqual(payload.interests, []);
  assert.equal(payload.userAgent, "");
});

test("generateFortuneMessage is deterministic and 3-line", () => {
  const payload = {
    concern: "노후" as const,
    protectTarget: "가족" as const,
    neededThing: "계획" as const
  };
  const first = generateFortuneMessage(payload);
  const second = generateFortuneMessage(payload);
  assert.equal(first.length, 3);
  assert.deepEqual(first, second);
  assert.ok(first.every((line) => line.trim().length > 0));
});

test("buildShareSvg escapes XML-sensitive characters", () => {
  const svg = buildShareSvg({
    title: `A&B < "C"`,
    breadName: "포춘쿠키",
    resultType: "프리즘 포춘형",
    lines: ["x<y", "quote\"line", "apostrophe'line"]
  });
  assert.match(svg, /A&amp;B &lt; &quot;C&quot;/);
  assert.match(svg, /x&lt;y/);
  assert.match(svg, /quote&quot;line/);
  assert.match(svg, /apostrophe&apos;line/);
});

test("isAuthorizedJobRequest accepts worker key and cron bearer", () => {
  const prevWorker = process.env.WORKER_API_KEY;
  const prevCron = process.env.CRON_SECRET;
  process.env.WORKER_API_KEY = "worker-secret";
  process.env.CRON_SECRET = "cron-secret";

  try {
    const workerReq = new Request("https://example.com/api/jobs/send-message", {
      method: "POST",
      headers: { "x-worker-key": "worker-secret" }
    });
    assert.equal(isAuthorizedJobRequest(workerReq), true);

    const cronReq = new Request("https://example.com/api/cron/dispatch", {
      headers: { authorization: "Bearer cron-secret" }
    });
    assert.equal(isAuthorizedJobRequest(cronReq), true);

    const badReq = new Request("https://example.com/api/jobs/send-message");
    assert.equal(isAuthorizedJobRequest(badReq), false);
  } finally {
    process.env.WORKER_API_KEY = prevWorker;
    process.env.CRON_SECRET = prevCron;
  }
});
