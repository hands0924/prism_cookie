import { getAdminSubmissions } from "@/lib/admin-submissions";
import { isAuthorizedAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvEscape(value: unknown): string {
  const text = typeof value === "string" ? value : value == null ? "" : JSON.stringify(value);
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

function toIsoOrNull(value: string | null, label: "from" | "to"): string | undefined {
  if (!value || value.trim().length === 0) {
    return undefined;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`invalid_${label}`);
  }
  return parsed.toISOString();
}

export async function GET(request: Request) {
  try {
    if (!isAuthorizedAdminRequest(request)) {
      return new Response("unauthorized", { status: 401 });
    }

    const url = new URL(request.url);
    const parsedLimit = Number(url.searchParams.get("limit") ?? "2000");
    const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(10000, Math.floor(parsedLimit))) : 2000;
    const from = toIsoOrNull(url.searchParams.get("from"), "from");
    const to = toIsoOrNull(url.searchParams.get("to"), "to");
    if (from && to && from > to) {
      return new Response("export_failed: invalid_period", { status: 400 });
    }

    const data = await getAdminSubmissions({ limit, from, to });

    const headers = [
      "id",
      "submitted_at",
      "source",
      "name",
      "phone",
      "concern",
      "protect_target",
      "needed_thing",
      "interests",
      "support_message",
      "generated_message",
      "send_status",
      "send_error",
      "share_image_key"
    ];

    const lines = [headers.join(",")];
    for (const row of data) {
      const interests = row.interests.join("|");
      const values = [
        row.id,
        row.submitted_at,
        row.source,
        row.name,
        row.phone,
        row.concern,
        row.protect_target,
        row.needed_thing,
        interests,
        row.support_message,
        row.generated_message,
        row.send_status,
        row.send_error,
        row.share_image_key
      ];
      lines.push(values.map(csvEscape).join(","));
    }

    const csv = `\uFEFF${lines.join("\n")}`;
    const fileRange = `${from ? from.slice(0, 10) : "all"}-${to ? to.slice(0, 10) : "latest"}`;
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="submissions-${fileRange}.csv"`
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_export_error";
    return new Response(`export_failed: ${message}`, { status: 500 });
  }
}
