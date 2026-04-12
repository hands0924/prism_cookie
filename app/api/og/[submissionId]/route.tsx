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
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: "#FAFAF7",
          fontFamily: "Noto Sans KR",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Prismatic light — soft diagonal band */}
        <div
          style={{
            position: "absolute",
            top: -80,
            left: -200,
            width: 1600,
            height: 120,
            transform: "rotate(-12deg)",
            background: "linear-gradient(90deg, rgba(255,138,91,0) 0%, rgba(255,138,91,0.06) 15%, rgba(255,209,102,0.06) 35%, rgba(123,223,242,0.06) 55%, rgba(184,242,230,0.06) 75%, rgba(184,242,230,0) 100%)",
            display: "flex",
          }}
        />

        {/* Prismatic bar */}
        <div
          style={{
            height: 5,
            background: "linear-gradient(90deg, #FF8A5B, #FFD166, #7BDFF2, #B8F2E6)",
            display: "flex",
            flexShrink: 0,
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "26px 52px 22px",
            flex: 1,
          }}
        >
          {/* Label */}
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#B0A090",
              letterSpacing: 5,
              display: "flex",
            }}
          >
            PRISM
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: 38,
              fontWeight: 700,
              color: "#1A1410",
              marginTop: 6,
              display: "flex",
              lineHeight: 1.3,
            }}
          >
            {title}
          </div>

          {/* Type row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
              marginTop: 14,
            }}
          >
            <span style={{ fontSize: 26 }}>{meta.typeEmoji}</span>
            <span style={{ fontSize: 19, fontWeight: 700, color: "#1A1410" }}>
              {meta.typeName} 타입
            </span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: pill.fg,
                backgroundColor: pill.bg,
                padding: "4px 12px",
                borderRadius: 16,
              }}
            >
              오늘의 빵: {meta.breadName}
            </span>
          </div>

          {/* Fortune lines */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 20,
              paddingTop: 16,
              borderTop: "2px solid transparent",
              borderImage: "linear-gradient(90deg, #FF8A5B, #FFD166, #7BDFF2, #B8F2E6) 1",
              flex: 1,
              gap: 2,
            }}
          >
            {lines.map((line: string, i: number) => (
              <div
                key={i}
                style={{
                  fontSize: 22,
                  lineHeight: 1.65,
                  color: "#2A1E15",
                  fontWeight: 700,
                  display: "flex",
                }}
              >
                {line}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 8,
            }}
          >
            <span style={{ fontSize: 14, color: "#8B776D", fontWeight: 700 }}>
              퀴어문화축제에서 만나는 프리즘지점
            </span>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <div style={{ width: 8, height: 8, borderRadius: 1, backgroundColor: "#FF8A5B", display: "flex", transform: "rotate(45deg)" }} />
              <div style={{ width: 8, height: 8, borderRadius: 1, backgroundColor: "#FFD166", display: "flex", transform: "rotate(45deg)" }} />
              <div style={{ width: 8, height: 8, borderRadius: 1, backgroundColor: "#7BDFF2", display: "flex", transform: "rotate(45deg)" }} />
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
