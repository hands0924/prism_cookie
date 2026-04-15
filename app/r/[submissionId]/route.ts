import { getBreadMeta } from "@/lib/bread";
import { getServiceSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export async function GET(_: Request, context: { params: Promise<{ submissionId: string }> }) {
  const { submissionId } = await context.params;
  const url = new URL(_.url);
  const origin = `${url.protocol}//${url.host}`;
  const supabase = getServiceSupabaseClient();
  const { data } = await supabase
    .from("submissions")
    .select("id, name, concern, protect_target, generated_message")
    .eq("id", submissionId)
    .single();

  if (!data) {
    return new Response("<h1>Not Found</h1>", { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  const meta = getBreadMeta(data.concern, data.protect_target);
  const lines = data.generated_message.split("\n").map((l: string) => l.trim()).filter(Boolean);
  const desc = lines[0] ?? "당신의 포춘쿠키 메시지를 확인해보세요.";
  const pageUrl = `${origin}/r/${encodeURIComponent(submissionId)}`;
  const imageUrl = `${origin}/api/og/${encodeURIComponent(submissionId)}`;
  const msgHtml = lines.map((l: string) => `<p>${esc(l)}</p>`).join("");

  const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(data.name)}님의 미래 레시피</title>
<meta property="og:type" content="website"/>
<meta property="og:title" content="${esc(data.name)}님의 미래 레시피"/>
<meta property="og:description" content="${esc(desc)}"/>
<meta property="og:image" content="${esc(imageUrl)}"/>
<meta property="og:url" content="${esc(pageUrl)}"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(data.name)}님의 미래 레시피"/>
<meta name="twitter:description" content="${esc(desc)}"/>
<meta name="twitter:image" content="${esc(imageUrl)}"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;800&display=swap" rel="stylesheet"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{
  font-family:"Noto Sans KR",sans-serif;color:#1A1410;min-height:100dvh;
  background:#FAFAF7;padding:20px 16px 48px;
  display:flex;justify-content:center;align-items:flex-start;
  position:relative;overflow-x:hidden;
}
/* Prismatic ambient light — slowly drifting */
body::before{
  content:'';position:fixed;top:-60%;left:-60%;width:220%;height:220%;
  background:conic-gradient(from 0deg,
    rgba(255,138,91,.03),rgba(255,209,102,.03),
    rgba(123,223,242,.03),rgba(184,242,230,.03),
    rgba(255,138,91,.03));
  animation:drift 25s linear infinite;pointer-events:none;z-index:0;
}
@keyframes drift{to{transform:rotate(360deg)}}

.wrap{width:100%;max-width:440px;position:relative;z-index:1}

/* Prismatic bar */
.prism-bar{height:4px;border-radius:2px;margin-bottom:32px;
  background:linear-gradient(90deg,#FF8A5B,#FFD166,#7BDFF2,#B8F2E6)}

/* Header */
.hdr{text-align:center;margin-bottom:28px}
.hdr-label{font-size:11px;font-weight:600;color:#B0A090;letter-spacing:5px;margin-bottom:8px}
.hdr-title{font-size:clamp(24px,6vw,32px);font-weight:800;line-height:1.35;color:#1A1410}

/* Rule */
.rule{width:160px;height:1px;background:#E8E0D6;margin:0 auto 28px}

/* Type */
.type{text-align:center;margin-bottom:24px}
.type-emoji{font-size:52px;line-height:1;margin-bottom:12px;
  filter:drop-shadow(0 0 20px rgba(${meta.breadName === '크루아상' ? '192,139,48' : meta.breadName === '팬케이크' ? '232,100,62' : '158,94,34'},.12))}
.type-name{font-size:22px;font-weight:800;margin-bottom:12px}
.type-desc{font-size:14px;color:#8B7B6E;line-height:1.65;max-width:360px;margin:0 auto}

/* Prismatic divider */
.prism-line{width:120px;height:3px;border-radius:2px;margin:0 auto 20px;
  background:linear-gradient(90deg,#FF8A5B,#FFD166,#7BDFF2,#B8F2E6)}

/* Fortune */
.fortune-label{text-align:center;font-size:10px;font-weight:600;color:#B0A090;
  letter-spacing:4px;margin-bottom:14px}
.fortune-card{
  background:rgba(250,250,248,.75);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
  border:1px solid rgba(30,20,10,.04);border-radius:18px;
  padding:20px 22px;margin-bottom:28px;position:relative;overflow:hidden;
}
.fortune-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;
  background:linear-gradient(90deg,#FF8A5B,#FFD166,#7BDFF2,#B8F2E6)}
.fortune-card p{font-size:15px;line-height:1.75;margin-bottom:8px;color:#2A1E15}
.fortune-card p:last-child{margin-bottom:0}

/* Footer */
.foot{text-align:center;margin-bottom:28px}
.foot-diamonds{display:flex;justify-content:center;gap:10px;margin-bottom:10px}
.foot-diamonds span{width:7px;height:7px;display:block;transform:rotate(45deg)}
.foot-text{font-size:12px;color:#8B776D;font-weight:600}
.foot-handle{font-size:11px;color:#A89888;margin-top:2px}

/* CTA */
.cta{
  display:block;width:100%;text-align:center;text-decoration:none;
  font-size:17px;font-weight:700;color:#fff;padding:16px 0;border-radius:14px;
  background:linear-gradient(135deg,#FF8A5B 0%,#FFD166 50%,#7BDFF2 100%);
  background-size:200% 200%;animation:shimmer 4s ease infinite;
  box-shadow:0 6px 20px rgba(255,138,91,.2);transition:transform .12s;
}
.cta:active{transform:scale(.97)}
@keyframes shimmer{
  0%{background-position:0% 50%}
  50%{background-position:100% 50%}
  100%{background-position:0% 50%}
}
</style>
</head>
<body>
<div class="wrap">
  <div class="prism-bar"></div>
  <div class="hdr">
    <div class="hdr-label">PRISM</div>
    <div class="hdr-title">${esc(data.name)}님의 미래 레시피</div>
  </div>
  <div class="rule"></div>
  <div class="type">
    <div class="type-emoji">${esc(meta.typeEmoji)}</div>
    <div class="type-name">${esc(meta.typeName)} 타입</div>
    <div class="type-desc">${esc(meta.typeDesc)}</div>
  </div>
  <div class="prism-line"></div>
  <div class="fortune-label">FORTUNE</div>
  <div class="fortune-card">${msgHtml}</div>
  <div class="foot">
    <div class="foot-diamonds">
      <span style="background:#FF8A5B"></span>
      <span style="background:#FFD166"></span>
      <span style="background:#7BDFF2"></span>
    </div>
    <div class="foot-text">포용적 금융서비스, 프리즘지점</div>
    <div class="foot-handle">@prism.fin</div>
  </div>
  <a class="cta" href="${esc(origin)}">🍞 나도 해보기</a>
</div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
