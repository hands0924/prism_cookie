import { ImageResponse } from "next/og";
import { getBreadMeta } from "@/lib/bread";
import { getServiceSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";

const fontPromise = fetch(
  "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-kr@latest/korean-700-normal.ttf",
).then((res) => {
  if (!res.ok) throw new Error(`font_fetch_${res.status}`);
  return res.arrayBuffer();
});

const PILL: Record<string, { bg: string; fg: string }> = {
  크루아상: { bg: "#FFF0D6", fg: "#9A7020" },
  통밀식빵: { bg: "#F4E8D8", fg: "#5C4828" },
  팬케이크: { bg: "#FFE4DA", fg: "#C44E28" },
  프레첼: { bg: "#F6E8D4", fg: "#7A4810" },
  브리오슈: { bg: "#FFF0DA", fg: "#8C5C28" },
};

export async function GET(
  _: Request,
  context: { params: Promise<{ submissionId: string }> },
) {
  const { submissionId } = await context.params;
  const supabase = getServiceSupabaseClient();
  const { data } = await supabase
    .from("submissions")
    .select("id, name, needed_thing, generated_message")
    .eq("id", submissionId)
    .single();

  if (!data) {
    return new Response("not_found", { status: 404 });
  }

  const lines = data.generated_message
    .split("\n")
    .map((l: string) => l.trim())
    .filter(Boolean);
  const teaser = lines[0] ?? "";
  const meta = getBreadMeta(data.needed_thing);
  const title = `${data.name}님의 미래 레시피`;
  const pill = PILL[meta.breadName] ?? { bg: "#FFE4DA", fg: "#C44E28" };

  let fontData: ArrayBuffer;
  try {
    fontData = await fontPromise;
  } catch {
    const fallback = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect fill="#FAFAF7" width="1200" height="630"/><text x="600" y="315" text-anchor="middle" font-size="36" fill="#1A1410">${title}</text></svg>`;
    return new Response(fallback, {
      headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, s-maxage=10" },
    });
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          backgroundColor: "#FAFAF7",
          fontFamily: "Noto Sans KR",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle radial glow behind content */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 800,
            height: 800,
            transform: "translate(-50%, -50%)",
            background: "radial-gradient(circle, rgba(255,209,102,0.06) 0%, rgba(123,223,242,0.04) 40%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Top row: diamonds + PRISM */}
        <div
          style={{
            position: "absolute",
            top: 28,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ width: 8, height: 8, backgroundColor: "#FF8A5B", display: "flex", transform: "rotate(45deg)" }} />
          <div style={{ width: 8, height: 8, backgroundColor: "#FFD166", display: "flex", transform: "rotate(45deg)" }} />
          <div style={{ width: 8, height: 8, backgroundColor: "#7BDFF2", display: "flex", transform: "rotate(45deg)" }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#B0A090", letterSpacing: 6, marginLeft: 8 }}>
            P R I S M
          </span>
          <div style={{ width: 8, height: 8, backgroundColor: "#7BDFF2", display: "flex", transform: "rotate(45deg)" }} />
          <div style={{ width: 8, height: 8, backgroundColor: "#FFD166", display: "flex", transform: "rotate(45deg)" }} />
          <div style={{ width: 8, height: 8, backgroundColor: "#FF8A5B", display: "flex", transform: "rotate(45deg)" }} />
        </div>

        {/* Hero emoji */}
        <div style={{ fontSize: 72, lineHeight: 1, display: "flex", marginBottom: 12 }}>
          {meta.typeEmoji}
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 40,
            fontWeight: 700,
            color: "#1A1410",
            lineHeight: 1.3,
            display: "flex",
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          {title}
        </div>

        {/* Type + pill row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 700, color: "#1A1410" }}>
            {meta.typeName} 타입
          </span>
          <span
            style={{
              width: 4,
              height: 4,
              backgroundColor: "#D0C8BE",
              borderRadius: 2,
              display: "flex",
            }}
          />
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: pill.fg,
              backgroundColor: pill.bg,
              padding: "4px 14px",
              borderRadius: 16,
            }}
          >
            오늘의 빵: {meta.breadName}
          </span>
        </div>

        {/* Fortune teaser — single line in quotes */}
        {teaser && (
          <div
            style={{
              fontSize: 18,
              color: "#6B5E52",
              lineHeight: 1.6,
              display: "flex",
              textAlign: "center",
              maxWidth: 800,
              padding: "0 40px",
            }}
          >
            &ldquo;{teaser.length > 60 ? teaser.slice(0, 58) + "..." : teaser}&rdquo;
          </div>
        )}

        {/* Footer text */}
        <div
          style={{
            position: "absolute",
            bottom: 44,
            display: "flex",
            fontSize: 13,
            color: "#A89888",
            fontWeight: 700,
          }}
        >
          퀴어문화축제에서 만나는 프리즘지점 · @prism.fin
        </div>

        {/* Bold prismatic bar — bottom anchor */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 16,
            background: "linear-gradient(90deg, #FF8A5B 0%, #FFD166 28%, #7BDFF2 56%, #B8F2E6 84%, #A8E6CF 100%)",
            display: "flex",
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Noto Sans KR", data: fontData, style: "normal" as const, weight: 700 },
      ],
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
