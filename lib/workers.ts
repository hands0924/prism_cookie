import { getBreadMeta } from "@/lib/bread";
import { buildShareSvg } from "@/lib/image";
import { composeOutboundMessage } from "@/lib/outbound-message";
import { sendSolapiText } from "@/lib/solapi";
import { getServiceSupabaseClient } from "@/lib/supabase";

const MAX_ATTEMPTS = 5;
const RETRY_BASE_SECONDS = Number(process.env.WORKER_RETRY_BASE_SECONDS ?? "1");
const RETRY_MAX_SECONDS = Number(process.env.WORKER_RETRY_MAX_SECONDS ?? "60");
const MESSAGE_TIMEOUT_MS = Number(process.env.WORKER_MESSAGE_TIMEOUT_MS ?? "4500");
const IMAGE_TIMEOUT_MS = Number(process.env.WORKER_IMAGE_TIMEOUT_MS ?? "4500");
const MESSAGE_CONCURRENCY = Number(process.env.WORKER_MESSAGE_CONCURRENCY ?? "6");
const IMAGE_CONCURRENCY = Number(process.env.WORKER_IMAGE_CONCURRENCY ?? "6");

type ClaimedJob = {
  id: string;
  submission_id: string;
  attempt_count: number;
};

function nextRetryIso(attemptCount: number): string {
  const base = Number.isFinite(RETRY_BASE_SECONDS) && RETRY_BASE_SECONDS > 0 ? RETRY_BASE_SECONDS : 3;
  const max = Number.isFinite(RETRY_MAX_SECONDS) && RETRY_MAX_SECONDS > 0 ? RETRY_MAX_SECONDS : 900;
  const seconds = Math.min(base * 2 ** Math.max(attemptCount, 0), max);
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function isPermanentMessageError(message: string): boolean {
  return /(phone_invalid|invalid|접수되지 못했습니다|failedmessagelist|유효하지|번호)/i.test(message);
}

function safeConcurrency(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value < 1) {
    return fallback;
  }
  return Math.min(Math.floor(value), 20);
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  const timeoutMs = Number.isFinite(ms) && ms > 0 ? Math.floor(ms) : 12000;
  let timer: NodeJS.Timeout | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label}_timeout_${timeoutMs}ms`));
        }, timeoutMs);
      })
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }
  const concurrency = safeConcurrency(limit, 1);
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function run() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) {
        return;
      }
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => run()));
  return results;
}

function assertNoError(error: unknown, context: string) {
  if (!error) {
    return;
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) {
      throw new Error(`${context}: ${message}`);
    }
  }
  throw new Error(`${context}: unknown_error`);
}

async function incrementCounters(keys: string[]) {
  const supabase = getServiceSupabaseClient();
  for (const sk of keys) {
    const { error } = await supabase.rpc("increment_counter", {
      p_pk: "GLOBAL",
      p_sk: sk,
      p_delta: 1
    });
    if (error) {
      throw error;
    }
  }
}

export async function processSubmissionEvents(batch: number) {
  const supabase = getServiceSupabaseClient();
  const { data, error } = await supabase.rpc("claim_submission_events", {
    p_limit: batch
  });
  if (error) {
    throw error;
  }

  const jobs = (data ?? []) as ClaimedJob[];
  const results: Array<{ id: string; status: string; error?: string }> = [];

  for (const eventJob of jobs) {
    const { data: submission, error: subError } = await supabase
      .from("submissions")
      .select("id, concern, protect_target, needed_thing, interests")
      .eq("id", eventJob.submission_id)
      .single();

    if (subError || !submission) {
      const attempts = eventJob.attempt_count + 1;
      const isFinal = attempts >= MAX_ATTEMPTS;
      const { error: markRetryError } = await supabase
        .from("submission_events")
        .update({
          status: isFinal ? "FAILED" : "PENDING",
          attempt_count: attempts,
          last_error: subError?.message ?? "submission_not_found",
          next_retry_at: isFinal ? null : nextRetryIso(attempts),
          updated_at: new Date().toISOString()
        })
        .eq("id", eventJob.id);
      assertNoError(markRetryError, "mark_submission_event_retry");
      results.push({ id: eventJob.id, status: isFinal ? "FAILED" : "RETRY", error: "submission_not_found" });
      continue;
    }

    try {
      const interests = Array.isArray(submission.interests) ? submission.interests.filter(Boolean) : [];
      await incrementCounters([
        "total",
        `concern#${submission.concern}`,
        `protectTarget#${submission.protect_target}`,
        `neededThing#${submission.needed_thing}`,
        ...interests.map((value: string) => `interest#${value}`)
      ]);

      const { error: messageJobError } = await supabase.from("message_jobs").upsert(
        {
          submission_id: submission.id,
          provider: "solapi",
          status: "PENDING",
          next_retry_at: new Date().toISOString()
        },
        { onConflict: "submission_id" }
      );
      assertNoError(messageJobError, "upsert_message_job");

      const { error: imageJobError } = await supabase.from("share_image_jobs").upsert(
        {
          submission_id: submission.id,
          status: "PENDING",
          next_retry_at: new Date().toISOString()
        },
        { onConflict: "submission_id" }
      );
      assertNoError(imageJobError, "upsert_share_image_job");

      const { error: doneEventError } = await supabase
        .from("submission_events")
        .update({
          status: "DONE",
          last_error: null,
          updated_at: new Date().toISOString()
        })
        .eq("id", eventJob.id);
      assertNoError(doneEventError, "mark_submission_event_done");

      results.push({ id: eventJob.id, status: "DONE" });
    } catch (err) {
      const attempts = eventJob.attempt_count + 1;
      const isFinal = attempts >= MAX_ATTEMPTS;
      const message = err instanceof Error ? err.message : "submission_event_failed";
      const { error: failEventError } = await supabase
        .from("submission_events")
        .update({
          status: isFinal ? "FAILED" : "PENDING",
          attempt_count: attempts,
          last_error: message,
          next_retry_at: isFinal ? null : nextRetryIso(attempts),
          updated_at: new Date().toISOString()
        })
        .eq("id", eventJob.id);
      assertNoError(failEventError, "mark_submission_event_failed");
      results.push({ id: eventJob.id, status: isFinal ? "FAILED" : "RETRY", error: message });
    }
  }

  return results;
}

