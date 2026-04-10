import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const baseUrl = process.env.SMOKE_BASE_URL;

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function read(filePath) {
  return fs.readFileSync(path.join(root, filePath), "utf8");
}

function runStaticChecks() {
  const requiredPaths = [
    "app/api/submit/route.ts",
    "app/api/cron/dispatch/route.ts",
    "app/api/jobs/process-submissions/route.ts",
    "app/api/jobs/send-message/route.ts",
    "app/api/jobs/generate-image/route.ts",
    "app/api/og/[submissionId]/route.ts",
    "app/r/[submissionId]/route.ts",
    "lib/workers.ts"
  ];

  for (const p of requiredPaths) {
    expect(fs.existsSync(path.join(root, p)), `missing required file: ${p}`);
  }

  const submitRoute = read("app/api/submit/route.ts");
  expect(submitRoute.includes("submitSchema.parse"), "submit route must validate input schema");
  expect(submitRoute.includes("client_request_id"), "submit route must preserve idempotency key");
  expect(submitRoute.includes("submission_events"), "submit route must enqueue submission events");

  const cronRoute = read("app/api/cron/dispatch/route.ts");
  expect(cronRoute.includes("isAuthorizedJobRequest"), "cron dispatch must enforce auth");
  expect(cronRoute.includes("processSubmissionEvents"), "cron dispatch must process submissions");
  expect(cronRoute.includes("processMessageJobs"), "cron dispatch must process message jobs");
  expect(cronRoute.includes("processShareImageJobs"), "cron dispatch must process image jobs");

  const shareRoute = read("app/r/[submissionId]/route.ts");
  expect(shareRoute.includes("og:image"), "share route must include OG image metadata");
  expect(shareRoute.includes("twitter:image"), "share route must include Twitter image metadata");
  expect(shareRoute.includes("/api/og/"), "share route must support dynamic OG fallback image URL");
}

async function checkHttp(routePath) {
  const res = await fetch(`${baseUrl}${routePath}`);
  return { path: routePath, status: res.status, ok: res.ok };
}

async function runHttpChecks() {
  const checks = await Promise.all([checkHttp("/"), checkHttp("/api/cron/dispatch")]);
  const failed = checks.filter((item) => !item.ok && item.status !== 401);
  if (failed.length > 0) {
    throw new Error(`http smoke failed: ${JSON.stringify(failed)}`);
  }
}

async function main() {
  runStaticChecks();
  if (baseUrl) {
    await runHttpChecks();
    console.log("SMOKE: PASS (static + http)");
    return;
  }
  console.log("SMOKE: PASS (static)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
