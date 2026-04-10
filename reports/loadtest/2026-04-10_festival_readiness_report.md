# 2026 Seoul Queer Culture Festival Load Test Report

## Scope
- Runtime stack: Vercel + Supabase + SOLAPI integration enabled
- Production deployment tested: `https://prismcookie-rkt3t6ivg-hyunsungkims-projects.vercel.app`
- Deployment protection: SSO disabled for test execution
- Safety setting for submit load: `LOADTEST_PHONE=00000000` (to avoid real recipient blasts)

## Baseline
- Snapshot before scenarios: `reports/loadtest/00_baseline_ops.json`
- Snapshot after stale-processing reset: `reports/loadtest/00b_post_reset_ops.json`
- Final snapshot after all scenarios: `reports/loadtest/05_post_ops.json`

## Scenario Results

### 1) Smoke (arrival model)
- Command profile: `5 rps x 20s`, mix `landing 70% / submit 25% / result 5%`
- Result file: `reports/loadtest/01_smoke_arrival.json`
- Outcome:
  - Total: 100 requests
  - Failure rate: 0%
  - Overall p95: 927ms
  - Submit p95: 1047ms

### 2) Burst (arrival model)
- Command profile: `20 rps x 10s, 40 rps x 10s, 60 rps x 10s`, same endpoint mix
- Result file: `reports/loadtest/02_burst_arrival.json`
- Outcome:
  - Total: 1200 requests
  - Failure rate: 0%
  - Overall p95: 873ms
  - Submit p95: 1259ms
  - Submit p99: 1534ms

### 3) Sustained (arrival model)
- Command profile: `25 rps x 120s`, same endpoint mix
- Result file: `reports/loadtest/03_sustained_arrival.json`
- Outcome:
  - Total: 3000 requests
  - Failure rate: 0%
  - Overall p95: 830ms
  - Submit p95: 890ms
  - Submit p99: 1129ms

### 4) Drain worker stability
- Command profile A: `2 cycles`, `batch=50`
- Result file: `reports/loadtest/04b_drain_2cycles.json`
- Outcome:
  - Calls: 6
  - Failure rate: 16.67% (`500` on send-message route observed)
  - Message worker p50/p95: 7139ms (small sample)
  - Processed message jobs: 50

- Command profile B (single-cycle sanity): `1 cycle`, `batch=20`
- Result file: `reports/loadtest/04_drain_short.json`
- Outcome:
  - Failure rate: 33.33% (`500` on send-message route)

## Operational Findings

1. Frontdoor request handling is stable under tested arrival load.
- `landing`, `submit`, and `result` all stayed at 200 in the arrival scenarios.
- Measured latency meets the proposed “minimum pass” line for the tested scale.

2. Worker path is not stable enough yet for event-grade reliability.
- `/api/jobs/send-message` intermittently returns `500`.
- Runtime logs show repeated `500` on send-message while sibling worker routes return `200`.

3. Queue recovery behavior is currently risky.
- Final ops snapshot shows high counts in `PROCESSING` states across queue tables, indicating stuck work after failures/timeouts.
- This pattern can starve retriable work during real spikes unless stale `PROCESSING` rows are reclaimed automatically.

## Go / No-Go

- API ingress (`submit/result`) only: **Conditional Go**
- Full event flow including async message/image workers: **No-Go (current state)**

Reason:
- Worker failure rate is non-zero and queue jobs can remain in `PROCESSING`, which is a hard operational risk for festival spikes.

## Most Realistic Next Actions (Priority)

1. Add stale-processing reaper (must-have before event)
- Periodically move old `PROCESSING` rows back to `PENDING` with bounded retry logic.
- Include age threshold + max attempts + last_error tagging.

2. Make send-message worker resilient
- Wrap provider/network errors with explicit timeout + classify retryable/non-retryable failures.
- Add circuit-breaker behavior under provider degradation.

3. Isolate “submit SLO” from worker backlog
- Keep submit success path decoupled from immediate dispatch pressure.
- Maintain strict request timeout budget and move heavy drain to dedicated job runners.

4. Repeat festival suite after fixes
- Re-run burst and sustained with same arrival profiles.
- Add at least one high-burst stage (`100+ rps`) and confirm:
  - failure rate < 1%
  - no stuck `PROCESSING` accumulation
  - deterministic queue recovery
