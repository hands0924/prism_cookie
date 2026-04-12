/**
 * Client-side Canvas 2D share card generator.
 * 2x DPI 1080×1440 portrait PNG with prismatic light refraction effects.
 *
 * Design: Content is vertically centered in the card so whitespace
 * distributes evenly top and bottom. Prismatic diagonal bands create
 * atmosphere. Open layout, no nested cards.
 */

export type ShareCardInput = {
  name: string;
  breadName: string;
  typeName: string;
  typeEmoji: string;
  typeDesc: string;
  message: string[];
};

type Theme = { primary: string; tagBg: string; tagText: string };

const THEMES: Record<string, Theme> = {
  크루아상: { primary: "#C08B30", tagBg: "#FFF0D6", tagText: "#9A7020" },
  통밀식빵: { primary: "#7A6040", tagBg: "#F4E8D8", tagText: "#5C4828" },
  팬케이크: { primary: "#E8643E", tagBg: "#FFE4DA", tagText: "#C44E28" },
  프레첼: { primary: "#9E5E22", tagBg: "#F6E8D4", tagText: "#7A4810" },
  브리오슈: { primary: "#B07438", tagBg: "#FFF0DA", tagText: "#8C5C28" },
};
const DEFAULT_THEME: Theme = { primary: "#E8643E", tagBg: "#FFE4DA", tagText: "#C44E28" };
function getTheme(b: string): Theme { return THEMES[b] ?? DEFAULT_THEME; }

const W = 1080;
const H = 1350; // 4:5 — Instagram's max portrait ratio
const PAD = 80;
const INNER = W - PAD * 2;
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

function drawPrismaticBand(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, len: number, thickness: number,
  angleDeg: number, alpha: number,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((angleDeg * Math.PI) / 180);
  const layers = 5;
  for (let i = layers; i >= 0; i--) {
    const t = thickness + i * 28;
    const a = alpha * (1 - i * 0.18);
    if (a <= 0) continue;
    ctx.globalAlpha = a;
    const g = ctx.createLinearGradient(-len / 2, 0, len / 2, 0);
    g.addColorStop(0, "rgba(255,138,91,0)");
    g.addColorStop(0.1, "rgba(255,138,91,1)");
    g.addColorStop(0.3, "rgba(255,209,102,1)");
    g.addColorStop(0.5, "rgba(123,223,242,1)");
    g.addColorStop(0.7, "rgba(184,242,230,1)");
    g.addColorStop(0.9, "rgba(184,242,230,0)");
    g.addColorStop(1, "rgba(255,138,91,0)");
    ctx.fillStyle = g;
    ctx.fillRect(-len / 2, -t / 2, len, t);
  }
  ctx.restore();
}

