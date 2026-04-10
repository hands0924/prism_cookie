# Prism Cookie (Festival-Ready Baseline)

Supabase + Vercel architecture designed for burst traffic:
- Hot path (`POST /api/submit`) is minimal: validate -> store submission -> enqueue `submission_events` -> return.
- Submit path is enqueue-first; worker drain happens in dedicated dispatcher loops.
- Optional sampled nudge (`SUBMIT_DISPATCH_NUDGE_MODULO`) triggers short dispatch runs between cron ticks.
- Heavy work is async fan-out:
  - `submission_events` -> counter updates + job creation
  - `message_jobs` -> SOLAPI send
  - `share_image_jobs` -> image generation + Storage upload
- Workers claim jobs with Postgres `FOR UPDATE SKIP LOCKED` RPC functions to support parallel scale-out.
- Dispatcher lease lock prevents thundering-herd overlaps when many triggers happen together.
- Automatic retry with exponential backoff and final `FAILED` after max attempts.
- Optional cron dispatcher endpoint exists for Pro plans or external schedulers.

## Setup
1. `cp .env.example .env.local`
2. Fill Supabase and SOLAPI secrets.
3. Run SQL migration: `supabase/migrations/0001_init.sql`
4. `npm install`
5. `npm run dev`

## Codex Harness Skills
- Harness is skill-first and lives under `.codex/skills/harness-loop/`.
- Use `.codex/skills/harness-loop/SKILL.md` for the builder/evaluator loop.
- Harness artifacts and rubric are stored in `.codex/skills/harness-loop/artifacts/` and `.codex/skills/harness-loop/references/`.

## Worker auth
- Internal job routes accept either:
  - `x-worker-key: <WORKER_API_KEY>`
  - `Authorization: Bearer <CRON_SECRET>` (for Vercel Cron)

## Routes
- `POST /api/submit`
- `POST /api/jobs/process-submissions`
- `POST /api/jobs/send-message`
- `POST /api/jobs/generate-image`
- `GET /api/cron/dispatch`
- `POST /api/cron/dispatch`
- `GET /r/[submissionId]`
- `GET /api/ops/summary`
- `GET /ops?key=YOUR_OPS_DASHBOARD_KEY`

## Ops Dashboard
- Browser dashboard: `/ops?key=...`
- JSON summary endpoint:
```bash
curl -H "x-ops-key: $OPS_DASHBOARD_KEY" "$BASE_URL/api/ops/summary"
```

## Load tests
- Submit burst:
```bash
LOADTEST_BASE_URL="https://YOUR_URL" LOADTEST_TOTAL=5000 LOADTEST_CONCURRENCY=80 npm run loadtest:submit
```
- Drain workers:
```bash
LOADTEST_BASE_URL="https://YOUR_URL" WORKER_API_KEY="$WORKER_API_KEY" LOADTEST_DRAIN_CYCLES=30 npm run loadtest:drain
```

## Dispatch Tuning
- `SUBMIT_DISPATCH_NUDGE_MODULO`
  - `8` means roughly 1 out of 8 submissions nudges dispatch.
  - Lower value => faster near-real-time drain, higher infra load.
  - Higher value => lower overhead, relies more on cron.
- `/api/cron/dispatch` query params:
  - `submissionBatch` (default `200`)
  - `jobBatch` (default `200`)
  - `maxCycles` (default `20`)
  - `budgetMs` (default `9000`)
  - `leaseTtlSeconds` (default `20`)
