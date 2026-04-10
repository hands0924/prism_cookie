# High-Traffic Architecture (Supabase + Vercel)

## Goals
- Sustain festival bursts without blocking user submit flow.
- Keep messaging and image generation reliable under load.
- Degrade gracefully when platform limits are approached.

## Request Flow
1. User submits form to `POST /api/submit`.
2. API writes only:
- `submissions` row
- `submission_events` row (PENDING)
3. API returns success immediately.
4. Post-response dispatcher runs immediately to process submission events and downstream jobs.

## Async Pipeline
- `submission_events` worker:
- increments aggregate counters
- enqueues `message_jobs` and `share_image_jobs`
- `message_jobs` worker:
- sends through SOLAPI
- writes status/metadata back to `submissions`
- `share_image_jobs` worker:
- generates share image (SVG baseline)
- uploads to Supabase Storage bucket `share-images`

All workers use claim RPCs (`FOR UPDATE SKIP LOCKED`) to safely scale horizontally.

## Scaling Strategy
- Vercel:
- Increase function concurrency naturally by platform autoscaling.
- Keep hot path work constant-time and short.
- Use immediate post-response dispatch on each submit for low latency.
- Optional: add minute cron dispatcher on Pro plan to recover retries/backlogs independently.
- Supabase:
- Use service-role server-side access only.
- Minimize hot path writes.
- Process expensive fan-out asynchronously.
- Claiming + retry/backoff prevents thundering-herd reprocessing.

## Limit-Hit Behavior
- Submit API detects capacity-like failures and returns `503` with `Retry-After`.
- Async jobs retry with exponential backoff up to max attempts, then become `FAILED`.
- Failed jobs remain queryable for replay tooling/manual recovery.

## Operational Controls
- Worker authentication:
- `x-worker-key` for internal/manual runs
- `Authorization: Bearer <CRON_SECRET>` for Vercel Cron
- Edge/browser caching:
- Share page uses `Cache-Control: public, s-maxage=300, stale-while-revalidate=3600`
- Ops visibility:
- `/ops?key=...` dashboard and `/api/ops/summary` JSON snapshot
- Load testing:
- `npm run loadtest:submit` for hot-path pressure
- `npm run loadtest:drain` for async queue drain behavior

## Next Hardening Steps
- Add per-IP rate limiting in front of `POST /api/submit` (Vercel WAF/Bot Management + app-level keying).
- Add runbook endpoint/scripts for dead-letter replay.
