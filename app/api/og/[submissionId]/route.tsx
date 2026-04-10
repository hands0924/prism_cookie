import { ImageResponse } from "next/og";
import { getBreadName, getTypeProfile } from "@/lib/bread";
import { getServiceSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";

// Module-level font fetch — cached across invocations in the same isolate.
// Must use TTF (not woff2) because satori/resvg doesn't support woff2.
const fontPromise = fetch(
  "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-kr@latest/korean-700-normal.ttf",
).then((res) => {
  if (!res.ok) throw new Error(`font_fetch_${res.status}`);
  return res.arrayBuffer();
});

const HIGHLIGHT_BY_BREAD: Record<string, string> = {
  크루아상: "#D79A49",
  통밀식빵: "#8B6F47",
  팬케이크: "#FF7A59",
  프레첼: "#B36C2C",
  브리오슈: "#C98743",
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
    .map((line: string) => line.trim())
    .filter(Boolean)
    .slice(0, 5);
  const breadName = getBreadName(data.needed_thing);
  const profile = getTypeProfile(data.needed_thing);
  const title = `${data.name}님의 미래 레시피`;
  const highlight = HIGHLIGHT_BY_BREAD[breadName] ?? "#FF7A59";

  let fontData: ArrayBuffer;
  try {
    fontData = await fontPromise;
  } catch {
    // If CDN font fails, return a minimal SVG fallback
    const fallback = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#FFF7ED"/><text x="600" y="315" text-anchor="middle" font-size="36" fill="#3E2D25">${title}</text></svg>`;
    return new Response(fallback, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, s-maxage=10",
      },
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
          backgroundColor: "#FFF7ED",
          fontFamily: "Noto Sans KR",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glows */}
        <div
          style={{
            position: "absolute",
            top: -40,
            right: -20,
            width: 280,
            height: 280,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,209,102,0.22) 0%, transparent 70%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -30,
            left: -30,
            width: 240,
            height: 240,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(123,223,242,0.18) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Prism bar */}
        <div
          style={{
            height: 8,
            background:
              "linear-gradient(90deg, #FF8A5B, #FFD166, #7BDFF2, #B8F2E6)",
            display: "flex",
            flexShrink: 0,
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "24px 48px 20px",
            flex: 1,
          }}
        >
          {/* Label */}
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "#8C776B",
              letterSpacing: 3,
              display: "flex",
            }}
          >
            PRISM FUTURE RECIPE
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: 38,
              fontWeight: 700,
              color: "#3E2D25",
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
              gap: 10,
              marginTop: 10,
            }}
          >
            <span style={{ fontSize: 28 }}>{profile.typeEmoji}</span>
            <span
              style={{ fontSize: 22, fontWeight: 700, color: "#3E2D25" }}
            >
              {profile.typeName} 타입
            </span>
            <span
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: highlight,
                marginLeft: 8,
              }}
            >
              오늘의 빵: {breadName}
            </span>
          </div>

          {/* Message card */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              backgroundColor: "rgba(255,253,248,0.95)",
              borderRadius: 18,
              padding: "18px 24px",
              marginTop: 14,
              flex: 1,
              position: "relative",
              overflow: "hidden",
              border: "1px solid rgba(62,45,37,0.06)",
            }}
          >
            {/* Top gradient line */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                background:
                  "linear-gradient(90deg, #FF8A5B, #FFD166, #7BDFF2, #B8F2E6)",
                display: "flex",
              }}
            />

            {lines.map((line: string, i: number) => {
              const isLast = i === lines.length - 1;
              return (
                <div
                  key={i}
                  style={{
                    fontSize: 26,
                    lineHeight: 1.65,
                    color: isLast ? highlight : "#3E2D25",
                    fontWeight: 700,
                    display: "flex",
                    marginTop: i === 0 ? 6 : 0,
                  }}
                >
                  {line}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 10,
            }}
          >
            <span style={{ fontSize: 16, color: "#7A685E", fontWeight: 700 }}>
              포용적 금융서비스 프리즘지점
            </span>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: "#FF8A5B",
                  display: "flex",
                }}
              />
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: "#FFD166",
                  display: "flex",
                }}
              />
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: "#7BDFF2",
                  display: "flex",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Noto Sans KR",
          data: fontData,
          style: "normal" as const,
          weight: 700,
        },
      ],
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
