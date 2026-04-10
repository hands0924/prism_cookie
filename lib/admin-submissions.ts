import { extractSupportMessageFromUserAgent, isMissingSupportMessageColumnError } from "@/lib/support-message";
import { getServiceSupabaseClient } from "@/lib/supabase";

export type AdminSubmission = {
  id: string;
  submitted_at: string;
  source: string;
  name: string;
  phone: string;
  concern: string;
  protect_target: string;
  needed_thing: string;
  interests: string[];
  support_message: string;
  generated_message: string;
  send_status: "PENDING" | "SENT" | "FAILED";
  send_error: string | null;
  share_image_key: string | null;
};

type AdminSubmissionQuery = {
  limit: number;
  offset?: number;
  from?: string;
  to?: string;
};

type SupabaseErrorLike = { message?: string; details?: string } | null;
type GenericRow = Record<string, unknown>;

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeInterests(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function normalizeSupportMessage(value: unknown, userAgent: unknown): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return extractSupportMessageFromUserAgent(typeof userAgent === "string" ? userAgent : "");
}

function toIsoOrThrow(label: "from" | "to", value: string | undefined): string | undefined {
  if (!value || value.trim().length === 0) {
    return undefined;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`invalid_${label}`);
  }
  return parsed.toISOString();
}

function normalizeQuery(input: number | AdminSubmissionQuery): {
  limit: number;
  offset: number;
  fromIso?: string;
  toIso?: string;
} {
  const query = typeof input === "number" ? { limit: input } : input;
  const limit = Math.max(1, Math.min(10000, Math.floor(query.limit)));
  const offsetValue = query.offset ?? 0;
  const offset = Number.isFinite(offsetValue) ? Math.max(0, Math.floor(offsetValue)) : 0;
  const fromIso = toIsoOrThrow("from", query.from);
  const toIso = toIsoOrThrow("to", query.to);
  if (fromIso && toIso && fromIso > toIso) {
    throw new Error("invalid_period");
  }
  return { limit, offset, fromIso, toIso };
}

function toAdminSubmission(row: GenericRow): AdminSubmission {
  const sendStatus = asString(row.send_status);
  return {
    id: asString(row.id),
    submitted_at: asString(row.submitted_at),
    source: asString(row.source),
    name: asString(row.name),
    phone: asString(row.phone),
    concern: asString(row.concern),
    protect_target: asString(row.protect_target),
    needed_thing: asString(row.needed_thing),
    interests: normalizeInterests(row.interests),
    support_message: normalizeSupportMessage(row.support_message, row.user_agent),
    generated_message: asString(row.generated_message),
    send_status: sendStatus === "SENT" || sendStatus === "FAILED" ? sendStatus : "PENDING",
    send_error: typeof row.send_error === "string" ? row.send_error : null,
    share_image_key: typeof row.share_image_key === "string" ? row.share_image_key : null
  };
}

export async function getAdminSubmissions(input: number | AdminSubmissionQuery): Promise<AdminSubmission[]> {
  const supabase = getServiceSupabaseClient();
  const query = normalizeQuery(input);

  let withSupportQuery = supabase
    .from("submissions")
    .select(
      "id, submitted_at, source, name, phone, concern, protect_target, needed_thing, interests, support_message, generated_message, send_status, send_error, share_image_key, user_agent"
    )
    .order("submitted_at", { ascending: false });

  if (query.fromIso) {
    withSupportQuery = withSupportQuery.gte("submitted_at", query.fromIso);
  }
  if (query.toIso) {
    withSupportQuery = withSupportQuery.lte("submitted_at", query.toIso);
  }

  const withSupport = query.offset > 0
    ? await withSupportQuery.range(query.offset, query.offset + query.limit - 1)
    : await withSupportQuery.limit(query.limit);

  let rows = withSupport.data as GenericRow[] | null;
  let error = withSupport.error as SupabaseErrorLike;

  if (isMissingSupportMessageColumnError(error)) {
    let fallbackQuery = supabase
      .from("submissions")
      .select(
        "id, submitted_at, source, name, phone, concern, protect_target, needed_thing, interests, generated_message, send_status, send_error, share_image_key, user_agent"
      )
      .order("submitted_at", { ascending: false });

    if (query.fromIso) {
      fallbackQuery = fallbackQuery.gte("submitted_at", query.fromIso);
    }
    if (query.toIso) {
      fallbackQuery = fallbackQuery.lte("submitted_at", query.toIso);
    }

    const fallback = query.offset > 0
      ? await fallbackQuery.range(query.offset, query.offset + query.limit - 1)
      : await fallbackQuery.limit(query.limit);

    rows = fallback.data
      ? (fallback.data as GenericRow[]).map((row) => ({
          ...row,
          support_message: extractSupportMessageFromUserAgent(asString(row.user_agent))
        }))
      : null;
    error = fallback.error as SupabaseErrorLike;
  }

  if (error) {
    throw error;
  }

  return (rows ?? []).map(toAdminSubmission);
}
