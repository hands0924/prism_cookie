import { NextResponse } from "next/server";
import {
  ADMIN_AUTH_COOKIE_NAME,
  createAdminAuthCookieValue,
  isAdminPasswordConfigured,
  isAuthorizedAdminPassword
} from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeNextPath(raw: FormDataEntryValue | null): string {
  if (typeof raw !== "string") {
    return "/admin";
  }
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/")) {
    return "/admin";
  }
  if (trimmed.startsWith("//")) {
    return "/admin";
  }
  return trimmed;
}

export async function POST(req: Request) {
  const form = await req.formData();
  const password = typeof form.get("password") === "string" ? String(form.get("password")).trim() : "";
  const nextPath = normalizeNextPath(form.get("next"));

  if (!isAdminPasswordConfigured()) {
    return NextResponse.redirect(new URL("/admin?auth=misconfigured", req.url), { status: 303 });
  }

  if (!isAuthorizedAdminPassword(password)) {
    return NextResponse.redirect(new URL("/admin?auth=failed", req.url), { status: 303 });
  }

  const response = NextResponse.redirect(new URL(nextPath, req.url), { status: 303 });
  response.cookies.set({
    name: ADMIN_AUTH_COOKIE_NAME,
    value: createAdminAuthCookieValue(),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12
  });
  return response;
}
