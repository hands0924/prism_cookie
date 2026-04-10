import { getServiceSupabaseClient } from "@/lib/supabase";

type QueueStatus = "PENDING" | "PROCESSING" | "DONE" | "SENT" | "FAILED";

export type QueueSnapshot = {
  pending: number;
  processing: number;
  doneOrSent: number;
  failed: number;
  oldestPendingSeconds: number | null;
};

export type OpsSnapshot = {
  generatedAt: string;
  submissions: {
    total: number;
    last5m: number;
    sent: number;
    failed: number;
    pending: number;
  };
  submissionEvents: QueueSnapshot;
  messageJobs: QueueSnapshot;
  shareImageJobs: QueueSnapshot;
};

async function countByStatus(table: string, status: QueueStatus): Promise<number> {
  const supabase = getServiceSupabaseClient();
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true }).eq("status", status);
  if (error) {
    throw error;
  }
  return count ?? 0;
}

async function countSubmissionsByStatus(status: "PENDING" | "SENT" | "FAILED"): Promise<number> {
  const supabase = getServiceSupabaseClient();
  const { count, error } = await supabase
    .from("submissions")
    .select("*", { count: "exact", head: true })
    .eq("send_status", status);
  if (error) {
    throw error;
  }
  return count ?? 0;
}

async function countSubmissionsLast5m(): Promise<number> {
  const supabase = getServiceSupabaseClient();
  const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("submissions")
    .select("*", { count: "exact", head: true })
    .gte("submitted_at", since);
  if (error) {
    throw error;
  }
  return count ?? 0;
}

async function oldestPendingSeconds(table: string): Promise<number | null> {
  const supabase = getServiceSupabaseClient();
  const { data, error } = await supabase
    .from(table)
    .select("created_at")
    .eq("status", "PENDING")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!data?.created_at) {
    return null;
  }
  return Math.max(0, Math.floor((Date.now() - new Date(data.created_at).getTime()) / 1000));
}

async function buildQueueSnapshot(table: string, doneStatus: "DONE" | "SENT"): Promise<QueueSnapshot> {
  const [pending, processing, doneOrSent, failed, oldestPending] = await Promise.all([
    countByStatus(table, "PENDING"),
    countByStatus(table, "PROCESSING"),
    countByStatus(table, doneStatus),
    countByStatus(table, "FAILED"),
    oldestPendingSeconds(table)
  ]);

  return {
    pending,
    processing,
    doneOrSent,
    failed,
    oldestPendingSeconds: oldestPending
  };
}

export async function getOpsSnapshot(): Promise<OpsSnapshot> {
  const supabase = getServiceSupabaseClient();
  const [{ count: totalSubmissions, error: totalError }, last5m, sent, failed, pending, submissionEvents, messageJobs, shareImageJobs] =
    await Promise.all([
      supabase.from("submissions").select("*", { count: "exact", head: true }),
      countSubmissionsLast5m(),
      countSubmissionsByStatus("SENT"),
      countSubmissionsByStatus("FAILED"),
      countSubmissionsByStatus("PENDING"),
      buildQueueSnapshot("submission_events", "DONE"),
      buildQueueSnapshot("message_jobs", "SENT"),
      buildQueueSnapshot("share_image_jobs", "DONE")
    ]);

  if (totalError) {
    throw totalError;
  }

  return {
    generatedAt: new Date().toISOString(),
    submissions: {
      total: totalSubmissions ?? 0,
      last5m,
      sent,
      failed,
      pending
    },
    submissionEvents,
    messageJobs,
    shareImageJobs
  };
}
