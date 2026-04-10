import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const rubricPath = path.join(root, ".codex/skills/harness-loop/references/rubric.json");
const reportPath = path.join(root, ".codex/skills/harness-loop/artifacts/evaluator-report.json");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function main() {
  if (!fs.existsSync(rubricPath)) {
    fail(`Missing rubric: ${rubricPath}`);
  }
  if (!fs.existsSync(reportPath)) {
    fail(`Missing evaluator report: ${reportPath}`);
  }

  const rubric = readJson(rubricPath);
  const report = readJson(reportPath);

  const categories = rubric.categories ?? [];
  const scores = report.rubric ?? {};
  const requiredChecks = report.required_checks ?? {};
  const openIssues = report.open_issues ?? {};

  const failingScores = categories.filter((category) => {
    const score = Number(scores[category.id] ?? 0);
    return !Number.isFinite(score) || score < category.min_pass_score;
  });

  const failingChecks = (rubric.required_checks ?? []).filter((checkId) => requiredChecks[checkId] !== "pass");
  const blockingP0 = Number(openIssues.p0 ?? 0);
  const blockingP1 = Number(openIssues.p1 ?? 0);
  const totalScore = categories.length === 0
    ? 0
    : Math.round(
        (categories.reduce((sum, category) => sum + Number(scores[category.id] ?? 0), 0) / (categories.length * 5)) * 100
      );

  const gatePass = failingScores.length === 0 && failingChecks.length === 0 && blockingP0 === 0 && blockingP1 === 0;

  console.log(
    JSON.stringify(
      {
        score: totalScore,
        gate: gatePass ? "PASS" : "FAIL",
        failingScores: failingScores.map((category) => ({
          id: category.id,
          required: category.min_pass_score,
          actual: Number(scores[category.id] ?? 0)
        })),
        failingChecks,
        blockingIssues: {
          p0: blockingP0,
          p1: blockingP1
        },
        summary: report.summary ?? ""
      },
      null,
      2
    )
  );

  if (!gatePass) {
    process.exit(1);
  }
}

main();
