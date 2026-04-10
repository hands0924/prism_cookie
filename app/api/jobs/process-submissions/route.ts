import { NextResponse } from "next/server";
import { isAuthorizedJobRequest } from "@/lib/worker-auth";
import { processSubmissionEvents } from "@/lib/workers";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isAuthorizedJobRequest(req)) {
    return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const batchParam = Number(url.searchParams.get("batch") ?? "50");
  const batch = Number.isFinite(batchParam) && batchParam > 0 ? Math.min(Math.floor(batchParam), 200) : 50;

  try {
    const results = await processSubmissionEvents(batch);
    return NextResponse.json({ success: true, processed: results.length, results });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "submission_worker_error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
