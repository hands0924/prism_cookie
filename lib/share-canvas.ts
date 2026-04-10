/**
 * Client-side Canvas-based PNG generator for share cards.
 * Produces a beautiful 1080×1440 portrait PNG with per-bread-type theming
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
  typeAreaBg: string;
  typeAreaStroke: string;
  highlight: string;
  glowColor: string;
};

const THEMES: Record<string, Theme> = {
  크루아상: {
    primary: "#D79A49",
    accent: "#F7D6A3",
    typeAreaBg: "#FFF8EE",
    typeAreaStroke: "#F0D49E",
    highlight: "#D79A49",
    glowColor: "#F7D6A3",
  },
  통밀식빵: {
    primary: "#8B6F47",
    accent: "#D4AA72",
    typeAreaBg: "#FFF6ED",
    typeAreaStroke: "#E8C9A0",
    highlight: "#8B6F47",
    glowColor: "#D4AA72",
  },
  팬케이크: {
    primary: "#FF8A5B",
    accent: "#FFD4B8",
    typeAreaBg: "#FFF5F0",
    typeAreaStroke: "#FFD4B8",
    highlight: "#FF7A59",
    glowColor: "#FFD4B8",
  },
  프레첼: {
    primary: "#B36C2C",
    accent: "#E1A158",
    typeAreaBg: "#FFF7ED",
    typeAreaStroke: "#E1C6A0",
    highlight: "#B36C2C",
    glowColor: "#E1A158",
  },
  브리오슈: {
    primary: "#C98743",
    accent: "#F2D6AF",
    typeAreaBg: "#FFF9F0",
    typeAreaStroke: "#F2D6AF",
    highlight: "#C98743",
    glowColor: "#F2D6AF",
  },
};

const DEFAULT_THEME: Theme = {
  primary: "#FF7A59",
  accent: "#FFD4B8",
  typeAreaBg: "#FFF5EE",
  typeAreaStroke: "#FFD4B8",
  highlight: "#FF7A59",
  glowColor: "#FFD4B8",
};

function getTheme(breadName: string): Theme {
  return THEMES[breadName] ?? DEFAULT_THEME;
}

const W = 1080;
const H = 1440;
const PAD = 72;
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

/** Character-level text wrapping using canvas measureText — works for Korean. */
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
  g.addColorStop(0.33, "#FFD166");
  g.addColorStop(0.66, "#7BDFF2");
  g.addColorStop(1, "#B8F2E6");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