function drawPrismaticLine(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const g = ctx.createLinearGradient(x, y, x + w, y);
  g.addColorStop(0, "#FF8A5B");
  g.addColorStop(0.3, "#FFD166");
  g.addColorStop(0.6, "#7BDFF2");
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
    document.fonts.load(`800 60px ${FONT}`),
    document.fonts.load(`700 36px ${FONT}`),
    document.fonts.load(`400 32px ${FONT}`),
  ]);

  const theme = getTheme(input.breadName);
  const DPR = 2;
  const canvas = document.createElement("canvas");
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(DPR, DPR);

  /* ── Pre-calculate all content heights for vertical centering ── */
  const cW = W - 56;

  // Title
  ctx.font = `800 56px ${FONT}`;
  const titleLines = wrapText(ctx, `${input.name}님의 미래 레시피`, cW - 140);
  const titleH = titleLines.length * 68;

  // Description
  ctx.font = `400 24px ${FONT}`;
  const descLines = wrapText(ctx, input.typeDesc, INNER - 40);
  const descH = descLines.length * 36;

  // Message
  ctx.font = `400 30px ${FONT}`;
  const allMsgLines: string[] = [];
  for (const line of input.message) {
    const t = line.trim();
    if (!t) continue;
    allMsgLines.push(...wrapText(ctx, t, INNER - 64));
  }
  const msgLines = allMsgLines.slice(0, 7);
  const msgLineH = 50;
  const msgPadV = 28;
  const msgH = msgPadV + msgLines.length * msgLineH + msgPadV;

  // Total content block height
  const GAP = 28;  // standard gap between sections
  const headerH = 16;                       // "PRISM"
  const ruleH = 1;
  const emojiH = 80;                        // emoji
  const typeNameH = 36;                     // type name
  const pillH = 42;                         // pill
  const dividerH = 3;                       // prismatic line
  const fortuneLabelH = 14;                 // "FORTUNE"
  const footerH = 70;                       // diamonds + text + handle

  const totalH =
    headerH + GAP * 0.6 +
    titleH + GAP * 0.6 +
    ruleH + GAP +
    emojiH + 12 +
    typeNameH + 14 +
    pillH + 10 +
    descH + GAP +
    dividerH + GAP * 0.8 +
    fortuneLabelH + GAP * 0.7 +
    msgH + GAP +
    footerH;

  // Vertical centering — start Y so content is centered in the card
  const startY = Math.max(48, (H - totalH) / 2);

  /* ── 1. Background ── */
  ctx.fillStyle = "#FAFAF7";
  ctx.fillRect(0, 0, W, H);

  /* ── 2. Prismatic light bands — MORE VISIBLE ── */
  drawPrismaticBand(ctx, W * 0.4, startY + totalH * 0.15, 1600, 100, -18, 0.10);
  drawPrismaticBand(ctx, W * 0.6, startY + totalH * 0.85, 1400, 80, -14, 0.07);

  /* ── 3. Card — subtle frosted container ── */
  const cX = 28, cY = 28, cH = H - 56;
  ctx.save();
  ctx.shadowColor = "rgba(30,20,10,0.04)";
  ctx.shadowBlur = 48;
  ctx.shadowOffsetY = 6;
  roundRect(ctx, cX, cY, cW, cH, 36);
  ctx.fillStyle = "rgba(255,253,250,0.85)";
  ctx.fill();
  ctx.restore();

  /* ── Draw content from startY ── */
  let y = startY;

  // "PRISM" header
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 15px ${FONT}`;
  ctx.fillStyle = "#B0A090";
  ctx.fillText("P R I S M", W / 2, y + 8);
  y += headerH + GAP * 0.6;

  // Title
  ctx.textBaseline = "alphabetic";
  ctx.font = `800 56px ${FONT}`;
  ctx.fillStyle = "#1A1410";
  for (const line of titleLines) {
    ctx.fillText(line, W / 2, y + 48);
    y += 68;
  }
  y += GAP * 0.6;

  // Thin rule
  ctx.fillStyle = "#E8E0D6";
  ctx.fillRect(W / 2 - 140, y, 280, 1);
  y += ruleH + GAP;

  // Emoji with glow
  ctx.save();
  ctx.globalAlpha = 0.10;
  const eg = ctx.createRadialGradient(W / 2, y + 40, 0, W / 2, y + 40, 80);
  eg.addColorStop(0, theme.primary);
  eg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = eg;
  ctx.beginPath();
  ctx.arc(W / 2, y + 40, 80, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `400 76px ${EMOJI_FONT}`;
  ctx.fillText(input.typeEmoji, W / 2, y + 40);
  y += emojiH + 12;

  // Type name
  ctx.font = `800 34px ${FONT}`;
  ctx.fillStyle = "#1A1410";
  ctx.fillText(`${input.typeName} 타입`, W / 2, y + 18);
  y += typeNameH + 14;

  // Pill
  drawPill(ctx, `오늘의 빵: ${input.breadName}`, W / 2, y + 20, theme.tagBg, theme.tagText, 20);
  y += pillH + 10;

  // Description
  ctx.font = `400 24px ${FONT}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#8B7B6E";
  for (const line of descLines) {
    ctx.fillText(line, W / 2, y + 20);
    y += 36;
  }
  y += GAP;

  // Prismatic divider
  drawPrismaticLine(ctx, W / 2 - 100, y, 200, 3);
  y += dividerH + GAP * 0.8;

  // "FORTUNE" label
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 13px ${FONT}`;
  ctx.fillStyle = "#B0A090";
  ctx.fillText("F O R T U N E", W / 2, y + 7);
  y += fortuneLabelH + GAP * 0.7;

  // Message area
  const msgX = PAD;
  roundRect(ctx, msgX, y, INNER, msgH, 20);
  ctx.fillStyle = "rgba(250,250,248,0.7)";
  ctx.fill();
  ctx.strokeStyle = "rgba(30,20,10,0.04)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Prismatic top accent
  ctx.save();
  roundRect(ctx, msgX, y, INNER, msgH, 20);
  ctx.clip();
  drawPrismaticLine(ctx, msgX, y, INNER, 3);
  ctx.restore();

  // Message text
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  let my = y + msgPadV + 26;
  for (const line of msgLines) {
    ctx.font = `400 30px ${FONT}`;
    ctx.fillStyle = "#2A1E15";
    ctx.fillText(line, msgX + 32, my);
    my += msgLineH;
  }
  y += msgH + GAP;

  // Footer
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  diamond(ctx, W / 2 - 24, y + 8, 7, "#FF8A5B");
  diamond(ctx, W / 2, y + 8, 7, "#FFD166");
  diamond(ctx, W / 2 + 24, y + 8, 7, "#7BDFF2");

  ctx.font = `600 18px ${FONT}`;
  ctx.fillStyle = "#8B776D";
  ctx.fillText("퀴어문화축제에서 만나는 프리즘지점", W / 2, y + 34);

  ctx.font = `400 15px ${FONT}`;
  ctx.fillStyle = "#A89888";
  ctx.fillText("@prism.fin", W / 2, y + 56);

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
