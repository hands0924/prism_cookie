import { ImageResponse } from "next/og";
import { getBreadMeta } from "@/lib/bread";
import { getServiceSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";

const fontBoldPromise = fetch(
  "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-kr@latest/korean-700-normal.ttf",
).then((res) => {
  if (!res.ok) throw new Error(`font_fetch_bold_${res.status}`);
  return res.arrayBuffer();
});

const fontRegularPromise = fetch(
  "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-kr@latest/korean-400-normal.ttf",
).then((res) => {
  if (!res.ok) throw new Error(`font_fetch_regular_${res.status}`);
  return res.arrayBuffer();
});

const PILL: Record<string, { bg: string; fg: string }> = {
  팬케이크: { bg: "#FFE4DA", fg: "#C44E28" },
  크루아상: { bg: "#FFF0D6", fg: "#9A7020" },
  베이글: { bg: "#F4E8D8", fg: "#7A5C30" },
  와플: { bg: "#FFF3D6", fg: "#8A6820" },
  바게트: { bg: "#F6E8D4", fg: "#7A4810" },
  식빵: { bg: "#FFF0DA", fg: "#8C5C28" },
};

export async function GET(
  _: Request,
  context: { params: Promise<{ submissionId: string }> },
) {
  const { submissionId } = await context.params;
  const supabase = getServiceSupabaseClient();
  const { data } = await supabase
    .from("submissions")
    .select("id, name, concern, protect_target, generated_message")
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
  const meta = getBreadMeta(data.concern, data.protect_target);
  const title = `${data.name}님의 미래 레시피`;
  const pill = PILL[meta.breadName] ?? { bg: "#FFE4DA", fg: "#C44E28" };

  let fontBold: ArrayBuffer;
  let fontRegular: ArrayBuffer;
  try {
    [fontBold, fontRegular] = await Promise.all([fontBoldPromise, fontRegularPromise]);
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
          flexDirection: "row",
          alignItems: "stretch",
          width: "100%",
          height: "100%",
          backgroundColor: "#FAFAF7",
          fontFamily: "Noto Sans KR",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Prismatic top bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 5,
            background: "linear-gradient(90deg, #FF8A5B 0%, #FFD166 28%, #7BDFF2 56%, #B8F2E6 84%, #A8E6CF 100%)",
            display: "flex",
          }}
        />

        {/* Left side — emoji hero with warm glow */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: 380,
            position: "relative",
          }}
        >
          {/* Subtle warm glow behind emoji */}
          <div
            style={{
              position: "absolute",
              width: 300,
              height: 300,
              borderRadius: 150,
              background: `radial-gradient(circle, ${pill.bg}33 0%, ${pill.bg}11 40%, transparent 70%)`,
              display: "flex",
            }}
          />
          <div style={{ fontSize: 140, lineHeight: 1, display: "flex", position: "relative" }}>
            {meta.typeEmoji}
          </div>
        </div>

        {/* Right side — text content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            paddingRight: 56,
            paddingLeft: 8,
          }}
        >
          {/* PRISM label */}
          <div style={{ fontSize: 16, fontWeight: 700, color: "#A09080", letterSpacing: 6, display: "flex", marginBottom: 8 }}>
            P R I S M
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: 46,
              fontWeight: 700,
              color: "#1A1410",
              lineHeight: 1.25,
              display: "flex",
              marginBottom: 12,
            }}
          >
            {title}
          </div>

          {/* Rule */}
          <div style={{ width: 200, height: 1, backgroundColor: "#E8E0D6", display: "flex", marginBottom: 12 }} />

          {/* Type name */}
          <div style={{ fontSize: 20, fontWeight: 700, color: "#1A1410", display: "flex", marginBottom: 8 }}>
            {meta.typeName} 타입
          </div>

          {/* Type description */}
          <div style={{ fontSize: 15, fontWeight: 400, color: "#8B7B6E", lineHeight: 1.6, display: "flex", maxWidth: 580, marginBottom: 16 }}>
            {meta.typeDesc}
          </div>

          {/* Fortune card */}
          {teaser && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                backgroundColor: "rgba(255,255,255,0.6)",
                border: "1px solid rgba(30,20,10,0.05)",
                borderRadius: 14,
                padding: "14px 20px",
                maxWidth: 580,
                marginBottom: 16,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Prismatic accent on card */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  background: "linear-gradient(90deg, #FF8A5B, #FFD166, #7BDFF2, #B8F2E6)",
                  display: "flex",
                }}
              />
              <div style={{ fontSize: 17, fontWeight: 400, color: "#2A1E15", lineHeight: 1.6, display: "flex" }}>
                {teaser.length > 65 ? teaser.slice(0, 63) + "..." : teaser}
              </div>
            </div>
          )}

          {/* Footer row: diamonds + text */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 8, height: 8, backgroundColor: "#FF8A5B", display: "flex", transform: "rotate(45deg)" }} />
            <div style={{ width: 8, height: 8, backgroundColor: "#FFD166", display: "flex", transform: "rotate(45deg)" }} />
            <div style={{ width: 8, height: 8, backgroundColor: "#7BDFF2", display: "flex", transform: "rotate(45deg)" }} />
            <span style={{ fontSize: 14, color: "#8B7B6E", fontWeight: 400, marginLeft: 6 }}>
              포용적 금융서비스, 프리즘지점 · @prism.fin
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Noto Sans KR", data: fontBold, style: "normal" as const, weight: 700 },
        { name: "Noto Sans KR", data: fontRegular, style: "normal" as const, weight: 400 },
      ],
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