export async function processMessageJobs(batch: number) {
  const supabase = getServiceSupabaseClient();
  const { data, error } = await supabase.rpc("claim_message_jobs", { p_limit: batch });
  if (error) {
    throw error;
  }

  const jobs = (data ?? []) as ClaimedJob[];
  return await mapLimit(
    jobs,
    safeConcurrency(MESSAGE_CONCURRENCY, 4),
    async (job): Promise<{ id: string; status: string; error?: string }> => {
      const { data: submission, error: subError } = await supabase
        .from("submissions")
        .select("id, name, phone, concern, protect_target, interests, generated_message")
        .eq("id", job.submission_id)
        .single();

      if (subError || !submission) {
        const attempts = job.attempt_count + 1;
        const isFinal = attempts >= MAX_ATTEMPTS;
        const { error: markRetryError } = await supabase
          .from("message_jobs")
          .update({
            status: isFinal ? "FAILED" : "PENDING",
            attempt_count: attempts,
            last_error: subError?.message ?? "submission_not_found",
            next_retry_at: isFinal ? null : nextRetryIso(attempts),
            updated_at: new Date().toISOString()
          })
          .eq("id", job.id);
        if (markRetryError) {
          console.error("mark_message_job_retry_failed", markRetryError);
        }
        return { id: job.id, status: isFinal ? "FAILED" : "RETRY", error: "submission_not_found" };
      }

      try {
        const msgMeta = getBreadMeta(submission.concern, submission.protect_target);
        const providerResponse = await withTimeout(
          sendSolapiText({
            to: submission.phone,
            text: composeOutboundMessage({
              name: submission.name,
              typeName: msgMeta.typeName,
              shortDesc: msgMeta.shortDesc,
              interests: submission.interests
            })
          }),
          MESSAGE_TIMEOUT_MS,
          "send_message"
        );

        const { error: setSubmissionSentError } = await supabase
          .from("submissions")
          .update({
            send_status: "SENT",
            send_meta: providerResponse,
            send_error: null
          })
          .eq("id", submission.id);
        if (setSubmissionSentError) {
          console.error("set_submission_sent_failed", setSubmissionSentError);
        }

        const { error: setMessageSentError } = await supabase
          .from("message_jobs")
          .update({
            status: "SENT",
            provider_response: providerResponse,
            last_error: null,
            updated_at: new Date().toISOString()
          })
          .eq("id", job.id);
        if (setMessageSentError) {
          console.error("set_message_job_sent_failed", setMessageSentError);
        }

        return { id: job.id, status: "SENT" };
      } catch (err) {
        const attempts = job.attempt_count + 1;
        const message = err instanceof Error ? err.message : "send_failed";
        const isFinal = attempts >= MAX_ATTEMPTS || isPermanentMessageError(message);
        const { error: setSubmissionFailError } = await supabase
          .from("submissions")
          .update({
            send_status: isFinal ? "FAILED" : "PENDING",
            send_error: message
          })
          .eq("id", submission.id);
        if (setSubmissionFailError) {
          console.error("set_submission_send_failure_failed", setSubmissionFailError);
        }

        const { error: setMessageFailError } = await supabase
          .from("message_jobs")
          .update({
            status: isFinal ? "FAILED" : "PENDING",
            attempt_count: attempts,
            last_error: message,
            next_retry_at: isFinal ? null : nextRetryIso(attempts),
            updated_at: new Date().toISOString()
          })
          .eq("id", job.id);
        if (setMessageFailError) {
          console.error("set_message_job_failure_failed", setMessageFailError);
        }

        return { id: job.id, status: isFinal ? "FAILED" : "RETRY", error: message };
      }
    }
  );
}

