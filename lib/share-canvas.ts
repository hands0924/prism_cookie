/**
 * Client-side Canvas 2D share card generator.
 * 2x DPI 1080×1350 portrait PNG.
 *
 * Design matches the /r/ share page exactly:
 * thin prismatic bar, PRISM label, title, rule, emoji+type+pill,
 * description, prismatic divider, FORTUNE label, frosted fortune card,
 * diamond footer, @prism.fin handle.
 */

export type ShareCardInput = {
  name: string;
  breadName: string;
  typeName: string;
  typeEmoji: string;
  typeDesc: string;
  message: string[];
};

type Theme = { tagBg: string; tagText: string };

const THEMES: Record<string, Theme> = {
  크루아상: { tagBg: "#FFF0D6", tagText: "#9A7020" },
  통밀식빵: { tagBg: "#F4E8D8", tagText: "#5C4828" },
  팬케이크: { tagBg: "#FFE4DA", tagText: "#C44E28" },
  프레첼: { tagBg: "#F6E8D4", tagText: "#7A4810" },
  브리오슈: { tagBg: "#FFF0DA", tagText: "#8C5C28" },
};
const DEFAULT_THEME: Theme = { tagBg: "#FFE4DA", tagText: "#C44E28" };
function getTheme(b: string): Theme { return THEMES[b] ?? DEFAULT_THEME; }

const W = 1080;
const H = 1350;
const FONT = '"Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

