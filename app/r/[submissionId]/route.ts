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
  const imageUrl = `${origin}/api/og/${encodeURIComponent(submissionId)}`;
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
    .message p:last-child { margin-bottom:0; }
    .actions { margin-top:24px; text-align:center; }
    .btn-cta { display:inline-block; border-radius:14px; border:none;
      padding:14px 32px; text-decoration:none; color:#fff; font-weight:700; font-size:17px;
      background:linear-gradient(135deg, #FF8A5B 0%, #FFD166 100%); cursor:pointer;
      box-shadow:0 4px 14px rgba(255,138,91,.25); transition:transform .15s; }
    .btn-cta:active { transform:scale(.97); }
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
          <a class="btn-cta" href="${escapeHtml(origin)}">🍞 나도 해보기</a>
        </div>
      </div>
    </article>
  </main>
  <script>0</script>
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
