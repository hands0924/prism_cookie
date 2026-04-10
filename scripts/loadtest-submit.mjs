import { randomUUID } from "node:crypto";

const BASE_URL = process.env.LOADTEST_BASE_URL ?? "http://localhost:3000";
const TOTAL = Number(process.env.LOADTEST_TOTAL ?? "1000");
const CONCURRENCY = Number(process.env.LOADTEST_CONCURRENCY ?? "40");
const TIMEOUT_MS = Number(process.env.LOADTEST_TIMEOUT_MS ?? "10000");
const VERCEL_BYPASS_SECRET = process.env.LOADTEST_VERCEL_BYPASS_SECRET ?? "";
const OVERRIDE_PHONE = process.env.LOADTEST_PHONE ?? "";

const concerns = ["아플 때", "가족/파트너 문제", "일이 끊길 때", "노후", "갑작스러운 사고"];
const protectTargets = ["나 자신", "파트너", "가족", "반려동물", "아직 잘 모르겠다"];
const neededThings = ["정보", "안전망", "응원", "계획", "연결"];
const interests = ["활동소식", "보험상담", "채용/이직"];

function pick(arr, seed) {
  return arr[seed % arr.length];
}

function payload(i) {
  const phone = OVERRIDE_PHONE || `010${String(10000000 + (i % 89999999)).padStart(8, "0")}`;
  return {
    name: `loadtest-${i}`,
    phone,
    concern: pick(concerns, i),
    protectTarget: pick(protectTargets, i * 3 + 1),
    neededThing: pick(neededThings, i * 7 + 2),
    interests: i % 2 === 0 ? [pick(interests, i)] : [],
    userAgent: "loadtest-submit-script/1.0"
  };
}

function percentile(sorted, p) {
  if (sorted.length === 0) {
    return 0;
  }
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[idx];
}

async function singleRequest(i) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const started = Date.now();

  try {
    const query = VERCEL_BYPASS_SECRET
      ? `?x-vercel-protection-bypass=${encodeURIComponent(VERCEL_BYPASS_SECRET)}&x-vercel-set-bypass-cookie=true`
      : "";
    const res = await fetch(`${BASE_URL}/api/submit${query}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-idempotency-key": randomUUID()
      },
      body: JSON.stringify(payload(i)),
      signal: controller.signal
    });
    const elapsed = Date.now() - started;
    const ok = res.status >= 200 && res.status < 300;
    return { elapsed, status: res.status, ok };
  } catch (err) {
    const elapsed = Date.now() - started;
    return { elapsed, status: 0, ok: false, error: err instanceof Error ? err.message : "fetch_error" };
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const latencies = [];
  const statusCounts = new Map();
  let sent = 0;
  let failed = 0;
  let cursor = 0;
  const start = Date.now();

  async function worker() {
    while (true) {
      const i = cursor;
      cursor += 1;
      if (i >= TOTAL) {
        return;
      }
      const result = await singleRequest(i);
      latencies.push(result.elapsed);
      statusCounts.set(result.status, (statusCounts.get(result.status) ?? 0) + 1);
      if (result.ok) {
        sent += 1;
      } else {
        failed += 1;
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);
  const durationSec = (Date.now() - start) / 1000;
  latencies.sort((a, b) => a - b);

  console.log(JSON.stringify({
    baseUrl: BASE_URL,
    total: TOTAL,
    concurrency: CONCURRENCY,
    durationSec: Number(durationSec.toFixed(2)),
    rps: Number((TOTAL / durationSec).toFixed(2)),
    success: sent,
    failed,
    p50ms: percentile(latencies, 50),
    p95ms: percentile(latencies, 95),
    p99ms: percentile(latencies, 99),
    statusCounts: Object.fromEntries(statusCounts)
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