/* ── Helpers ───────────────────────────────────────────────────── */

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const ch of text) {
    if (ch === "\n") { lines.push(cur); cur = ""; continue; }
    const test = cur + ch;
    if (ctx.measureText(test).width > maxW && cur.length > 0) { lines.push(cur); cur = ch; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

function drawPrismaticBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const g = ctx.createLinearGradient(x, y, x + w, y);
  g.addColorStop(0, "#FF8A5B");
  g.addColorStop(0.33, "#FFD166");
  g.addColorStop(0.66, "#7BDFF2");
  g.addColorStop(1, "#B8F2E6");
  ctx.fillStyle = g;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
}

function drawPill(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, bg: string, fg: string, fs: number) {
  ctx.font = `700 ${fs}px ${FONT}`;
  const m = ctx.measureText(text);
  const pw = m.width + fs * 1.4;
  const ph = fs * 2;
  roundRect(ctx, cx - pw / 2, cy - ph / 2, pw, ph, ph / 2);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = fg;
  ctx.fillText(text, cx, cy + 1);
}

function diamond(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = color;
  ctx.fillRect(-s / 2, -s / 2, s, s);
  ctx.restore();
}

/* ── Main generator ───────────────────────────────────────────── */

export async function generateShareCardPng(input: ShareCardInput): Promise<{
  blob: Blob;
  file: File;
  previewUrl: string;
}> {
  await Promise.all([
    document.fonts.load(`800 52px ${FONT}`),
    document.fonts.load(`700 28px ${FONT}`),
    document.fonts.load(`400 28px ${FONT}`),
  ]);

  const theme = getTheme(input.breadName);
  const DPR = 2;
  const canvas = document.createElement("canvas");
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(DPR, DPR);

  const PAD = 80;
  const CX = W / 2;
  const CONTENT_W = W - PAD * 2;

  /* ── Pre-calculate heights ── */
  ctx.font = `800 48px ${FONT}`;
  const titleLines = wrapText(ctx, `${input.name}님의 미래 레시피`, CONTENT_W);
  const titleLineH = 64;

  ctx.font = `400 26px ${FONT}`;
  const descLines = wrapText(ctx, input.typeDesc, CONTENT_W - 40);
  const descLineH = 40;

  ctx.font = `400 28px ${FONT}`;
  const allMsgLines: string[] = [];
  for (const line of input.message) {
    const t = line.trim();
    if (!t) continue;
    allMsgLines.push(...wrapText(ctx, t, CONTENT_W - 80));
  }
  const msgLines = allMsgLines.slice(0, 8);
  const msgLineH = 48;
  const msgPadV = 28;
  const msgCardH = msgPadV + msgLines.length * msgLineH + msgPadV;

  // Total content height for vertical centering
  const contentH =
    8 +                                  // prismatic bar
    56 +                                 // gap
    24 + 14 +                            // PRISM label + gap
    titleLines.length * titleLineH + 40 +// title + gap
    2 + 40 +                             // rule + gap
    90 + 20 +                            // emoji + gap
    40 + 20 +                            // type name + gap
    44 + 20 +                            // pill + gap
    descLines.length * descLineH + 32 +  // desc + gap
    6 + 28 +                             // prismatic divider + gap
    18 + 24 +                            // FORTUNE label + gap
    msgCardH + 32 +                      // fortune card + gap
    14 + 10 +                            // diamonds + gap
    24 + 4 +                             // footer text
    20;                                  // handle

  const startY = Math.max(40, (H - contentH) / 2);

  /* ── 1. Background ── */
  ctx.fillStyle = "#FAFAF7";
  ctx.fillRect(0, 0, W, H);

  let y = startY;

  /* ── 2. Thin prismatic bar ── */
  drawPrismaticBar(ctx, PAD, y, CONTENT_W, 8);
  y += 8 + 56;

  /* ── 3. PRISM label ── */
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 22px ${FONT}`;
  ctx.fillStyle = "#B0A090";
  ctx.fillText("P R I S M", CX, y + 12);
  y += 24 + 14;

  /* ── 4. Title ── */
  ctx.textBaseline = "alphabetic";
  ctx.font = `800 48px ${FONT}`;
  ctx.fillStyle = "#1A1410";
  for (const line of titleLines) {
    ctx.fillText(line, CX, y + 44);
    y += titleLineH;
  }
  y += 40;

  /* ── 5. Rule ── */
  ctx.fillStyle = "#E8E0D6";
  ctx.fillRect(CX - 160, y, 320, 2);
  y += 2 + 40;

  /* ── 6. Emoji ── */
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `400 80px ${EMOJI_FONT}`;
  ctx.fillText(input.typeEmoji, CX, y + 45);
  y += 90 + 20;

  /* ── 7. Type name ── */
  ctx.font = `800 36px ${FONT}`;
  ctx.fillStyle = "#1A1410";
  ctx.fillText(`${input.typeName} 타입`, CX, y + 20);
  y += 40 + 20;

  /* ── 8. Pill ── */
  drawPill(ctx, `오늘의 빵: ${input.breadName}`, CX, y + 22, theme.tagBg, theme.tagText, 22);
  y += 44 + 20;

  /* ── 9. Description ── */
  ctx.font = `400 26px ${FONT}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#8B7B6E";
  for (const line of descLines) {
    ctx.fillText(line, CX, y + 22);
    y += descLineH;
  }
  y += 32;

  /* ── 10. Prismatic divider ── */
  drawPrismaticBar(ctx, CX - 120, y, 240, 6);
  y += 6 + 28;

  /* ── 11. FORTUNE label ── */
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 18px ${FONT}`;
  ctx.fillStyle = "#B0A090";
  ctx.fillText("F O R T U N E", CX, y + 9);
  y += 18 + 24;

  /* ── 12. Fortune card — frosted glass ── */
  const cardX = PAD;
  // Card background
  roundRect(ctx, cardX, y, CONTENT_W, msgCardH, 24);
  ctx.fillStyle = "rgba(250,250,248,0.75)";
  ctx.fill();
  ctx.strokeStyle = "rgba(30,20,10,0.04)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Prismatic top accent
  ctx.save();
  roundRect(ctx, cardX, y, CONTENT_W, msgCardH, 24);
  ctx.clip();
  drawPrismaticBar(ctx, cardX, y, CONTENT_W, 6);
  ctx.restore();

  // Fortune text
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  let my = y + msgPadV + 30;
  for (const line of msgLines) {
    ctx.font = `400 28px ${FONT}`;
    ctx.fillStyle = "#2A1E15";
    ctx.fillText(line, cardX + 36, my);
    my += msgLineH;
  }
  y += msgCardH + 32;

  /* ── 13. Diamond footer ── */
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  diamond(ctx, CX - 20, y + 7, 12, "#FF8A5B");
  diamond(ctx, CX, y + 7, 12, "#FFD166");
  diamond(ctx, CX + 20, y + 7, 12, "#7BDFF2");
  y += 14 + 10;

  /* ── 14. Footer text ── */
  ctx.font = `600 20px ${FONT}`;
  ctx.fillStyle = "#8B776D";
  ctx.fillText("퀴어문화축제에서 만나는 프리즘지점", CX, y + 12);
  y += 24 + 4;

  ctx.font = `400 18px ${FONT}`;
  ctx.fillStyle = "#A89888";
  ctx.fillText("@prism.fin", CX, y + 10);

  /* ── Export ── */
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("canvas_blob_failed"))),
      "image/png",
    );
  });
  const previewUrl = URL.createObjectURL(blob);
  const file = new File([blob], "prism-fortune-card.png", { type: "image/png" });
  return { blob, file, previewUrl };
}
