import { test, expect } from "playwright/test";

/**
 * Comprehensive screenshot capture — all views, all bread types.
 * Outputs to screenshots-2026-04-12/
 */

const DIR = "v4";

async function pickOption(page: Parameters<Parameters<typeof test>[1]>[0]["page"], text: string) {
  const btn = page.locator(`text=${text}`).first();
  await btn.waitFor({ state: "visible", timeout: 10000 });
  await btn.click();
  await page.waitForTimeout(500);
}

async function flowToResult(
  page: Parameters<Parameters<typeof test>[1]>[0]["page"],
  opts: { concern: string; protect: string; needed: string; name: string; phone: string; interest: string },
) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.waitForFunction(() => {
    const btn = document.querySelector(".fortune-btn-cta");
    return btn && btn instanceof HTMLButtonElement;
  }, { timeout: 10000 });

  await pickOption(page, "나만의 미래 레시피 만들기");
  await pickOption(page, opts.concern);
  await pickOption(page, opts.protect);
  await pickOption(page, opts.needed);

  await page.waitForSelector("#inputName", { state: "visible", timeout: 5000 });
  await page.fill("#inputName", opts.name);
  await page.fill("#inputPhone", opts.phone);
  await pickOption(page, opts.interest);
  await pickOption(page, "개인정보 수집 및 이용에 동의합니다");
  await pickOption(page, "내 미래 레시피 확인하기");

  await page.waitForSelector(".fortune-html-card", { timeout: 15000 });
  await expect(page.locator(".fortune-html-card")).toBeVisible();
}

test.describe("Screenshot capture", () => {
  test("00 — intro page", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForFunction(() => {
      const btn = document.querySelector(".fortune-btn-cta");
      return btn && btn instanceof HTMLButtonElement;
    }, { timeout: 10000 });
    await page.screenshot({ path: `${DIR}/00-intro.png`, fullPage: true });
  });

  test("01 — survey steps", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForFunction(() => {
      const btn = document.querySelector(".fortune-btn-cta");
      return btn && btn instanceof HTMLButtonElement;
    }, { timeout: 10000 });

    await pickOption(page, "나만의 미래 레시피 만들기");
    await page.screenshot({ path: `${DIR}/01a-step1-concern.png`, fullPage: true });

    await pickOption(page, "수입이 불안정할 때");
    await page.screenshot({ path: `${DIR}/01b-step2-protect.png`, fullPage: true });

    await pickOption(page, "나 자신");
    await page.screenshot({ path: `${DIR}/01c-step3-needed.png`, fullPage: true });

    await pickOption(page, "정보");
    await page.screenshot({ path: `${DIR}/01d-step4-form.png`, fullPage: true });
  });

  test("02 — 크루아상 thumbnail", async ({ page }) => {
    await flowToResult(page, {
      concern: "수입이 불안정할 때", protect: "나 자신", needed: "정보",
      name: "크루아상테스터", phone: "01011111111", interest: "앞으로 활동소식을 받고 싶어요",
    });
    await page.screenshot({ path: `${DIR}/02-thumbnail-croissant.png`, fullPage: true });
  });

  test("02b — 크루아상 saved PNG", async ({ page }) => {
    await flowToResult(page, {
      concern: "수입이 불안정할 때", protect: "나 자신", needed: "정보",
      name: "크루아상테스터", phone: "01011111111", interest: "앞으로 활동소식을 받고 싶어요",
    });
    // Wait for canvas PNG generation to complete
    await page.waitForTimeout(3000);
    // Click save and capture the download
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 10000 }),
      page.locator("button[aria-label='저장']").click(),
    ]);
    const path = `${DIR}/02b-saved-png-croissant.png`;
    await download.saveAs(path);
  });

  test("03 — 통밀식빵 (안전망)", async ({ page }) => {
    await flowToResult(page, {
      concern: "건강이 무너질 때", protect: "파트너", needed: "안전망",
      name: "통밀테스터", phone: "01022222222", interest: "보험상담을 의뢰하고 싶어요",
    });
    await page.screenshot({ path: `${DIR}/03-result-wholebread.png`, fullPage: true });
  });

  test("04 — 팬케이크 (응원)", async ({ page }) => {
    await flowToResult(page, {
      concern: "가까운 관계가 흔들릴 때", protect: "가족", needed: "응원",
      name: "팬케이크테스터", phone: "01033333333", interest: "재무상담을 의뢰하고 싶어요",
    });
    await page.screenshot({ path: `${DIR}/04-result-pancake.png`, fullPage: true });
  });

  test("05 — 프레첼 (계획)", async ({ page }) => {
    await flowToResult(page, {
      concern: "노후 준비", protect: "가족", needed: "계획",
      name: "프레첼테스터", phone: "01044444444", interest: "재무상담을 의뢰하고 싶어요",
    });
    await page.screenshot({ path: `${DIR}/05-result-pretzel.png`, fullPage: true });
  });

  test("06 — 브리오슈 (연결)", async ({ page }) => {
    await flowToResult(page, {
      concern: "예기치 못한 사고", protect: "반려동물", needed: "연결",
      name: "브리오슈테스터", phone: "01055555555", interest: "앞으로 활동소식을 받고 싶어요",
    });
    await page.screenshot({ path: `${DIR}/06-result-brioche.png`, fullPage: true });
  });

  test("07 — share panel (3 buttons)", async ({ page }) => {
    await flowToResult(page, {
      concern: "건강이 무너질 때", protect: "나 자신", needed: "정보",
      name: "공유테스터", phone: "01066666666", interest: "보험상담을 의뢰하고 싶어요",
    });
    // Scroll down to share panel
    await page.locator(".fortune-share-panel").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${DIR}/07-share-panel.png`, fullPage: true });
  });

  test("08 — OG image", async ({ request }) => {
    const submitRes = await request.post("/api/submit", {
      data: {
        name: "OG캡처", phone: "01077777777",
        concern: "수입이 불안정할 때", protectTarget: "나 자신", neededThing: "정보",
        interests: ["활동소식"], privacyConsent: true, supportMessage: "", userAgent: "playwright-capture",
      },
      headers: { "x-idempotency-key": `capture-og-${Date.now()}` },
    });

    if (submitRes.ok()) {
      const body = await submitRes.json();
      if (body.submissionId) {
        const ogRes = await request.get(`/api/og/${body.submissionId}`);
        expect(ogRes.ok()).toBeTruthy();
        const buffer = await ogRes.body();
        const fs = await import("fs");
        fs.writeFileSync(`${DIR}/08-og-image.png`, buffer);
      }
    }
  });

  test("09 — /r/ share page", async ({ page }) => {
    const submitRes = await page.request.post("/api/submit", {
      data: {
        name: "공유페이지", phone: "01088888888",
        concern: "노후 준비", protectTarget: "가족", neededThing: "계획",
        interests: ["재무상담"], privacyConsent: true, supportMessage: "", userAgent: "playwright-capture",
      },
      headers: { "x-idempotency-key": `capture-share-${Date.now()}` },
    });

    if (submitRes.ok()) {
      const body = await submitRes.json();
      if (body.submissionId) {
        await page.goto(`/r/${body.submissionId}`);
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(1000);
        await page.screenshot({ path: `${DIR}/09-share-page.png`, fullPage: true });
      }
    }
  });
});
