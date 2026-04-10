export function isAuthorizedJobRequest(req: Request): boolean {
  const workerKey = req.headers.get("x-worker-key");
  if (workerKey && process.env.WORKER_API_KEY && workerKey === process.env.WORKER_API_KEY) {
    return true;
  }

  const auth = req.headers.get("authorization") ?? "";
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && auth === `Bearer ${cronSecret}`) {
    return true;
  }

  return false;
}
