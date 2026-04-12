/**
 * Client-side Canvas-based PNG generator for share cards.
 * Produces a polished 1080×1440 portrait PNG with per-bread-type theming
 * and proper Korean character-level text wrapping.
 */

export type ShareCardInput = {
  name: string;
  breadName: string;
  typeName: string;
  typeEmoji: string;
  typeDesc: string;
  message: string[];
};

type Theme = {
  primary: string;
  accent: string;
  accentSoft: string;
  typeAreaBg: string;
  typeAreaStroke: string;
  highlight: string;
  glowColor: string;
  tagBg: string;
  tagText: string;
};

const THEMES: Record<string, Theme> = {
  크루아상: {
    primary: "#C08B30",
    accent: "#F7D6A3",
    accentSoft: "#FFF3DD",
    typeAreaBg: "#FFFAF2",
    typeAreaStroke: "#F0D49E",
    highlight: "#C08B30",
    glowColor: "#F7D6A3",
    tagBg: "#FFF0D6",
    tagText: "#A67A28",
  },
  통밀식빵: {
    primary: "#7A6040",
    accent: "#D4AA72",
    accentSoft: "#FFF3E5",
    typeAreaBg: "#FFF8F0",
    typeAreaStroke: "#E8C9A0",
    highlight: "#7A6040",
    glowColor: "#D4AA72",
    tagBg: "#FAEBD7",
    tagText: "#6B5335",
  },
  팬케이크: {
    primary: "#E8643E",
    accent: "#FFD4B8",
    accentSoft: "#FFF0E8",
    typeAreaBg: "#FFF7F2",
    typeAreaStroke: "#FFDCC8",
    highlight: "#E8643E",
    glowColor: "#FFD4B8",
    tagBg: "#FFE8DA",
    tagText: "#C84E2D",
  },
  프레첼: {
    primary: "#9E5E22",
    accent: "#E1A158",
    accentSoft: "#FFF3E5",
    typeAreaBg: "#FFFAF2",
    typeAreaStroke: "#E1C6A0",
    highlight: "#9E5E22",
    glowColor: "#E1A158",
    tagBg: "#FAECD6",
    tagText: "#86501C",
  },
  브리오슈: {
    primary: "#B07438",
    accent: "#F2D6AF",
    accentSoft: "#FFF8ED",
    typeAreaBg: "#FFFBF4",
    typeAreaStroke: "#F2D6AF",
    highlight: "#B07438",
    glowColor: "#F2D6AF",
    tagBg: "#FFF0DA",
    tagText: "#966230",
  },
};

const DEFAULT_THEME: Theme = {
  primary: "#E8643E",
  accent: "#FFD4B8",
  accentSoft: "#FFF0E8",
  typeAreaBg: "#FFF7F2",
  typeAreaStroke: "#FFDCC8",
  highlight: "#E8643E",
  glowColor: "#FFD4B8",
  tagBg: "#FFE8DA",
  tagText: "#C84E2D",
};

function getTheme(breadName: string): Theme {
  return THEMES[breadName] ?? DEFAULT_THEME;
}

const W = 1080;
const H = 1440;
const PAD = 64;
const INNER = W - PAD * 2;
const FONT = '"Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
const EMOJI_FONT =
  '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif';

