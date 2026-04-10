import assert from "node:assert/strict";
import test from "node:test";
import { POST as adminLogin } from "../app/api/admin/login/route";
import { GET as exportCsv } from "../app/api/admin/export.csv/route";
import {
  ADMIN_AUTH_COOKIE_NAME,
  createAdminAuthCookieValue,
  isAdminPasswordConfigured,
  isAuthorizedAdminPassword,
  isAuthorizedAdminRequest
} from "../lib/admin-auth";

test("admin auth requires explicit configured password", () => {
  const prev = process.env.ADMIN_PASSWORD;
  delete process.env.ADMIN_PASSWORD;

  try {
    assert.equal(isAdminPasswordConfigured(), false);
    assert.equal(isAuthorizedAdminPassword("2580"), false);
    assert.throws(() => createAdminAuthCookieValue(), /admin_password_not_configured/);
  } finally {
    process.env.ADMIN_PASSWORD = prev;
  }
});

test("admin auth ignores query-string password and accepts cookie/header only", () => {
  const prev = process.env.ADMIN_PASSWORD;
  process.env.ADMIN_PASSWORD = "2580";

  try {
    const queryReq = new Request("https://example.com/api/admin/export.csv?password=2580");
    assert.equal(isAuthorizedAdminRequest(queryReq), false);

    const headerReq = new Request("https://example.com/api/admin/export.csv", {
      headers: { "x-admin-password": "2580" }
    });
    assert.equal(isAuthorizedAdminRequest(headerReq), true);

    const cookieReq = new Request("https://example.com/api/admin/export.csv", {
      headers: {
        cookie: `${ADMIN_AUTH_COOKIE_NAME}=${createAdminAuthCookieValue()}`
      }
    });
    assert.equal(isAuthorizedAdminRequest(cookieReq), true);
  } finally {
    process.env.ADMIN_PASSWORD = prev;
  }
});

test("admin login issues auth cookie when password is correct", async () => {
  const prev = process.env.ADMIN_PASSWORD;
  process.env.ADMIN_PASSWORD = "2580";

  try {
    const form = new FormData();
    form.set("password", "2580");
    form.set("next", "/admin");

    const response = await adminLogin(
      new Request("https://example.com/api/admin/login", {
        method: "POST",
        body: form
      })
    );

    assert.equal(response.status, 303);
    assert.equal(response.headers.get("location"), "https://example.com/admin");
    const setCookie = response.headers.get("set-cookie") ?? "";
    assert.match(setCookie, new RegExp(`${ADMIN_AUTH_COOKIE_NAME}=`));
    assert.match(setCookie, /HttpOnly/i);
  } finally {
    process.env.ADMIN_PASSWORD = prev;
  }
});

test("admin login redirects to misconfigured when password env is absent", async () => {
  const prev = process.env.ADMIN_PASSWORD;
  delete process.env.ADMIN_PASSWORD;

  try {
    const form = new FormData();
    form.set("password", "2580");

    const response = await adminLogin(
      new Request("https://example.com/api/admin/login", {
        method: "POST",
        body: form
      })
    );

    assert.equal(response.status, 303);
    assert.equal(response.headers.get("location"), "https://example.com/admin?auth=misconfigured");
  } finally {
    process.env.ADMIN_PASSWORD = prev;
  }
});

test("admin export rejects unauthenticated requests", async () => {
  const response = await exportCsv(new Request("https://example.com/api/admin/export.csv"));
  assert.equal(response.status, 401);
  assert.equal(await response.text(), "unauthorized");
});

