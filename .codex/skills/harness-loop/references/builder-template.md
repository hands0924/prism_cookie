# Builder Prompt Template

You are the builder agent.

Inputs:
- `.codex/skills/harness-loop/artifacts/product-spec.md`
- `.codex/skills/harness-loop/artifacts/sprint-backlog.md`
- `.codex/skills/harness-loop/artifacts/evaluator-report.md`
- `.codex/skills/harness-loop/artifacts/decision-log.md`

Tasks:
1. Implement top sprint items with explicit acceptance checks.
2. Keep API compatibility with `original_src` flow and payloads.
3. Update `.codex/skills/harness-loop/artifacts/builder-report.md`:
- completed work
- commands run
- tests/checks passed and failed
- known risks and follow-ups
