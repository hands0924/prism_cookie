function escapeXml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const source = text.trim();
  if (!source) {
    return [];
  }

  const words = source.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }
    const candidate = `${current} ${word}`;
    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines;
}

function flattenMessage(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    out.push(...wrapText(line, 26));
  }
  return out.slice(0, 6);
}

export function buildShareSvg(params: {
  title: string;
  breadName: string;
  resultType: string;
  typeName?: string;
  typeEmoji?: string;
  lines: string[];
}): string {
  const title = escapeXml(params.title.trim() || "당신을 위한 포춘쿠키 메시지");
  const breadName = escapeXml(params.breadName.trim() || "포춘쿠키");
  const resultType = escapeXml(params.resultType.trim() || "프리즘 포춘형");
  const typeName = escapeXml((params.typeName ?? "").trim() || `${resultType}`);
  const typeEmoji = escapeXml((params.typeEmoji ?? "").trim() || "🥞");
  const lines = flattenMessage(params.lines).map((line) => escapeXml(line));

  const messageElements = lines
    .map((line, index) => {
      const y = 274 + index * 50;
      const isLast = index === lines.length - 1;
      return `<text x="96" y="${y}" font-size="33" font-family="'Noto Sans KR', sans-serif" font-weight="${
        isLast ? "700" : "500"
      }" fill="${isLast ? "#ff7a59" : "#3e2d25"}">${line}</text>`;
    })
    .join("\n    ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="prism" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ff8a5b" />
      <stop offset="35%" stop-color="#ffd166" />
      <stop offset="70%" stop-color="#7bdff2" />
      <stop offset="100%" stop-color="#b8f2e6" />
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="#fff7ed" />
  <circle cx="1060" cy="96" r="136" fill="#ffd166" opacity="0.18" />
  <circle cx="940" cy="558" r="110" fill="#7bdff2" opacity="0.16" />

  <text x="96" y="76" font-size="20" font-family="'Noto Sans KR', sans-serif" font-weight="600" letter-spacing="2" fill="#7a685e">Prism Fortune Recipe</text>
  <text x="96" y="132" font-size="44" font-family="'Gaegu', 'Noto Sans KR', sans-serif" font-weight="700" fill="#3e2d25">${title}</text>
  <text x="96" y="168" font-size="24" font-family="'Noto Sans KR', sans-serif" font-weight="700" fill="#3e2d25">${typeEmoji} 당신은 ${typeName} 타입</text>
  <text x="96" y="200" font-size="24" font-family="'Noto Sans KR', sans-serif" font-weight="600" fill="#ff7a59">오늘의 빵: ${breadName}</text>

  <g>
    <rect x="72" y="208" width="760" height="340" rx="22" ry="22" fill="#fffdf8" />
    <rect x="72" y="208" width="760" height="8" fill="url(#prism)" />
    <circle cx="784" cy="520" r="90" fill="#ffd166" opacity="0.12" />
    ${messageElements}
  </g>

  <g transform="translate(870 178) scale(2.25)">
    <ellipse cx="70" cy="95" rx="50" ry="12" fill="#FFE0B2" opacity="0.3"/>
    <path d="M30 70 C30 40, 70 20, 70 50 C70 20, 110 40, 110 70 C110 90, 90 100, 70 95 C50 100, 30 90, 30 70Z" fill="#FFB74D"/>
    <path d="M30 70 C30 40, 70 20, 70 50 C70 65, 50 80, 30 70Z" fill="#FFCC80"/>
    <path d="M65 50 C68 60, 72 60, 75 50" stroke="#E09940" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <rect x="55" y="28" width="40" height="18" rx="2" fill="#FFFDF8" transform="rotate(-8 75 37)"/>
    <line x1="60" y1="33" x2="85" y2="31" stroke="#FFB74D" stroke-width="1" opacity="0.4" transform="rotate(-8 75 37)"/>
    <line x1="60" y1="38" x2="80" y2="36" stroke="#FFB74D" stroke-width="1" opacity="0.3" transform="rotate(-8 75 37)"/>
    <circle cx="25" cy="40" r="2" fill="#FFD166" opacity="0.6"/>
    <circle cx="115" cy="45" r="1.5" fill="#7BDFF2" opacity="0.5"/>
    <circle cx="105" cy="30" r="2" fill="#FF8A5B" opacity="0.4"/>
    <circle cx="35" cy="55" r="1.5" fill="#B8F2E6" opacity="0.5"/>
  </g>

  <text x="96" y="596" font-size="22" font-family="'Noto Sans KR', sans-serif" fill="#7a685e">포춘카드를 저장해 공유해보세요</text>
</svg>`;
}
