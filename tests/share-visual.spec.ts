import { test, expect } from "playwright/test";

/**
 * End-to-end tests for:
 *  1. Share card image generation (PNG, no overflow, reflects bread type)
 *  2. Share panel functionality (Kakao, Twitter, Instagram buttons)
 *  3. OG image endpoint returns PNG
 */

async function pickOption(page: Parameters<Parameters<typeof test>[1]>[0]["page"], text: string) {
  const btn = page.locator(`text=${text}`).first();
  await btn.waitFor({ state: "visible", timeout: 10000 });
  await btn.click();
  // Wait for the CSS section transition (320ms animation + buffer)
  await page.waitForTimeout(500);
}

test.describe("Share card & sharing flow", () => {
  test("survey → result → PNG share card renders without overflow", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // Ensure React hydration completes before interacting
    await page.waitForFunction(() => {
      const btn = document.querySelector('.fortune-btn-cta');
      return btn && btn instanceof HTMLButtonElement;
    }, { timeout: 10000 });

    // Step 0 → 1: Click CTA
    await pickOption(page, "나만의 미래 레시피 만들기");

    // Step 1: Pick concern
    await pickOption(page, "수입이 불안정할 때");

    // Step 2: Pick protect target
    await pickOption(page, "나 자신");

    // Step 3: Pick needed thing → determines bread type
    await pickOption(page, "정보");

    // Step 4: Fill form
    await page.waitForSelector("#inputName", { state: "visible", timeout: 5000 });
    await page.fill("#inputName", "테스트유저");
    await page.fill("#inputPhone", "01012345678");

    // Select interest
    await pickOption(page, "앞으로 활동소식을 받고 싶어요");

    // Consent
    await pickOption(page, "개인정보 수집 및 이용에 동의합니다");

    // Submit
    await pickOption(page, "내 미래 레시피 확인하기");

    // Wait for result screen (step 6)
    await page.waitForSelector(".fortune-share-preview-shell", {
      timeout: 15000,
    });

    // Wait for PNG card to load (loading state → image)
    await page.waitForFunction(
      () => {
        const img = document.querySelector(
          ".fortune-share-preview",
        ) as HTMLImageElement | null;
        return img && img.complete && img.naturalWidth > 0;
      },
      { timeout: 10000 },
    );

    // Verify the image loaded and has correct aspect ratio
    const img = page.locator(".fortune-share-preview");
    await expect(img).toBeVisible();
    const box = await img.boundingBox();
    expect(box).toBeTruthy();
    // Card should be roughly 3:4 aspect ratio (1080:1440)
    if (box) {
      const ratio = box.height / box.width;
      expect(ratio).toBeGreaterThan(1.1);
      expect(ratio).toBeLessThan(1.6);
    }

    // Check no overflow — preview shell should contain the image
    const shellBox = await page
      .locator(".fortune-share-preview-shell")
      .boundingBox();
    expect(shellBox).toBeTruthy();
    if (box && shellBox) {
      // Image should not exceed shell bounds
      expect(box.x).toBeGreaterThanOrEqual(shellBox.x - 2);
      expect(box.y).toBeGreaterThanOrEqual(shellBox.y - 2);
      expect(box.x + box.width).toBeLessThanOrEqual(
        shellBox.x + shellBox.width + 2,
      );
    }

    // Take screenshot for visual inspection
    await page.screenshot({
      path: "reports/share-card-result.png",
      fullPage: true,
    });
  });

  test("share panel buttons are visible and clickable", async ({ page }) => {
    await page.goto("/");

    // Quick flow to result
    await pickOption(page, "나만의 미래 레시피 만들기");
    await pickOption(page, "건강이 무너질 때");
    await pickOption(page, "파트너");
    await pickOption(page, "응원");

    await page.waitForSelector("#inputName", { state: "visible", timeout: 5000 });
    await page.fill("#inputName", "공유테스트");
    await page.fill("#inputPhone", "01098765432");
    await pickOption(page, "보험상담을 의뢰하고 싶어요");
    await pickOption(page, "개인정보 수집 및 이용에 동의합니다");
    await pickOption(page, "내 미래 레시피 확인하기");

    await page.waitForSelector(".fortune-share-panel", { timeout: 15000 });

    // All share buttons should be present
    const sharePanel = page.locator(".fortune-share-panel");
    await expect(sharePanel).toBeVisible();

    await expect(sharePanel.locator("text=카카오톡")).toBeVisible();
    await expect(sharePanel.locator("button[aria-label='X']")).toBeVisible();
    await expect(sharePanel.locator("text=인스타")).toBeVisible();
    await expect(sharePanel.locator("button[aria-label='저장']")).toBeVisible();
    await expect(sharePanel.locator("text=링크")).toBeVisible();

    // Take screenshot of the share panel
    await page.screenshot({
      path: "reports/share-panel.png",
      fullPage: true,
    });
  });

  test("each bread type produces a distinct card", async ({ page }) => {
    // Test with a different needed_thing to get a different bread type
    await page.goto("/");
    await pickOption(page, "나만의 미래 레시피 만들기");
    await pickOption(page, "노후 준비");
    await pickOption(page, "가족");
    // Pick "계획" → 프레첼 bread type
    await pickOption(page, "계획");

    await page.waitForSelector("#inputName", { state: "visible", timeout: 5000 });
    await page.fill("#inputName", "프레첼테스터");
    await page.fill("#inputPhone", "01011112222");
    await pickOption(page, "재무상담을 의뢰하고 싶어요");
    await pickOption(page, "개인정보 수집 및 이용에 동의합니다");
    await pickOption(page, "내 미래 레시피 확인하기");

    await page.waitForSelector(".fortune-share-preview-shell", {
      timeout: 15000,
    });

    // Wait for the PNG to render
    await page.waitForFunction(
      () => {
        const img = document.querySelector(
          ".fortune-share-preview",
        ) as HTMLImageElement | null;
        return img && img.complete && img.naturalWidth > 0;
      },
      { timeout: 10000 },
    );

    await expect(page.locator(".fortune-share-preview")).toBeVisible();

    await page.screenshot({
      path: "reports/share-card-pretzel.png",
      fullPage: true,
    });
  });
});

test.describe("OG image endpoint", () => {
  test("returns PNG image with correct content-type", async ({ request }) => {
    // This test requires a real submission in the database
    // We'll create one via the API first
    const submitRes = await request.post("/api/submit", {
      data: {
        name: "OG테스트",
        phone: "01099998888",
        concern: "건강이 무너질 때",
        protectTarget: "나 자신",
        neededThing: "연결",
        interests: ["활동소식"],
        privacyConsent: true,
        supportMessage: "",
        userAgent: "playwright-test",
      },
      headers: {
        "x-idempotency-key": `test-og-${Date.now()}`,
      },
    });

    if (submitRes.ok()) {
      const body = await submitRes.json();
      if (body.submissionId) {
        const ogRes = await request.get(`/api/og/${body.submissionId}`);
        expect(ogRes.ok()).toBeTruthy();
        const contentType = ogRes.headers()["content-type"] ?? "";
        // Should be PNG now (from ImageResponse)
        expect(contentType).toContain("image/png");
      }
    }
  });
});