/* ── Drawing helpers ─────────────────────────────────────────────── */

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
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

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let current = "";
  for (const char of text) {
    if (char === "\n") {
      lines.push(current);
      current = "";
      continue;
    }
    const test = current + char;
    if (ctx.measureText(test).width > maxWidth && current.length > 0) {
      lines.push(current);
      current = char;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function drawPrismBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const g = ctx.createLinearGradient(x, y, x + w, y);
  g.addColorStop(0, "#FF8A5B");
  g.addColorStop(0.3, "#FFD166");
  g.addColorStop(0.6, "#7BDFF2");
  g.addColorStop(1, "#B8F2E6");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

function fillGlow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string,
  alpha: number,
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function dot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawPill(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  bg: string,
  fg: string,
  fontSize: number,
) {
  ctx.font = `700 ${fontSize}px ${FONT}`;
  const m = ctx.measureText(text);
  const pw = m.width + fontSize * 1.6;
  const ph = fontSize * 2;
  roundRect(ctx, cx - pw / 2, cy - ph / 2, pw, ph, ph / 2);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = fg;
  ctx.fillText(text, cx, cy + 1);
}

/* ── Main generator ──────────────────────────────────────────────── */

export async function generateShareCardPng(input: ShareCardInput): Promise<{
  blob: Blob;
  file: File;
  previewUrl: string;
}> {
  await Promise.all([
    document.fonts.load(`800 60px ${FONT}`),
    document.fonts.load(`700 42px ${FONT}`),
    document.fonts.load(`500 34px ${FONT}`),
    document.fonts.load(`400 30px ${FONT}`),
  ]);

  const theme = getTheme(input.breadName);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  /* ── Background ── */
  ctx.fillStyle = "#FFF9F2";
  ctx.fillRect(0, 0, W, H);

  fillGlow(ctx, 900, 80, 300, "#FFD166", 0.1);
  fillGlow(ctx, 160, 1360, 300, "#7BDFF2", 0.08);
  fillGlow(ctx, W / 2, 700, 440, theme.glowColor, 0.06);

  /* ── Outer card ── */
  const cX = 36,
    cY = 36,
    cW = W - 72,
    cH = H - 72;
  ctx.save();
  ctx.shadowColor = "rgba(62,45,37,0.08)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 12;
  roundRect(ctx, cX, cY, cW, cH, 44);
  ctx.fillStyle = "#FFFDF9";
  ctx.fill();
  ctx.restore();
  roundRect(ctx, cX, cY, cW, cH, 44);
  ctx.strokeStyle = "rgba(62,45,37,0.05)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Prism bar
  ctx.save();
  ctx.beginPath();
  ctx.rect(cX, cY, cW, 12);
  ctx.clip();
  drawPrismBar(ctx, cX, cY, cW, 12);
  ctx.restore();

  /* ── Header ── */
  let y = 98;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 22px ${FONT}`;
  ctx.fillStyle = "#A89888";
  ctx.fillText("P R I S M   F U T U R E   R E C I P E", W / 2, y);

  /* ── Title ── */
  y = 176;
  ctx.textBaseline = "alphabetic";
  ctx.font = `800 56px ${FONT}`;
  ctx.fillStyle = "#2E1F15";
  const titleLines = wrapText(
    ctx,
    `${input.name}님의 미래 레시피`,
    cW - 100,
  );
  for (const line of titleLines) {
    ctx.fillText(line, W / 2, y);
    y += 72;
  }

  // Decorative line under title
  y += 4;
  ctx.strokeStyle = "rgba(62,45,37,0.06)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD + 40, y);
  ctx.lineTo(W - PAD - 40, y);
  ctx.stroke();

  /* ── Type area ── */
  y += 24;
  const typeX = PAD;

  ctx.font = `400 28px ${FONT}`;
  const descLines = wrapText(ctx, input.typeDesc, INNER - 80);
  const typeH = 120 + 64 + 60 + 18 + descLines.length * 42 + 40;

  roundRect(ctx, typeX, y, INNER, typeH, 32);
  ctx.fillStyle = theme.typeAreaBg;
  ctx.fill();
  ctx.strokeStyle = theme.typeAreaStroke;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.save();
  roundRect(ctx, typeX, y, INNER, typeH, 32);
  ctx.clip();
  fillGlow(ctx, typeX + INNER - 40, y + 30, 240, theme.glowColor, 0.16);
  ctx.restore();

  // Emoji — big and bold
  let ty = y + 100;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `400 96px ${EMOJI_FONT}`;
  ctx.fillText(input.typeEmoji, W / 2, ty);

  // Type name
  ty += 64;
  ctx.font = `700 40px ${FONT}`;
  ctx.fillStyle = "#2E1F15";
  ctx.fillText(`${input.typeName} 타입`, W / 2, ty);

  // Bread name pill — larger
  ty += 60;
  drawPill(
    ctx,
    `오늘의 빵: ${input.breadName}`,
    W / 2,
    ty,
    theme.tagBg,
    theme.tagText,
    24,
  );

  // Description
  ty += 50;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `400 28px ${FONT}`;
  ctx.fillStyle = "#7A685E";
  for (const line of descLines) {
    ctx.fillText(line, W / 2, ty);
    ty += 42;
  }

  const typeEndY = y + typeH;

  /* ── Divider ── */
  let dy = typeEndY + 28;
  const divW = 240;
  drawPrismBar(ctx, W / 2 - divW / 2, dy, divW, 4);

  /* ── Message area ── */
  dy += 36;
  const msgX = PAD;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `500 19px ${FONT}`;
  ctx.fillStyle = "#A89888";
  ctx.fillText("F O R T U N E   M E S S A G E", W / 2, dy);
  dy += 32;

  ctx.font = `500 34px ${FONT}`;
  ctx.textBaseline = "alphabetic";
  const allMsgLines: string[] = [];
  for (const line of input.message) {
    const t = line.trim();
    if (!t) continue;
    allMsgLines.push(...wrapText(ctx, t, INNER - 72));
  }
  const msgLines = allMsgLines.slice(0, 8);
  const msgLineH = 56;
  const msgPadV = 36;
  const msgH = msgPadV + msgLines.length * msgLineH + msgPadV;

  ctx.save();
  ctx.shadowColor = "rgba(62,45,37,0.04)";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 4;
  roundRect(ctx, msgX, dy, INNER, msgH, 28);
  ctx.fillStyle = "#FFFEFB";
  ctx.fill();
  ctx.restore();
  roundRect(ctx, msgX, dy, INNER, msgH, 28);
  ctx.strokeStyle = "rgba(62,45,37,0.04)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.save();
  roundRect(ctx, msgX, dy, INNER, msgH, 28);
  ctx.clip();
  fillGlow(ctx, msgX + INNER - 50, dy + msgH - 30, 160, theme.glowColor, 0.1);
  ctx.restore();

  // Message text — nice and readable
  ctx.textAlign = "left";
  let my = dy + msgPadV + 32;
  for (let i = 0; i < msgLines.length; i++) {
    ctx.font = `400 34px ${FONT}`;
    ctx.fillStyle = "#3E2D25";
    ctx.fillText(msgLines[i], msgX + 36, my);
    my += msgLineH;
  }

  /* ── Footer ── */
  const footerY = Math.max(dy + msgH + 24, H - 120);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  dot(ctx, W / 2 - 22, footerY, 6, "#FF8A5B");
  dot(ctx, W / 2, footerY, 6, "#FFD166");
  dot(ctx, W / 2 + 22, footerY, 6, "#7BDFF2");

  ctx.font = `600 22px ${FONT}`;
  ctx.fillStyle = "#8B776D";
  ctx.fillText("서울퀴어문화축제에서 만나는 프리즘지점", W / 2, footerY + 34);

  ctx.font = `400 19px ${FONT}`;
  ctx.fillStyle = "#A89888";
  ctx.fillText("@prism.fin", W / 2, footerY + 62);

  /* ── Export PNG ── */
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("canvas_blob_failed"))),
      "image/png",
    );
  });

  const previewUrl = URL.createObjectURL(blob);
  const file = new File([blob], "prism-fortune-card.png", {
    type: "image/png",
  });

  return { blob, file, previewUrl };
}
