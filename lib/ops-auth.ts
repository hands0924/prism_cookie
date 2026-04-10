export function isAuthorizedOpsRequest(req: Request): boolean {
  const expected = process.env.OPS_DASHBOARD_KEY;
  if (!expected) {
    return false;
  }

  const keyHeader = req.headers.get("x-ops-key");
  if (keyHeader && keyHeader === expected) {
    return true;
  }

  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${expected}`) {
    return true;
  }

  const queryKey = new URL(req.url).searchParams.get("key");
  return queryKey === expected;
}

export function isAuthorizedOpsKey(key: string | undefined): boolean {
  const expected = process.env.OPS_DASHBOARD_KEY;
  return Boolean(expected && key && key === expected);
}