function fillRadialGlow(
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

function drawDot(
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

/* ── Main generator ──────────────────────────────────────────────── */

export async function generateShareCardPng(input: ShareCardInput): Promise<{
  blob: Blob;
  file: File;
  previewUrl: string;
}> {
  // Wait for fonts to be available so measureText is accurate
  await Promise.all([
    document.fonts.load(`800 48px ${FONT}`),
    document.fonts.load(`700 36px ${FONT}`),
    document.fonts.load(`500 30px ${FONT}`),
    document.fonts.load(`400 24px ${FONT}`),
  ]);

  const theme = getTheme(input.breadName);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  /* ── Background ── */
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#FFF7ED");
  bg.addColorStop(1, "#FFFDF8");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Soft ambient glows
  fillRadialGlow(ctx, 920, 140, 200, "#FFD166", 0.12);
  fillRadialGlow(ctx, 160, 1300, 220, "#7BDFF2", 0.1);

  /* ── Outer card ── */
  const cX = 34,
    cY = 34,
    cW = W - 68,
    cH = H - 68;
  roundRect(ctx, cX, cY, cW, cH, 44);
  ctx.fillStyle = "rgba(255,253,248,0.97)";
  ctx.fill();
  ctx.strokeStyle = "rgba(62,45,37,0.05)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Prism bar at top
  ctx.save();
  ctx.beginPath();
  ctx.rect(cX, cY, cW, 10);
  ctx.clip();
  drawPrismBar(ctx, cX, cY, cW, 10);
  ctx.restore();

  /* ── Header ── */
  let y = 90;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 20px ${FONT}`;
  ctx.fillStyle = "#8C776B";
  ctx.fillText("P R I S M   F U T U R E   R E C I P E", W / 2, y);

  /* ── Title ── */
  y = 148;
  ctx.textBaseline = "alphabetic";
  ctx.font = `800 46px ${FONT}`;
  ctx.fillStyle = "#3E2D25";
  const titleLines = wrapText(ctx, `${input.name}님의 미래 레시피`, cW - 120);
  for (const line of titleLines) {
    ctx.fillText(line, W / 2, y);
    y += 60;
  }

  /* ── Type area ── */
  y += 16;
  const typeX = PAD;
  const typeW = W - PAD * 2;

  // Pre-compute description lines to size the box
  ctx.font = `400 24px ${FONT}`;
  const descLines = wrapText(ctx, input.typeDesc, typeW - 80);
  const typeH = 120 + 56 + 44 + 48 + descLines.length * 38 + 28;

  roundRect(ctx, typeX, y, typeW, typeH, 32);
  ctx.fillStyle = theme.typeAreaBg;
  ctx.fill();
  ctx.strokeStyle = theme.typeAreaStroke;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Accent glow inside type area
  ctx.save();
  roundRect(ctx, typeX, y, typeW, typeH, 32);
  ctx.clip();
  fillRadialGlow(ctx, typeX + typeW - 60, y + 40, 220, theme.glowColor, 0.18);
  ctx.restore();

  // Emoji
  let ty = y + 96;
  ctx.textAlign = "center";
  ctx.font = `400 80px ${EMOJI_FONT}`;
  ctx.fillText(input.typeEmoji, W / 2, ty);

  // Type name
  ty += 56;
  ctx.font = `700 34px ${FONT}`;
  ctx.fillStyle = "#3E2D25";
  ctx.fillText(`${input.typeName} 타입`, W / 2, ty);

  // Bread name
  ty += 44;
  ctx.font = `700 26px ${FONT}`;
  ctx.fillStyle = theme.highlight;
  ctx.fillText(`오늘의 빵: ${input.breadName}`, W / 2, ty);

  // Description
  ty += 48;
  ctx.textAlign = "left";
  ctx.font = `400 24px ${FONT}`;
  ctx.fillStyle = "#7A685E";
  for (const line of descLines) {
    ctx.fillText(line, typeX + 40, ty);
    ty += 38;
  }

  const typeEndY = y + typeH;

  /* ── Divider + label ── */
  let dy = typeEndY + 24;
  drawPrismBar(ctx, PAD + 40, dy, typeW - 80, 3);

  dy += 40;
  ctx.textAlign = "left";
  ctx.font = `600 21px ${FONT}`;
  ctx.fillStyle = "#7A685E";
  ctx.fillText("포용적 금융서비스 프리즘지점", PAD + 20, dy);

  const dotsX = W - PAD - 56;
  drawDot(ctx, dotsX, dy - 7, 6, "#FF8A5B");
  drawDot(ctx, dotsX + 22, dy - 7, 6, "#FFD166");
  drawDot(ctx, dotsX + 44, dy - 7, 6, "#7BDFF2");

  /* ── Message area ── */
  const msgY = dy + 30;
  const msgX = PAD;
  const msgW = typeW;

  ctx.font = `500 29px ${FONT}`;
  const allMsgLines: string[] = [];
  for (const line of input.message) {
    const t = line.trim();
    if (!t) continue;
    allMsgLines.push(...wrapText(ctx, t, msgW - 80));
  }
  const msgLines = allMsgLines.slice(0, 9);
  const msgLineH = 48;
  const msgPadV = 36;
  const msgH = msgPadV + msgLines.length * msgLineH + msgPadV;

  roundRect(ctx, msgX, msgY, msgW, msgH, 28);
  ctx.fillStyle = "#FFFDF8";
  ctx.fill();

  // Subtle glow bottom-right of message box
  ctx.save();
  roundRect(ctx, msgX, msgY, msgW, msgH, 28);
  ctx.clip();
  fillRadialGlow(
    ctx,
    msgX + msgW - 60,
    msgY + msgH - 40,
    160,
    theme.glowColor,
    0.1,
  );
  ctx.restore();

  // Message text
  ctx.textAlign = "left";
  let my = msgY + msgPadV + 28;
  for (let i = 0; i < msgLines.length; i++) {
    const isLast = i === msgLines.length - 1;
    ctx.font = isLast ? `700 29px ${FONT}` : `500 29px ${FONT}`;
    ctx.fillStyle = isLast ? theme.highlight : "#3E2D25";
    ctx.fillText(msgLines[i], msgX + 40, my);
    my += msgLineH;
  }

  /* ── Footer ── */
  const footerY = Math.max(msgY + msgH + 46, H - 130);
  ctx.textAlign = "center";
  ctx.font = `600 21px ${FONT}`;
  ctx.fillStyle = "#7A685E";
  ctx.fillText("서울퀴어문화축제에서 만나는 프리즘지점", W / 2, footerY);

  ctx.font = `500 19px ${FONT}`;
  ctx.fillStyle = "#8B776D";
  ctx.fillText("instagram.com/prism.fin", W / 2, footerY + 34);

  // Small prism dots at very bottom
  const bdY = footerY + 62;
  drawDot(ctx, W / 2 - 18, bdY, 5, "#FF8A5B");
  drawDot(ctx, W / 2, bdY, 5, "#FFD166");
  drawDot(ctx, W / 2 + 18, bdY, 5, "#7BDFF2");

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
