import { createHash, timingSafeEqual } from "node:crypto";

export const ADMIN_AUTH_COOKIE_NAME = "prism_admin_auth";

function configuredAdminPassword(): string | undefined {
  const password = process.env.ADMIN_PASSWORD?.trim();
  return password && password.length > 0 ? password : undefined;
}

export function isAdminPasswordConfigured(): boolean {
  return Boolean(configuredAdminPassword());
}

export function requireAdminPassword(): string {
  const password = configuredAdminPassword();
  if (!password) {
    throw new Error("admin_password_not_configured");
  }
  return password;
}

function buildCookieToken(password: string): string {
  return createHash("sha256").update(`prism-admin:${password}`).digest("hex");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuf = Buffer.from(left);
  const rightBuf = Buffer.from(right);
  if (leftBuf.length !== rightBuf.length) {
    return false;
  }
  return timingSafeEqual(leftBuf, rightBuf);
}

export function isAuthorizedAdminPassword(input: string | undefined): boolean {
  if (!input) {
    return false;
  }
  const password = configuredAdminPassword();
  if (!password) {
    return false;
  }
  return safeEqual(input, password);
}

export function createAdminAuthCookieValue(): string {
  return buildCookieToken(requireAdminPassword());
}

export function isAuthorizedAdminCookieValue(cookieValue: string | undefined): boolean {
  if (!cookieValue) {
    return false;
  }
  return safeEqual(cookieValue, createAdminAuthCookieValue());
}

function readCookieFromHeader(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }
  const pairs = cookieHeader.split(";");
  for (const pair of pairs) {
    const [rawKey, ...rest] = pair.trim().split("=");
    if (rawKey === name) {
      return rest.join("=");
    }
  }
  return undefined;
}

export function isAuthorizedAdminRequest(req: Request): boolean {
  const headerPassword = req.headers.get("x-admin-password") ?? undefined;
  if (isAuthorizedAdminPassword(headerPassword)) {
    return true;
  }

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice("Bearer ".length).trim();
    if (isAuthorizedAdminPassword(token)) {
      return true;
    }
  }

  const cookieValue = readCookieFromHeader(req.headers.get("cookie"), ADMIN_AUTH_COOKIE_NAME);
  return isAuthorizedAdminCookieValue(cookieValue);
}
