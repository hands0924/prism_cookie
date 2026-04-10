import { randomUUID } from "node:crypto";

const BASE_URL = process.env.LOADTEST_BASE_URL ?? "http://localhost:3000";
const STAGES = process.env.LOADTEST_STAGES ?? "20x30";
const TIMEOUT_MS = Number(process.env.LOADTEST_TIMEOUT_MS ?? "15000");
const MAX_IN_FLIGHT = Number(process.env.LOADTEST_MAX_IN_FLIGHT ?? "2000");
const PHONE = process.env.LOADTEST_PHONE ?? "00000000";
const USER_AGENT = "loadtest-arrival/1.0";

const concerns = ["아플 때", "가족/파트너 문제", "일이 끊길 때", "노후", "갑작스러운 사고"];
const protectTargets = ["나 자신", "파트너", "가족", "반려동물", "아직 잘 모르겠다"];
const neededThings = ["정보", "안전망", "응원", "계획", "연결"];
const interests = ["활동소식", "보험상담", "채용/이직"];

const endpointWeights = {
  landing: Number(process.env.LOADTEST_WEIGHT_LANDING ?? "70"),
  submit: Number(process.env.LOADTEST_WEIGHT_SUBMIT ?? "25"),
  result: Number(process.env.LOADTEST_WEIGHT_RESULT ?? "5")
};

const submissionIds = [];

function pick(arr, seed) {
  return arr[seed % arr.length];
}

function percentile(sorted, p) {
  if (sorted.length === 0) {
    return 0;
  }
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[idx];
}

function buildPayload(i) {
  return {
    name: `arrival-${i}`,
    phone: PHONE,
    concern: pick(concerns, i),
    protectTarget: pick(protectTargets, i * 3 + 1),
    neededThing: pick(neededThings, i * 7 + 2),
    interests: i % 2 === 0 ? [pick(interests, i)] : [],
    userAgent: USER_AGENT
  };
}

function parseStages(raw) {
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((stage) => {
      const [rpsRaw, secRaw] = stage.split("x");
      const rps = Number(rpsRaw);
      const seconds = Number(secRaw);
      if (!Number.isFinite(rps) || !Number.isFinite(seconds) || rps <= 0 || seconds <= 0) {
        throw new Error(`invalid_stage:${stage}`);
      }
      return { rps, seconds };
    });
}

function chooseEndpoint(seed) {
  const total = endpointWeights.landing + endpointWeights.submit + endpointWeights.result;
  if (total <= 0) {
    return "landing";
  }
  const n = seed % total;
  if (n < endpointWeights.landing) {
    return "landing";
  }
  if (n < endpointWeights.landing + endpointWeights.submit) {
    return "submit";
  }
  return "result";
}

