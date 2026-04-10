# Repo QA Skill (prism_cookie)

Use this skill when you need a consistent quality gate before merge, release, or handoff.

## Goal
- Run repository-specific QA checks in a repeatable order.
- Report pass/fail with actionable failure details.
- Align with release-quality expectations for this repo.

## Required Checks In This Repo
- `typecheck`
- `lint`
- `tests`
- `smoke`

These map to:
- `npm run typecheck`
- `npm run lint`
- `npm run tests`
- `npm run smoke`

Optional release/evaluator gate:
- Run `.codex/skills/harness-loop/SKILL.md` evaluator step

## Preflight
1. Ensure dependencies are installed: `npm install`.
2. Confirm env setup:
- `.env.local` exists (copy from `.env.example` if needed).
- `SMOKE_BASE_URL` is optional; if unset, smoke runs static checks only.
3. Run from repository root.

## Execution Order
Run checks in this order to fail fast while still matching repo expectations:

1. `npm run lint`
2. `npm run tests`
3. `npm run typecheck`
4. `npm run smoke`

If evaluating a sprint promotion, then run:
5. Harness evaluator skill workflow (`.codex/skills/harness-loop/SKILL.md`)

## Interpretation Rules
- A command returning non-zero is a QA failure.
- `smoke` without `SMOKE_BASE_URL` is valid (static smoke mode).
- Evaluator gate can fail by design until the evaluator report is updated with passing rubric/check statuses.

## Output Format
Report results as:

- `lint`: pass|fail
- `tests`: pass|fail
- `typecheck`: pass|fail
- `smoke`: pass|fail
- `evaluator_gate`: pass|fail|not_run
- `summary`: one sentence with blockers, if any

When failures occur, include:
- failing command
- first concrete error
- likely owner file/path
- next fix step

## Repo-Specific Notes
- Smoke asserts required worker/route files and checks key implementation strings in:
  - `app/api/submit/route.ts`
  - `app/api/cron/dispatch/route.ts`
  - `app/r/[submissionId]/route.ts`
  - `lib/workers.ts`
- Evaluator gate uses:
  - `.codex/skills/harness-loop/references/rubric.json`
  - `.codex/skills/harness-loop/artifacts/evaluator-report.json`
  and blocks on:
  - any rubric score below threshold
  - any open `P0` or `P1`
  - any required check not equal to `pass`

## Recommended Command Block
```bash
npm run lint \
  && npm run tests \
  && npm run typecheck \
  && npm run smoke
```

Sprint promotion check:
```bash
# Follow .codex/skills/harness-loop/SKILL.md evaluator gate
```
