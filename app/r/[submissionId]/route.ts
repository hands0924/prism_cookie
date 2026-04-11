import { getBreadName, getResultType } from "@/lib/bread";
import { getServiceSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function GET(_: Request, context: { params: Promise<{ submissionId: string }> }) {
  const { submissionId } = await context.params;
  const requestUrl = new URL(_.url);
  const origin = `${requestUrl.protocol}//${requestUrl.host}`;
  const supabase = getServiceSupabaseClient();
  const { data } = await supabase
    .from("submissions")
    .select("id, name, needed_thing, generated_message, share_image_key")
    .eq("id", submissionId)
    .single();

  if (!data) {
    return new Response("<h1>Not Found</h1>", {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  }

  const title = data.needed_thing ? `${data.name}님의 포춘쿠키 결과: ${data.needed_thing}` : `${data.name}님의 포춘쿠키 결과`;
  const lines = data.generated_message
    .split("\n")
    .map((line: string) => line.trim())
    .filter(Boolean);
  const desc = lines[0] ?? "당신의 오늘 선택으로 나온 포춘쿠키 메시지를 확인해보세요.";
  const breadName = getBreadName(data.needed_thing);
  const resultType = getResultType(data.needed_thing);
  const pageUrl = `${origin}/r/${encodeURIComponent(submissionId)}`;
  const dynamicImageUrl = `${origin}/api/og/${encodeURIComponent(submissionId)}`;
  // Always prefer the dynamic PNG endpoint for OG — social platforms need raster images
  const imageUrl = dynamicImageUrl;
  const xShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `${data.name}님의 프리즘 포춘 결과를 확인해보세요.`
  )}&url=${encodeURIComponent(pageUrl)}`;
  const kakaoShareUrl = `https://sharer.kakao.com/talk/friends/picker/link?url=${encodeURIComponent(pageUrl)}`;
  const renderedMessage = lines.map((line: string) => `<p>${escapeHtml(line)}</p>`).join("\n");

  const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(desc)}" />
  <meta property="og:image" content="${escapeHtml(imageUrl)}" />
  <meta property="og:url" content="${escapeHtml(pageUrl)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(desc)}" />
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
  <style>
    :root { --bg:#fff7ed; --card:#fffdf8; --text:#3e2d25; --sub:#7a685e; --cta:#ff7a59; --border:rgba(62,45,37,.08); }
    * { box-sizing: border-box; }
    body { margin:0; font-family:"Noto Sans KR",-apple-system,BlinkMacSystemFont,sans-serif; color:var(--text);
      background:radial-gradient(circle at top right, rgba(255,200,87,.28), transparent 28%),
      radial-gradient(circle at bottom left, rgba(123,223,242,.22), transparent 24%), var(--bg);
      padding:24px; }
    .wrap { max-width:760px; margin:0 auto; }
    .card { background:rgba(255,253,248,.94); border:1px solid var(--border); border-radius:24px; overflow:hidden; }
    .hero { height:10px; background:linear-gradient(90deg,#ff8a5b,#ffd166,#7bdff2,#b8f2e6); }
    .content { padding:28px; }
    h1 { margin:0 0 12px; font-size:clamp(28px,4vw,40px); }
    .desc { margin:0 0 18px; color:var(--sub); line-height:1.6; }
    .preview { width:100%; border-radius:14px; border:1px solid var(--border); margin:0 0 18px; }
    .message p { margin:0 0 12px; line-height:1.75; }
    .message p:last-child { margin-bottom:0; color:var(--cta); font-weight:600; }
    .actions { display:flex; flex-wrap:wrap; gap:8px; margin-top:20px; }
    .btn { display:inline-flex; align-items:center; justify-content:center; border-radius:10px; border:1px solid var(--border);
      padding:10px 14px; text-decoration:none; color:var(--text); font-weight:600; background:#fff; cursor:pointer; }
    .btn-primary { border-color:transparent; color:#fff; background:var(--cta); }
    .guide { margin-top:12px; color:var(--sub); line-height:1.55; }
  </style>
</head>
<body>
  <main class="wrap">
    <article class="card">
      <div class="hero"></div>
      <div class="content">
        <h1>${escapeHtml(title)}</h1>
        <p class="desc">${escapeHtml(desc)}</p>
        <p class="desc" style="font-weight:700;color:#3e2d25;margin-top:-8px;">당신은 ${escapeHtml(resultType)}</p>
        <p class="desc" style="font-weight:700;color:#ff7a59;margin-top:-8px;">오늘의 빵: ${escapeHtml(breadName)}</p>
        <img class="preview" src="${escapeHtml(imageUrl)}" alt="공유 이미지" />
        <div class="message">${renderedMessage}</div>
        <div class="actions">
          <a class="btn" href="${escapeHtml(kakaoShareUrl)}" target="_blank" rel="noreferrer">카카오톡 공유</a>
          <a class="btn" href="${escapeHtml(xShareUrl)}" target="_blank" rel="noreferrer">X 공유</a>
          <button class="btn" type="button" id="instagram-btn">인스타그램</button>
          <button class="btn btn-primary" type="button" id="save-btn">이미지 저장</button>
          <button class="btn" type="button" id="copy-btn">링크 복사</button>
          <button class="btn" type="button" id="share-btn">시스템 공유</button>
        </div>
        <p class="guide">인스타그램은 이미지 저장 후 문구를 붙여넣는 방식으로 가장 안정적으로 공유돼요.</p>
      </div>
    </article>
  </main>
  <script>
    const pageUrl = ${JSON.stringify(pageUrl)};
    const imageUrl = ${JSON.stringify(imageUrl)};
    const title = ${JSON.stringify(title)};
    const text = ${JSON.stringify(`${data.name}님의 프리즘 포춘 결과를 확인해보세요.`)};
    const copyBtn = document.getElementById("copy-btn");
    const saveBtn = document.getElementById("save-btn");
    const shareBtn = document.getElementById("share-btn");
    const instagramBtn = document.getElementById("instagram-btn");

    saveBtn?.addEventListener("click", async () => {
      try {
        const response = await fetch(imageUrl, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("image_fetch_failed");
        }
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = "prism-fortune-share.png";
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(objectUrl);
      } catch {
        window.open(imageUrl, "_blank", "noopener,noreferrer");
      }
    });

    copyBtn?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(pageUrl);
        copyBtn.textContent = "링크 복사됨";
        setTimeout(() => {
          copyBtn.textContent = "링크 복사";
        }, 1300);
      } catch {
        alert("링크 복사에 실패했어요.");
      }
    });

    instagramBtn?.addEventListener("click", async () => {
      try {
        const response = await fetch(imageUrl, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("image_fetch_failed");
        }
        const blob = await response.blob();
        const file = new File([blob], "prism-fortune-share.png", { type: blob.type || "image/png" });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], text });
            return;
          } catch {}
        }

        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = "prism-fortune-share.png";
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(objectUrl);
      } catch {}

      try {
        await navigator.clipboard.writeText(text);
      } catch {}
      window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
    });

    shareBtn?.addEventListener("click", async () => {
      if (navigator.share) {
        try {
          await navigator.share({ title, text, url: pageUrl });
        } catch {}
        return;
      }
      try {
        await navigator.clipboard.writeText(pageUrl);
        alert("공유 기능 미지원 기기라 링크를 복사했어요.");
      } catch {
        alert(pageUrl);
      }
    });
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": data.share_image_key
        ? "public, s-maxage=300, stale-while-revalidate=3600"
        : "public, s-maxage=15, stale-while-revalidate=60"
    }
  });
}