async function singleRequest(kind, i) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const started = Date.now();

  try {
    if (kind === "landing") {
      const res = await fetch(`${BASE_URL}/`, {
        headers: { "user-agent": USER_AGENT },
        signal: controller.signal
      });
      return { kind, status: res.status, ok: res.ok, elapsed: Date.now() - started };
    }

    if (kind === "submit") {
      const res = await fetch(`${BASE_URL}/api/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-idempotency-key": randomUUID()
        },
        body: JSON.stringify(buildPayload(i)),
        signal: controller.signal
      });
      const elapsed = Date.now() - started;
      let body = null;
      try {
        body = await res.json();
      } catch {
        body = null;
      }
      if (res.ok && body?.submissionId) {
        submissionIds.push(body.submissionId);
      }
      return { kind, status: res.status, ok: res.ok, elapsed };
    }

    const id = submissionIds.length > 0 ? submissionIds[i % submissionIds.length] : null;
    if (!id) {
      const res = await fetch(`${BASE_URL}/`, {
        headers: { "user-agent": USER_AGENT },
        signal: controller.signal
      });
      return { kind: "landing", status: res.status, ok: res.ok, elapsed: Date.now() - started };
    }

    const res = await fetch(`${BASE_URL}/r/${id}`, {
      headers: { "user-agent": USER_AGENT },
      signal: controller.signal
    });
    return { kind, status: res.status, ok: res.ok, elapsed: Date.now() - started };
  } catch (err) {
    return {
      kind,
      status: 0,
      ok: false,
      elapsed: Date.now() - started,
      error: err instanceof Error ? err.message : "fetch_error"
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runStage(stage, stageIndex, metrics, requestCursor) {
  const intervalMs = 1000 / stage.rps;
  const stageStart = Date.now();
  let nextDue = stageStart;
  let issued = 0;
  const inFlight = new Set();

  while (Date.now() - stageStart < stage.seconds * 1000) {
    const now = Date.now();
    if (now < nextDue) {
      await sleep(Math.min(nextDue - now, 25));
      continue;
    }

    const i = requestCursor.value;
    requestCursor.value += 1;
    issued += 1;
    const kind = chooseEndpoint(i + stageIndex);
    nextDue += intervalMs;

    const p = singleRequest(kind, i).then((result) => {
      metrics.total += 1;
      if (result.ok) {
        metrics.success += 1;
      } else {
        metrics.failed += 1;
      }
      metrics.latencies.push(result.elapsed);
      metrics.endpointLatencies[result.kind].push(result.elapsed);
      metrics.statusCounts[result.status] = (metrics.statusCounts[result.status] ?? 0) + 1;
      metrics.endpointCounts[result.kind] = (metrics.endpointCounts[result.kind] ?? 0) + 1;
      if (!result.ok) {
        metrics.endpointFailures[result.kind] = (metrics.endpointFailures[result.kind] ?? 0) + 1;
      }
    });
    inFlight.add(p);
    p.finally(() => inFlight.delete(p));

    if (inFlight.size >= MAX_IN_FLIGHT) {
      await Promise.race(inFlight);
    }
  }

  await Promise.all(inFlight);
  return issued;
}

async function main() {
  const stages = parseStages(STAGES);
  const started = Date.now();
  const metrics = {
    total: 0,
    success: 0,
    failed: 0,
    latencies: [],
    endpointLatencies: {
      landing: [],
      submit: [],
      result: []
    },
    statusCounts: {},
    endpointCounts: {},
    endpointFailures: {}
  };
  const requestCursor = { value: 0 };
  const stageSummaries = [];

  for (let idx = 0; idx < stages.length; idx += 1) {
    const stage = stages[idx];
    const issued = await runStage(stage, idx, metrics, requestCursor);
    stageSummaries.push({
      index: idx + 1,
      rps: stage.rps,
      seconds: stage.seconds,
      issued
    });
  }

  metrics.latencies.sort((a, b) => a - b);
  for (const key of Object.keys(metrics.endpointLatencies)) {
    metrics.endpointLatencies[key].sort((a, b) => a - b);
  }

  const durationSec = (Date.now() - started) / 1000;
  const endpointStats = {};
  for (const key of Object.keys(metrics.endpointLatencies)) {
    const arr = metrics.endpointLatencies[key];
    endpointStats[key] = {
      count: metrics.endpointCounts[key] ?? 0,
      failed: metrics.endpointFailures[key] ?? 0,
      p50ms: percentile(arr, 50),
      p95ms: percentile(arr, 95),
      p99ms: percentile(arr, 99)
    };
  }

  console.log(
    JSON.stringify(
      {
        baseUrl: BASE_URL,
        stages,
        stageSummaries,
        durationSec: Number(durationSec.toFixed(2)),
        totalRequests: metrics.total,
        success: metrics.success,
        failed: metrics.failed,
        failureRatePct: metrics.total === 0 ? 0 : Number(((metrics.failed / metrics.total) * 100).toFixed(2)),
        achievedRps: durationSec > 0 ? Number((metrics.total / durationSec).toFixed(2)) : 0,
        p50ms: percentile(metrics.latencies, 50),
        p95ms: percentile(metrics.latencies, 95),
        p99ms: percentile(metrics.latencies, 99),
        statusCounts: metrics.statusCounts,
        endpointStats,
        submissionIdsCollected: submissionIds.length
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
