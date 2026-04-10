import { chromium } from "playwright";

const BASE_URL = process.env.UI_SHARE_CHECK_BASE_URL ?? "http://localhost:3100";

function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label}_timeout_${ms}ms`)), ms);
    })
  ]);
}

async function waitStep(page, className) {
  await page.locator(`.fortune-section.${className}.active`).waitFor({ state: "visible", timeout: 8000 });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  const events = [];
  const screenshots = {
    result: "/tmp/prism-share-result.png",
    actions: "/tmp/prism-share-actions.png"
  };

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      events.push({ type: "browser_console_error", text: msg.text() });
    }
  });
  page.on("pageerror", (err) => {
    events.push({ type: "page_error", text: err.message });
  });

  try {
    await page.route("**/api/submit", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          name: "테스트사용자",
          message: ["테스트 문장 1", "테스트 문장 2", "테스트 문장 3"],
          submissionId: "11111111-2222-3333-4444-555555555555",
          breadName: "프리즘 식빵",
          resultType: "안정 설계형",
          typeName: "안정 설계형",
          typeEmoji: "🛡️",
          typeDesc: "작은 준비를 꾸준히 이어가는 타입"
        })
      });
    });

    await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 15000 });
    await waitStep(page, "fortune-intro");
    await page.locator(".fortune-btn-cta").first().click({ force: true });

    await waitStep(page, "fortune-question");
    await page.getByRole("button", { name: "건강이 무너질 때" }).click({ force: true });
    await waitStep(page, "fortune-question");
    await page.getByRole("button", { name: "나 자신" }).click({ force: true });
    await waitStep(page, "fortune-question");
    await page.getByRole("button", { name: "정보" }).click({ force: true });

    await waitStep(page, "fortune-info");
    await page.fill("#inputName", "테스트사용자");
    await page.fill("#inputPhone", "01012345678");
    await page.locator(".fortune-interest-chip").first().click({ force: true });
    await page.locator(".fortune-consent-row").click({ force: true });
    await page.fill("#supportMessage", "응원합니다");
    await page.locator("form .fortune-btn-cta").click({ force: true });

    await waitStep(page, "fortune-result");
    await page.screenshot({ path: screenshots.result, fullPage: true });

    const saveBtn = page.getByRole("button", { name: "🖼️ 이미지 저장" });
    const downloadPromise = page.waitForEvent("download", { timeout: 4000 }).catch(() => null);
    await saveBtn.click();
    const download = await downloadPromise;
    events.push({
      type: "save_image_download",
      ok: Boolean(download),
      file: download ? download.suggestedFilename() : null
    });

    await page.getByRole("button", { name: "🔗 링크 복사" }).click({ force: true });
    const linkCopyToast = await page.locator(".fortune-toast").innerText().catch(() => "");
    events.push({ type: "link_copy_toast", text: linkCopyToast });

    const shareButtons = await page.locator(".fortune-share-panel-grid .fortune-btn-share").allInnerTexts();
    events.push({ type: "share_buttons", labels: shareButtons });

    const previewVisible = await page.locator(".fortune-share-preview").isVisible().catch(() => false);
    events.push({ type: "share_preview_visible", ok: previewVisible });

    await page.screenshot({ path: screenshots.actions, fullPage: true });
    console.log(JSON.stringify({ ok: true, screenshots, events }, null, 2));
  } catch (error) {
    await page.screenshot({ path: screenshots.actions, fullPage: true }).catch(() => undefined);
    console.log(
      JSON.stringify(
        {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
          screenshots,
          events
        },
        null,
        2
      )
    );
    process.exitCode = 1;
  } finally {
    await context.close();
    await browser.close();
  }
}

await withTimeout(run(), 45000, "ui_share_check");
