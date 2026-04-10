const BASE_URL = process.env.LOADTEST_BASE_URL ?? "http://localhost:3000";
const TOTAL = Number(process.env.LOADTEST_TOTAL ?? "120");
const CONCURRENCY = Number(process.env.LOADTEST_CONCURRENCY ?? "20");
const TIMEOUT_MS = Number(process.env.LOADTEST_TIMEOUT_MS ?? "15000");
const PHONE = process.env.LOADTEST_PHONE ?? "01000000000";
const PROVIDED_SUBMISSION_ID = process.env.LOADTEST_SHARE_SUBMISSION_ID ?? "";

function percentile(values, p) {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const startedAt = Date.now();
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return { response, ms: Date.now() - startedAt };
  } finally {
    clearTimeout(timer);
  }
}

async function ensureSubmissionId() {
  if (PROVIDED_SUBMISSION_ID) {
    return PROVIDED_SUBMISSION_ID;
  }

  const payload = {
    name: "Share Loadtest",
    phone: PHONE,
    concern: "건강이 무너질 때",
    protectTarget: "나 자신",
    neededThing: "응원",
    interests: ["활동소식"],
    privacyConsent: true,
    supportMessage: "share route warmup",
    userAgent: "share-loadtest"
  };

  const { response } = await fetchWithTimeout(`${BASE_URL}/api/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-idempotency-key": crypto.randomUUID()
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`seed_submit_failed:${response.status}`);
  }

  const json = await response.json();
  if (!json?.submissionId) {
    throw new Error("seed_submit_missing_submission_id");
  }
  return json.submissionId;
}

async function runPath(path, total, concurrency) {
  let nextIndex = 0;
  let success = 0;
  let failed = 0;
  const latencies = [];
  const statusCounts = {};

  async function worker() {
    while (true) {
      const index = nextIndex++;
      if (index >= total) {
        return;
      }

      try {
        const { response, ms } = await fetchWithTimeout(`${BASE_URL}${path}`, { cache: "no-store" });
        statusCounts[response.status] = (statusCounts[response.status] ?? 0) + 1;
        latencies.push(ms);
        if (response.ok) {
          success += 1;
        } else {
          failed += 1;
        }
      } catch {
        failed += 1;
        statusCounts.abort = (statusCounts.abort ?? 0) + 1;
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  return {
    total,
    success,
    failed,
    failureRatePct: Number(((failed / total) * 100).toFixed(2)),
    p50ms: percentile(latencies, 50),
    p95ms: percentile(latencies, 95),
    p99ms: percentile(latencies, 99),
    statusCounts
  };
}

async function waitUntilReady(path, attempts = 10, pauseMs = 250) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const { response } = await fetchWithTimeout(`${BASE_URL}${path}`, { cache: "no-store" });
      if (response.ok) {
        return;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, pauseMs));
  }
  throw new Error(`path_not_ready:${path}`);
}

async function main() {
  const submissionId = await ensureSubmissionId();
  const pagePath = `/r/${submissionId}`;
  const imagePath = `/api/og/${submissionId}`;

  await waitUntilReady(pagePath);
  await waitUntilReady(imagePath);

  const [sharePage, ogImage] = await Promise.all([
    runPath(pagePath, TOTAL, CONCURRENCY),
    runPath(imagePath, TOTAL, CONCURRENCY)
  ]);

  console.log(
    JSON.stringify(
      {
        baseUrl: BASE_URL,
        submissionId,
        total: TOTAL,
        concurrency: CONCURRENCY,
        timeoutMs: TIMEOUT_MS,
        sharePage,
        ogImage
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        error: error instanceof Error ? error.message : String(error)
      },
      null,
      2
    )
  );
  process.exit(1);
});
