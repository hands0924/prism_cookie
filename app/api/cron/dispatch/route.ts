import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { acquireDispatchLease, releaseDispatchLease } from "@/lib/dispatch-lease";
import { isAuthorizedJobRequest } from "@/lib/worker-auth";
import { processMessageJobs, processShareImageJobs, processSubmissionEvents } from "@/lib/workers";

export const runtime = "nodejs";

function clampInt(value: string | null, fallback: number, min: number, max: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.floor(num)));
}

async function run(req: Request) {
  if (!isAuthorizedJobRequest(req)) {
    return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const submissionBatch = clampInt(url.searchParams.get("submissionBatch"), 200, 10, 1000);
  const jobBatch = clampInt(url.searchParams.get("jobBatch"), 200, 10, 1000);
  const maxCycles = clampInt(url.searchParams.get("maxCycles"), 20, 1, 200);
  const budgetMs = clampInt(url.searchParams.get("budgetMs"), 9000, 500, 25000);
  const leaseTtlSeconds = clampInt(url.searchParams.get("leaseTtlSeconds"), 20, 5, 120);

  const holder = randomUUID();

  try {
    const acquired = await acquireDispatchLease(holder, leaseTtlSeconds);
    if (!acquired) {
      return NextResponse.json({
        success: true,
        skipped: "lease_not_acquired"
      });
    }

    const started = Date.now();
    let cycles = 0;
    let submissionCount = 0;
    let messageCount = 0;
    let imageCount = 0;

    while (cycles < maxCycles && Date.now() - started < budgetMs) {
      cycles += 1;
      const submissionResults = await processSubmissionEvents(submissionBatch);
      const [messageResults, imageResults] = await Promise.all([
        processMessageJobs(jobBatch),
        processShareImageJobs(jobBatch)
      ]);
      const drained =
        submissionResults.length + messageResults.length + imageResults.length;
      submissionCount += submissionResults.length;
      messageCount += messageResults.length;
      imageCount += imageResults.length;
      if (drained === 0) {
        break;
      }
    }

    return NextResponse.json({
      success: true,
      cycles,
      elapsedMs: Date.now() - started,
      processed: {
        submissions: submissionCount,
        messages: messageCount,
        images: imageCount
      }
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "cron_dispatch_failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  } finally {
    try {
      await releaseDispatchLease(holder);
    } catch (releaseErr) {
      console.error("dispatch_lease_release_failed", releaseErr);
    }
  }
}

export async function GET(req: Request) {
  return run(req);
}

export async function POST(req: Request) {
  return run(req);
}
