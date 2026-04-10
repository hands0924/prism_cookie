import { NextResponse } from "next/server";
import { ADMIN_AUTH_COOKIE_NAME } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const response = NextResponse.redirect(new URL("/admin", req.url), { status: 303 });
  response.cookies.set({
    name: ADMIN_AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
  return response;
}
