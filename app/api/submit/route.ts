import { randomUUID } from "node:crypto";
import { NextResponse, after } from "next/server";
import { ZodError } from "zod";
import { getBreadMeta } from "@/lib/bread";
import { generateFortuneMessage } from "@/lib/fortune";
import { buildShareSvg } from "@/lib/image";
import { composeOutboundMessage } from "@/lib/outbound-message";
import { normalizePhone } from "@/lib/phone";
import { sendSolapiText } from "@/lib/solapi";
import { submitSchema } from "@/lib/submit-schema";
import { embedSupportMessageInUserAgent, isMissingSupportMessageColumnError } from "@/lib/support-message";
import { getServiceSupabaseClient } from "@/lib/supabase";
import { processMessageJobs, processShareImageJobs, processSubmissionEvents } from "@/lib/workers";

export const runtime = "nodejs";

function isCapacityError(msg: string): boolean {
  return /(timeout|too many|connection|capacity|rate limit|temporarily unavailable)/i.test(msg);
}

function isPermanentMessageError(message: string): boolean {
  return /(phone_invalid|invalid|접수되지 못했습니다|failedmessagelist|유효하지|번호)/i.test(message);
}

async function ensureSubmissionEvent(submissionId: string) {
  const supabase = getServiceSupabaseClient();
  const { error } = await supabase.from("submission_events").upsert(
    {
      submission_id: submissionId,
      status: "PENDING"
    },
    { onConflict: "submission_id" }
  );
  if (error) {
    throw error;
  }
}

async function ensureFastLaneJobs(submissionId: string) {
  const supabase = getServiceSupabaseClient();
  const nowIso = new Date().toISOString();

  const { error: messageJobError } = await supabase.from("message_jobs").upsert(
    {
      submission_id: submissionId,
      provider: "solapi",
      status: "PENDING",
      next_retry_at: nowIso
    },
    { onConflict: "submission_id" }
  );
  if (messageJobError) {
    throw messageJobError;
  }

  const { error: imageJobError } = await supabase.from("share_image_jobs").upsert(
    {
      submission_id: submissionId,
      status: "PENDING",
      next_retry_at: nowIso
    },
    { onConflict: "submission_id" }
  );
  if (imageJobError) {
    throw imageJobError;
  }
}

async function runFastLaneDrain(
  submissionBatch: number,
  jobBatch: number,
  maxCycles: number,
  budgetMs: number
): Promise<void> {
  const deadline = Date.now() + budgetMs;
  let cycles = 0;

  while (cycles < maxCycles && Date.now() < deadline) {
    cycles += 1;
    const submissionResults = await processSubmissionEvents(submissionBatch);
    const [messageResults, imageResults] = await Promise.all([
      processMessageJobs(jobBatch),
      processShareImageJobs(jobBatch)
    ]);
    const drained = submissionResults.length + messageResults.length + imageResults.length;
    if (drained === 0) {
      break;
    }
  }
}

function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.floor(value)));
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  const timeoutMs = Number.isFinite(ms) && ms > 0 ? Math.floor(ms) : 4500;
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

type FastSubmission = {
  id: string;
  name: string;
  phone: string;
  neededThing: string;
  breadName: string;
  resultType: string;
  typeName: string;
  typeEmoji: string;
  typeDesc: string;
  shortDesc: string;
  interests: string[];
  generatedMessage: string;
};

