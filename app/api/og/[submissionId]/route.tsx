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
    .filter(Boolean)
    .slice(0, 4);
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
          width: "100%",
          height: "100%",
          backgroundColor: "#FAFAF7",
          fontFamily: "Noto Sans KR",
          position: "relative",
        }}
      >
        {/* Thin prismatic bar — top edge */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 5,
            background: "linear-gradient(90deg, #FF8A5B, #FFD166, #7BDFF2, #B8F2E6)",
            display: "flex",
          }}
        />

        {/* Left column — identity */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "42%",
            padding: "48px 0 40px 52px",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#B0A090",
              letterSpacing: 5,
              display: "flex",
              marginBottom: 10,
            }}
          >
            PRISM
          </div>
          <div
            style={{
              fontSize: 34,
              fontWeight: 700,
              color: "#1A1410",
              lineHeight: 1.35,
              display: "flex",
              marginBottom: 24,
            }}
          >
            {title}
          </div>

          {/* Thin rule */}
          <div
            style={{
              width: 100,
              height: 1,
              backgroundColor: "#E8E0D6",
              display: "flex",
              marginBottom: 24,
            }}
          />

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 36 }}>{meta.typeEmoji}</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: "#1A1410" }}>
              {meta.typeName} 타입
            </span>
          </div>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: pill.fg,
              backgroundColor: pill.bg,
              padding: "4px 14px",
              borderRadius: 16,
              display: "flex",
              alignSelf: "flex-start",
            }}
          >
            오늘의 빵: {meta.breadName}
          </span>

          {/* Footer diamonds */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: "auto" }}>
            <div style={{ width: 7, height: 7, backgroundColor: "#FF8A5B", display: "flex", transform: "rotate(45deg)" }} />
            <div style={{ width: 7, height: 7, backgroundColor: "#FFD166", display: "flex", transform: "rotate(45deg)" }} />
            <div style={{ width: 7, height: 7, backgroundColor: "#7BDFF2", display: "flex", transform: "rotate(45deg)" }} />
            <span style={{ fontSize: 12, color: "#8B776D", fontWeight: 700, marginLeft: 6 }}>
              퀴어문화축제에서 만나는 프리즘지점
            </span>
          </div>
        </div>

        {/* Right column — fortune card */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "58%",
            padding: "48px 52px 40px 32px",
            justifyContent: "center",
          }}
        >
          {/* Fortune card — frosted glass approximation */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              backgroundColor: "rgba(248, 247, 244, 0.85)",
              border: "1px solid rgba(30, 20, 10, 0.05)",
              borderRadius: 18,
              overflow: "hidden",
            }}
          >
            {/* Prismatic top accent */}
            <div
              style={{
                height: 4,
                background: "linear-gradient(90deg, #FF8A5B, #FFD166, #7BDFF2, #B8F2E6)",
                display: "flex",
                flexShrink: 0,
              }}
            />
            {/* FORTUNE label */}
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#B0A090",
                letterSpacing: 4,
                textAlign: "center",
                display: "flex",
                justifyContent: "center",
                padding: "18px 0 0",
              }}
            >
              FORTUNE
            </div>

            {/* Fortune lines */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "12px 28px 24px",
                gap: 4,
              }}
            >
              {lines.map((line: string, i: number) => (
                <div
                  key={i}
                  style={{
                    fontSize: 18,
                    lineHeight: 1.75,
                    color: "#2A1E15",
                    fontWeight: 700,
                    display: "flex",
                  }}
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>
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
