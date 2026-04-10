import { NextResponse } from "next/server";
import { isAuthorizedOpsRequest } from "@/lib/ops-auth";
import { getOpsSnapshot } from "@/lib/ops";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!isAuthorizedOpsRequest(req)) {
    return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const snapshot = await getOpsSnapshot();
    return NextResponse.json({ success: true, snapshot });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ops_summary_failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