async function processFastLaneForSubmission(input: FastSubmission) {
  const supabase = getServiceSupabaseClient();
  const timeoutMs = clampInt(Number(process.env.SUBMIT_FASTLANE_TIMEOUT_MS ?? "4500"), 1000, 5000, 4500);
  const nowIso = new Date().toISOString();

  const messageTask = withTimeout(
    sendSolapiText({
      to: input.phone,
      text: composeOutboundMessage({
        name: input.name,
        typeName: input.typeName,
        shortDesc: input.shortDesc,
        interests: input.interests
      })
    }),
    timeoutMs,
    "fast_message"
  )
    .then(async (providerResponse) => {
      await supabase
        .from("submissions")
        .update({
          send_status: "SENT",
          send_meta: providerResponse,
          send_error: null
        })
        .eq("id", input.id);

      await supabase
        .from("message_jobs")
        .update({
          status: "SENT",
          provider_response: providerResponse,
          last_error: null,
          updated_at: new Date().toISOString()
        })
        .eq("submission_id", input.id);
    })
    .catch(async (err) => {
      const message = err instanceof Error ? err.message : "fast_message_failed";
      const isFinal = isPermanentMessageError(message);
      await supabase
        .from("submissions")
        .update({
          send_status: isFinal ? "FAILED" : "PENDING",
          send_error: message
        })
        .eq("id", input.id);

      await supabase
        .from("message_jobs")
        .update({
          status: isFinal ? "FAILED" : "PENDING",
          last_error: message,
          next_retry_at: isFinal ? null : new Date(Date.now() + 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("submission_id", input.id);
    });

  const imageTask = withTimeout(
    supabase.storage
      .from("share-images")
      .upload(
        `${input.id}.svg`,
        new TextEncoder().encode(
          buildShareSvg({
            title: input.neededThing ? `${input.name}님의 결과: ${input.neededThing}` : `${input.name}님의 포춘쿠키 결과`,
            breadName: input.breadName,
            resultType: input.resultType,
            typeName: input.typeName,
            typeEmoji: input.typeEmoji,
            lines: input.generatedMessage
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
          })
        ),
        {
          contentType: "image/svg+xml",
          upsert: true
        }
      ),
    timeoutMs,
    "fast_image"
  )
    .then(async ({ error }) => {
      if (error) {
        throw error;
      }

      await supabase
        .from("submissions")
        .update({
          share_image_key: `${input.id}.svg`
        })
        .eq("id", input.id);

      await supabase
        .from("share_image_jobs")
        .update({
          status: "DONE",
          asset_path: `${input.id}.svg`,
          last_error: null,
          updated_at: new Date().toISOString()
        })
        .eq("submission_id", input.id);
    })
    .catch(async (err) => {
      const message = err instanceof Error ? err.message : "fast_image_failed";
      await supabase
        .from("share_image_jobs")
        .update({
          status: "PENDING",
          last_error: message,
          next_retry_at: new Date(Date.now() + 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("submission_id", input.id);
    });

  await Promise.allSettled([messageTask, imageTask]);

  await supabase
    .from("submission_events")
    .update({
      status: "DONE",
      last_error: null,
      updated_at: nowIso
    })
    .eq("submission_id", input.id)
    .eq("status", "PENDING");
}

export async function POST(req: Request) {
  try {
    const payload = submitSchema.parse(await req.json());
    const phone = normalizePhone(payload.phone);
    if (phone.length < 8) {
      return NextResponse.json({ success: false, error: "phone_invalid" }, { status: 400 });
    }

    const requestIdHeader = req.headers.get("x-idempotency-key")?.trim();
    const clientRequestId = requestIdHeader && requestIdHeader.length > 0 ? requestIdHeader : randomUUID();
    const supabase = getServiceSupabaseClient();

    const submissionId = randomUUID();
    const submittedAt = new Date().toISOString();
    const messageLines = generateFortuneMessage(payload);
    const messageText = messageLines.join("\n");
    const source = process.env.SOURCE_TAG ?? "queer-parade-2026";

    const baseInsert = {
      id: submissionId,
      client_request_id: clientRequestId,
      submitted_at: submittedAt,
      source,
      name: payload.name,
      phone,
      concern: payload.concern,
      protect_target: payload.protectTarget,
      needed_thing: payload.neededThing,
      interests: payload.interests,
      generated_message: messageText,
      user_agent: payload.userAgent,
      send_status: "PENDING"
    };

    const insertWithSupport = await supabase.from("submissions").insert({
      ...baseInsert,
      support_message: payload.supportMessage
    });

    let insertError = insertWithSupport.error;
    if (isMissingSupportMessageColumnError(insertError)) {
      const insertFallback = await supabase.from("submissions").insert({
        ...baseInsert,
        user_agent: embedSupportMessageInUserAgent(payload.userAgent, payload.supportMessage)
      });
      insertError = insertFallback.error;
    }

    if (insertError) {
      if (insertError.code === "23505") {
        const { data: replay, error: replayError } = await supabase
          .from("submissions")
          .select("id, name, concern, protect_target, generated_message")
          .eq("client_request_id", clientRequestId)
          .maybeSingle();
        if (!replayError && replay) {
          const replayMeta = getBreadMeta(replay.concern, replay.protect_target);
          await ensureSubmissionEvent(replay.id);
          return NextResponse.json({
            success: true,
            name: replay.name,
            message: replay.generated_message.split("\n"),
            submissionId: replay.id,
            breadName: replayMeta.breadName,
            resultType: replayMeta.resultType,
            typeName: replayMeta.typeName,
            typeEmoji: replayMeta.typeEmoji,
            typeDesc: replayMeta.typeDesc,
            replay: true
          });
        }
      }
      throw insertError;
    }

    await ensureSubmissionEvent(submissionId);
    await ensureFastLaneJobs(submissionId);

    const nudgeModulo = Math.max(1, Number(process.env.SUBMIT_DISPATCH_NUDGE_MODULO ?? "1"));
    const tailNibble = parseInt(submissionId.slice(-1), 16);
    const shouldNudge = nudgeModulo <= 1 || (Number.isFinite(tailNibble) && tailNibble % nudgeModulo === 0);
    if (shouldNudge) {
      after(async () => {
        try {
          const fastMeta = getBreadMeta(payload.concern, payload.protectTarget);
          await processFastLaneForSubmission({
            id: submissionId,
            name: payload.name,
            phone,
            neededThing: payload.neededThing,
            breadName: fastMeta.breadName,
            resultType: fastMeta.resultType,
            typeName: fastMeta.typeName,
            typeEmoji: fastMeta.typeEmoji,
            typeDesc: fastMeta.typeDesc,
            shortDesc: fastMeta.shortDesc,
            interests: payload.interests,
            generatedMessage: messageText
          });

          const maxCycles = clampInt(Number(process.env.SUBMIT_DISPATCH_MAX_CYCLES ?? "1"), 1, 20, 1);
          const budgetMs = clampInt(Number(process.env.SUBMIT_DISPATCH_BUDGET_MS ?? "4500"), 1000, 5000, 4500);
          const submissionBatch = clampInt(
            Number(process.env.SUBMIT_DISPATCH_SUBMISSION_BATCH ?? "1"),
            1,
            100,
            1
          );
          const jobBatch = clampInt(Number(process.env.SUBMIT_DISPATCH_JOB_BATCH ?? "1"), 1, 100, 1);
          await runFastLaneDrain(submissionBatch, jobBatch, maxCycles, budgetMs);
        } catch (err) {
          console.error("submit_dispatch_nudge_failed", err);
        }
      });
    }

    const responseMeta = getBreadMeta(payload.concern, payload.protectTarget);
    return NextResponse.json({
      success: true,
      name: payload.name,
      message: messageLines,
      submissionId,
      breadName: responseMeta.breadName,
      resultType: responseMeta.resultType,
      typeName: responseMeta.typeName,
      typeEmoji: responseMeta.typeEmoji,
      typeDesc: responseMeta.typeDesc
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ success: false, error: "validation_failed", issues: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "internal_error";
    if (isCapacityError(message)) {
      return NextResponse.json(
        { success: false, error: "capacity_limited", message: "잠시 후 다시 시도해주세요." },
        { status: 503, headers: { "Retry-After": "5" } }
      );
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
