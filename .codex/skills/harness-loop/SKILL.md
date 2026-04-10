# Harness Loop Skill (prism_cookie)

Use this skill to run the repository harness as a Codex-native builder/evaluator loop.

## Goal
- Replace legacy `harness/` scripts with a skill-driven workflow.
- Keep sprint execution and promotion decisions auditable.
- Enforce a consistent evaluator gate before release.

## Inputs
- `plan.md`
- `sprint.md`
- `.codex/skills/harness-loop/references/rubric.json`
- `.codex/skills/harness-loop/references/builder-template.md`
- `.codex/skills/harness-loop/references/evaluator-template.md`
- Current repository state

## Artifacts
- `.codex/skills/harness-loop/artifacts/product-spec.md`
- `.codex/skills/harness-loop/artifacts/sprint-backlog.md`
- `.codex/skills/harness-loop/artifacts/builder-report.md`
- `.codex/skills/harness-loop/artifacts/evaluator-report.md`
- `.codex/skills/harness-loop/artifacts/evaluator-report.json`
- `.codex/skills/harness-loop/artifacts/decision-log.md`
- `.codex/skills/harness-loop/artifacts/release-checklist.md`

## Workflow
1. Builder pass:
- Use `references/builder-template.md`.
- Implement the highest-priority sprint items.
- Update `artifacts/builder-report.md` with completed work, checks run, and remaining risks.

2. Evaluator pass:
- Use `references/evaluator-template.md`.
- Score each rubric category from 0-5.
- Record findings with severities (`P0`, `P1`, `P2`, `P3`).
- Update both:
  - `artifacts/evaluator-report.md` (human-readable)
  - `artifacts/evaluator-report.json` (machine-readable)

3. Gate decision:
- Gate is `PASS` only if:
  - every rubric score meets `min_pass_score`
  - `open_issues.p0 === 0`
  - `open_issues.p1 === 0`
  - required checks (`typecheck`, `lint`, `tests`, `smoke`) are all `pass`
- Otherwise gate is `FAIL` and sprint is not promotable.

## Required QA Commands
- `npm run lint`
- `npm run tests`
- `npm run typecheck`
- `npm run smoke`

## Output Contract
Always report:
- `builder_status`: done|partial
- `evaluator_gate`: PASS|FAIL
- `blocking_findings`: count + IDs
- `next_action`: single concrete next step