export async function processShareImageJobs(batch: number) {
  const supabase = getServiceSupabaseClient();
  const { data, error } = await supabase.rpc("claim_share_image_jobs", { p_limit: batch });
  if (error) {
    throw error;
  }

  const jobs = (data ?? []) as ClaimedJob[];
  return await mapLimit(
    jobs,
    safeConcurrency(IMAGE_CONCURRENCY, 4),
    async (job): Promise<{ id: string; status: string; key?: string; error?: string }> => {
      const { data: submission, error: subError } = await supabase
        .from("submissions")
        .select("id, name, concern, protect_target, needed_thing, generated_message")
        .eq("id", job.submission_id)
        .single();

      if (subError || !submission) {
        const attempts = job.attempt_count + 1;
        const isFinal = attempts >= MAX_ATTEMPTS;
        const { error: markRetryError } = await supabase
          .from("share_image_jobs")
          .update({
            status: isFinal ? "FAILED" : "PENDING",
            attempt_count: attempts,
            last_error: subError?.message ?? "submission_not_found",
            next_retry_at: isFinal ? null : nextRetryIso(attempts),
            updated_at: new Date().toISOString()
          })
          .eq("id", job.id);
        if (markRetryError) {
          console.error("mark_share_image_job_retry_failed", markRetryError);
        }
        return { id: job.id, status: isFinal ? "FAILED" : "RETRY", error: "submission_not_found" };
      }

      const imgMeta = getBreadMeta(submission.concern, submission.protect_target);
      const title = `${submission.name}님의 미래 레시피`;
      const lines = submission.generated_message
        .split("\n")
        .map((line: string) => line.trim())
        .filter(Boolean);
      const svg = buildShareSvg({
        title,
        breadName: imgMeta.breadName,
        resultType: imgMeta.resultType,
        typeName: imgMeta.typeName,
        typeEmoji: imgMeta.typeEmoji,
        lines
      });
      const key = `${submission.id}.svg`;

      let uploadErrorMessage = "";
      try {
        const { error: uploadError } = await withTimeout(
          supabase.storage
            .from("share-images")
            .upload(key, new TextEncoder().encode(svg), {
              contentType: "image/svg+xml",
              upsert: true
            }),
          IMAGE_TIMEOUT_MS,
          "share_image_upload"
        );
        if (uploadError) {
          uploadErrorMessage = uploadError.message;
        }
      } catch (err) {
        uploadErrorMessage = err instanceof Error ? err.message : "share_image_upload_failed";
      }

      if (uploadErrorMessage) {
        const attempts = job.attempt_count + 1;
        const isFinal = attempts >= MAX_ATTEMPTS;
        const { error: markFailError } = await supabase
          .from("share_image_jobs")
          .update({
            status: isFinal ? "FAILED" : "PENDING",
            attempt_count: attempts,
            last_error: uploadErrorMessage,
            next_retry_at: isFinal ? null : nextRetryIso(attempts),
            updated_at: new Date().toISOString()
          })
          .eq("id", job.id);
        if (markFailError) {
          console.error("mark_share_image_job_failure_failed", markFailError);
        }
        return { id: job.id, status: isFinal ? "FAILED" : "RETRY", error: uploadErrorMessage };
      }

      const { error: setShareKeyError } = await supabase
        .from("submissions")
        .update({
          share_image_key: key
        })
        .eq("id", submission.id);
      if (setShareKeyError) {
        console.error("set_submission_share_image_key_failed", setShareKeyError);
      }

      const { error: setShareDoneError } = await supabase
        .from("share_image_jobs")
        .update({
          status: "DONE",
          asset_path: key,
          last_error: null,
          updated_at: new Date().toISOString()
        })
        .eq("id", job.id);
      if (setShareDoneError) {
        console.error("set_share_image_job_done_failed", setShareDoneError);
      }

      return { id: job.id, status: "DONE", key };
    }
  );
}
