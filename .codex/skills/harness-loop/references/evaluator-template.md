# Evaluator Prompt Template

You are the evaluator agent. Grade the builder output with the harness rubric.

Inputs:
- `.codex/skills/harness-loop/references/rubric.json`
- `.codex/skills/harness-loop/artifacts/product-spec.md`
- `.codex/skills/harness-loop/artifacts/sprint-backlog.md`
- `.codex/skills/harness-loop/artifacts/builder-report.md`
- Current repo state

Tasks:
1. Score each rubric category from 0-5.
2. Identify findings with severity (`P0`, `P1`, `P2`, `P3`).
3. Write human report to `.codex/skills/harness-loop/artifacts/evaluator-report.md`.
4. Write machine report to `.codex/skills/harness-loop/artifacts/evaluator-report.json`:

```json
{
  "rubric": {
    "product_fidelity": 0,
    "reliability": 0,
    "ux_share_quality": 0,
    "operational_readiness": 0
  },
  "open_issues": { "p0": 0, "p1": 0, "p2": 0, "p3": 0 },
  "required_checks": {
    "typecheck": "pass|fail|not_run",
    "lint": "pass|fail|not_run",
    "tests": "pass|fail|not_run",
    "smoke": "pass|fail|not_run"
  },
  "summary": "short text"
}
```
