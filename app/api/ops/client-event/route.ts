import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const eventSchema = z.object({
  eventType: z.enum([
    "share_asset_prepare_failed",
    "image_save_failed",
    "system_share_failed",
    "instagram_share_prepare_failed"
  ]),
  submissionId: z.string().uuid().nullable().optional(),
  userAgent: z.string().min(1).max(1000).optional(),
  detail: z.record(z.string(), z.unknown()).default({})
});

export async function POST(request: Request) {
  try {
    const payload = eventSchema.parse(await request.json());
    console.error("[client-event]", JSON.stringify(payload));
    return new Response(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid_client_event";
    return new Response(message, { status: 400 });
  }
}

