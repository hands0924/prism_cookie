const BASE_URL = process.env.LOADTEST_BASE_URL ?? "http://localhost:3000";
const WORKER_KEY = process.env.WORKER_API_KEY ?? "";
const CYCLES = Number(process.env.LOADTEST_DRAIN_CYCLES ?? "20");
const BATCH = Number(process.env.LOADTEST_DRAIN_BATCH ?? "100");
const PAUSE_MS = Number(process.env.LOADTEST_DRAIN_PAUSE_MS ?? "300");
const VERCEL_BYPASS_SECRET = process.env.LOADTEST_VERCEL_BYPASS_SECRET ?? "";

if (!WORKER_KEY) {
  console.error("Missing WORKER_API_KEY");
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function call(path) {
  const started = Date.now();
  const query = VERCEL_BYPASS_SECRET
    ? `x-vercel-protection-bypass=${encodeURIComponent(VERCEL_BYPASS_SECRET)}&x-vercel-set-bypass-cookie=true`
    : "";
  const suffix = query ? `?batch=${BATCH}&${query}` : `?batch=${BATCH}`;
  const res = await fetch(`${BASE_URL}${path}${suffix}`, {
    method: "POST",
    headers: {
      "x-worker-key": WORKER_KEY
    }
  });
  const json = await res.json().catch(() => ({}));
  return {
    elapsed: Date.now() - started,
    status: res.status,
    ok: res.ok,
    processed: json?.processed ?? 0
  };
}

function percentile(sorted, p) {
  if (sorted.length === 0) {
    return 0;
  }
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[idx];
}

async function main() {
  let totalSubmissionEvents = 0;
  let totalMessageJobs = 0;
  let totalImageJobs = 0;
  let totalCalls = 0;
  let failedCalls = 0;
  const statusCounts = new Map();
  const latencies = {
    submissions: [],
    messages: [],
    images: []
  };

  for (let i = 0; i < CYCLES; i += 1) {
    const [submissions, messages, images] = await Promise.all([
      call("/api/jobs/process-submissions"),
      call("/api/jobs/send-message"),
      call("/api/jobs/generate-image")
    ]);

    totalSubmissionEvents += submissions.processed;
    totalMessageJobs += messages.processed;
    totalImageJobs += images.processed;
    latencies.submissions.push(submissions.elapsed);
    latencies.messages.push(messages.elapsed);
    latencies.images.push(images.elapsed);

    for (const response of [submissions, messages, images]) {
      totalCalls += 1;
      statusCounts.set(response.status, (statusCounts.get(response.status) ?? 0) + 1);
      if (!response.ok) {
        failedCalls += 1;
      }
    }

    console.log(
      `[cycle ${i + 1}/${CYCLES}] events=${submissions.processed} messages=${messages.processed} images=${images.processed} statuses=${submissions.status}/${messages.status}/${images.status}`
    );

    await sleep(PAUSE_MS);
  }

  for (const key of Object.keys(latencies)) {
    latencies[key].sort((a, b) => a - b);
  }

  console.log(
    JSON.stringify(
      {
        baseUrl: BASE_URL,
        cycles: CYCLES,
        batch: BATCH,
        calls: totalCalls,
        failedCalls,
        failureRatePct: totalCalls === 0 ? 0 : Number(((failedCalls / totalCalls) * 100).toFixed(2)),
        statusCounts: Object.fromEntries(statusCounts),
        latencyMs: {
          submissions: {
            p50: percentile(latencies.submissions, 50),
            p95: percentile(latencies.submissions, 95),
            p99: percentile(latencies.submissions, 99)
          },
          messages: {
            p50: percentile(latencies.messages, 50),
            p95: percentile(latencies.messages, 95),
            p99: percentile(latencies.messages, 99)
          },
          images: {
            p50: percentile(latencies.images, 50),
            p95: percentile(latencies.images, 95),
            p99: percentile(latencies.images, 99)
          }
        },
        totals: {
          submissionEvents: totalSubmissionEvents,
          messageJobs: totalMessageJobs,
          imageJobs: totalImageJobs
        }
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
