const SVG_WIDTH = 1080;
const SVG_HEIGHT = 1440;
const CARD_X = 72;
const CARD_Y = 182;
const CARD_WIDTH = SVG_WIDTH - CARD_X * 2;
const CARD_HEIGHT = 1010;

type ShareCardInput = {
  name: string;
  breadName: string;
  typeName: string;
  typeDesc: string;
  message: string[];
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapText(text: string, maxChars: number): string[] {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return [""];
  }

  const words = normalized.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      current = word;
      continue;
    }

    let remainder = word;
    while (remainder.length > maxChars) {
      lines.push(remainder.slice(0, maxChars));
      remainder = remainder.slice(maxChars);
    }
    current = remainder;
  }

  if (current) {
    lines.push(current);
  }

  return lines.length ? lines : [normalized];
}

function createTextBlock(lines: string[], x: number, startY: number, lineHeight: number, fontSize: number): string {
  return lines
    .map((line, index) => {
      const y = startY + index * lineHeight;
      return `<text x="${x}" y="${y}" font-family="'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" font-size="${fontSize}" font-weight="500" fill="#3E2D25">${escapeXml(line)}</text>`;
    })
    .join("");
}

function createCenteredTextBlock(
  lines: string[],
  x: number,
  startY: number,
  lineHeight: number,
  fontSize: number,
  fontWeight = 700,
  fill = "#3E2D25"
): string {
  return lines
    .map((line, index) => {
      const y = startY + index * lineHeight;
      return `<text x="${x}" y="${y}" text-anchor="middle" font-family="'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" font-size="${fontSize}" font-weight="${fontWeight}" fill="${fill}">${escapeXml(line)}</text>`;
    })
    .join("");
}

function getBreadSvg(breadName: string): string {
  switch (breadName) {
    case "크루아상":
      return `
        <g transform="translate(120 308)">
          <ellipse cx="130" cy="122" rx="124" ry="42" fill="#F7D6A3" opacity="0.32"/>
          <path d="M28 108 C40 42, 120 8, 180 26 C236 42, 274 86, 246 126 C220 164, 140 170, 82 156 C40 146, 18 132, 28 108Z" fill="#D79A49"/>
          <path d="M72 76 C108 48, 176 46, 214 82" stroke="#F7C26D" stroke-width="24" stroke-linecap="round" fill="none"/>
          <path d="M74 118 C112 88, 170 86, 206 116" stroke="#F7C26D" stroke-width="20" stroke-linecap="round" fill="none" opacity="0.9"/>
          <path d="M92 58 C102 82, 102 128, 90 148" stroke="#B7772E" stroke-width="8" stroke-linecap="round"/>
          <path d="M148 42 C156 70, 156 132, 146 156" stroke="#B7772E" stroke-width="8" stroke-linecap="round"/>
          <path d="M198 54 C206 84, 204 128, 192 148" stroke="#B7772E" stroke-width="8" stroke-linecap="round"/>
        </g>
      `;
    case "통밀식빵":
      return `
        <g transform="translate(120 308)">
          <ellipse cx="130" cy="124" rx="112" ry="36" fill="#F2D2A7" opacity="0.34"/>
          <path d="M44 148 L44 74 C44 30, 86 18, 124 28 C162 12, 214 24, 214 78 L214 148 Z" fill="#D39A58"/>
          <path d="M60 144 L60 80 C60 48, 92 42, 122 50 C152 38, 198 48, 198 84 L198 144 Z" fill="#F0C27B"/>
          <circle cx="90" cy="96" r="8" fill="#C18A48"/>
          <circle cx="126" cy="112" r="6" fill="#C18A48"/>
          <circle cx="160" cy="90" r="7" fill="#C18A48"/>
          <circle cx="178" cy="118" r="5" fill="#C18A48"/>
        </g>
      `;
    case "팬케이크":
      return `
        <g transform="translate(120 308)">
          <ellipse cx="130" cy="128" rx="126" ry="34" fill="#EFC79A" opacity="0.3"/>
          <ellipse cx="130" cy="116" rx="102" ry="32" fill="#D9A25F"/>
          <ellipse cx="130" cy="92" rx="108" ry="34" fill="#E2B06E"/>
          <ellipse cx="130" cy="66" rx="112" ry="36" fill="#EABD7A"/>
          <path d="M116 24 C118 2, 152 0, 154 24 C156 46, 108 52, 116 24Z" fill="#FFC857"/>
          <path d="M136 18 C166 12, 194 38, 190 64 C182 100, 126 94, 124 64 C122 42, 124 20, 136 18Z" fill="#FF8A5B"/>
          <path d="M130 24 C148 22, 164 40, 160 60 C154 82, 130 86, 120 72 C108 56, 110 28, 130 24Z" fill="#FFB085"/>
          <rect x="142" y="30" width="8" height="70" rx="4" fill="#FFF3E0" transform="rotate(18 146 65)"/>
        </g>
      `;
    case "프레첼":
      return `
        <g transform="translate(120 308)">
          <ellipse cx="130" cy="126" rx="122" ry="34" fill="#F3D3A8" opacity="0.3"/>
          <path d="M128 36 C178 10, 234 46, 214 92 C198 126, 152 120, 130 88 C106 120, 58 126, 42 92 C22 48, 74 10, 128 36Z" fill="#B36C2C"/>
          <path d="M126 58 C144 36, 176 36, 188 58 C202 84, 176 110, 148 98 C138 94, 132 84, 130 76 C128 86, 122 94, 112 98 C84 110, 58 84, 72 58 C84 36, 116 36, 126 58Z" fill="#E1A158"/>
          <path d="M96 64 C104 54, 118 54, 126 64" stroke="#FFF2D8" stroke-width="8" stroke-linecap="round"/>
          <path d="M134 64 C142 54, 156 54, 164 64" stroke="#FFF2D8" stroke-width="8" stroke-linecap="round"/>
          <path d="M126 86 C122 98, 108 104, 96 100" stroke="#FFF2D8" stroke-width="8" stroke-linecap="round"/>
          <path d="M134 86 C138 98, 152 104, 164 100" stroke="#FFF2D8" stroke-width="8" stroke-linecap="round"/>
        </g>
      `;
    case "브리오슈":
      return `
        <g transform="translate(120 308)">
          <ellipse cx="130" cy="126" rx="116" ry="34" fill="#F2D6AF" opacity="0.3"/>
          <path d="M60 146 C56 92, 88 54, 132 60 C172 54, 204 92, 200 146 Z" fill="#C98743"/>
          <circle cx="84" cy="82" r="34" fill="#E5B06C"/>
          <circle cx="130" cy="64" r="40" fill="#EDBF7D"/>
          <circle cx="176" cy="82" r="34" fill="#E5B06C"/>
          <circle cx="130" cy="42" r="16" fill="#F7D098"/>
        </g>
      `;
    default:
      return `
        <g transform="translate(120 308)">
          <ellipse cx="130" cy="122" rx="118" ry="34" fill="#F2D6AF" opacity="0.3"/>
          <path d="M36 92 C36 40, 94 10, 130 52 C166 10, 224 40, 224 92 C224 128, 188 152, 130 152 C72 152, 36 128, 36 92Z" fill="#E0A15D"/>
          <path d="M36 92 C36 40, 94 10, 130 52 C130 80, 96 118, 36 92Z" fill="#F1BE76"/>
          <path d="M118 56 C124 68, 136 68, 142 56" stroke="#B7772E" stroke-width="8" stroke-linecap="round"/>
        </g>
      `;
  }
}

export function buildShareCardSvg(input: ShareCardInput): string {
  const title = `${input.name}님의 미래 레시피`;
  const wrappedTitle = wrapText(title, 16);
  const wrappedTypeName = wrapText(`${input.typeName} 타입`, 12);
  const wrappedTypeDesc = wrapText(input.typeDesc, 18);
  const wrappedMessage = input.message.flatMap((line) => wrapText(line, 24));
  const titleBlock = createCenteredTextBlock(wrappedTitle, 540, 112, 62, 54, 800);
  const typeNameBlock = createTextBlock(wrappedTypeName, 580, 352, 58, 48);
  const descriptionBlock = createTextBlock(wrappedTypeDesc, 580, 500, 42, 27);
  const messageBlock = createTextBlock(wrappedMessage, 128, 774, 56, 32);

  return `
    <svg width="${SVG_WIDTH}" height="${SVG_HEIGHT}" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="${SVG_WIDTH}" height="${SVG_HEIGHT}" rx="0" fill="#FFF7ED"/>
      <rect width="${SVG_WIDTH}" height="${SVG_HEIGHT}" rx="0" fill="url(#pageWash)" opacity="0.55"/>
      <circle cx="936" cy="182" r="170" fill="url(#bgGlowA)" opacity="0.32"/>
      <circle cx="124" cy="1268" r="176" fill="url(#bgGlowB)" opacity="0.22"/>

      <rect x="34" y="34" width="1012" height="1372" rx="44" fill="#FFF9F0" opacity="0.96"/>
      <rect x="34" y="34" width="1012" height="1372" rx="44" stroke="rgba(62,45,37,0.04)"/>

      <text x="540" y="78" text-anchor="middle" font-family="'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" font-size="24" font-weight="600" letter-spacing="8" fill="#8C776B">PRISM FUTURE RECIPE</text>
      ${titleBlock}

      <rect x="${CARD_X}" y="${CARD_Y}" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="42" fill="#FFFDF8"/>
      <rect x="${CARD_X}" y="${CARD_Y}" width="${CARD_WIDTH}" height="8" rx="4" fill="url(#prismLine)"/>
      <rect x="100" y="250" width="388" height="302" rx="32" fill="#F9EFE6"/>
      <rect x="522" y="250" width="454" height="302" rx="32" fill="#FFF5EE"/>
      <rect x="522" y="250" width="454" height="302" rx="32" fill="url(#heroGlow)" opacity="0.45"/>

      <g transform="translate(8 -10) scale(1.22)">
        ${getBreadSvg(input.breadName)}
      </g>

      ${typeNameBlock}
      <text x="580" y="446" font-family="'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" font-size="31" font-weight="700" fill="#FF7A59">오늘의 빵: ${escapeXml(input.breadName)}</text>
      ${descriptionBlock}

      <rect x="128" y="596" width="824" height="1" fill="#E9D9CC"/>
      <text x="128" y="636" font-family="'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" font-size="22" font-weight="600" fill="#7A685E">포용적 금융서비스 프리즘지점</text>
      <circle cx="886" cy="626" r="7" fill="#FF8A5B"/>
      <circle cx="910" cy="626" r="7" fill="#FFD166"/>
      <circle cx="934" cy="626" r="7" fill="#7BDFF2"/>

      <rect x="98" y="674" width="884" height="564" rx="34" fill="#FFFDF8"/>
      <rect x="98" y="674" width="884" height="564" rx="34" fill="url(#messageGlow)" opacity="0.26"/>
      ${messageBlock}

      <circle cx="908" cy="1144" r="92" fill="#FFC857" opacity="0.08"/>
      <text x="540" y="1288" text-anchor="middle" font-family="'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" font-size="22" font-weight="600" fill="#7A685E">퀴어문화축제에서 만나는 프리즘지점</text>
      <text x="540" y="1330" text-anchor="middle" font-family="'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" font-size="20" font-weight="500" fill="#8B776D">instagram.com/prism.fin</text>

      <defs>
        <linearGradient id="prismLine" x1="72" y1="187" x2="1008" y2="187" gradientUnits="userSpaceOnUse">
          <stop stop-color="#FF8A5B"/>
          <stop offset="0.33" stop-color="#FFD166"/>
          <stop offset="0.66" stop-color="#7BDFF2"/>
          <stop offset="1" stop-color="#B8F2E6"/>
        </linearGradient>
        <linearGradient id="pageWash" x1="0" y1="0" x2="1080" y2="1440" gradientUnits="userSpaceOnUse">
          <stop stop-color="#FFF5E8"/>
          <stop offset="1" stop-color="#FFFDF8"/>
        </linearGradient>
        <linearGradient id="heroGlow" x1="522" y1="250" x2="976" y2="552" gradientUnits="userSpaceOnUse">
          <stop stop-color="#FFFFFF"/>
          <stop offset="1" stop-color="#FFEFE5"/>
        </linearGradient>
        <radialGradient id="messageGlow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(888 1180) rotate(180) scale(220 150)">
          <stop stop-color="#FFD166"/>
          <stop offset="1" stop-color="#FFD166" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="bgGlowA" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(946 184) rotate(90) scale(184)">
          <stop stop-color="#FFD166"/>
          <stop offset="1" stop-color="#FFD166" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="bgGlowB" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(110 1288) rotate(90) scale(210)">
          <stop stop-color="#7BDFF2"/>
          <stop offset="1" stop-color="#7BDFF2" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="bgGlowC" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(866 1168) rotate(90) scale(164)">
          <stop stop-color="#FF8A5B"/>
          <stop offset="1" stop-color="#FF8A5B" stop-opacity="0"/>
        </radialGradient>
      </defs>
    </svg>
  `.trim();
}

export function buildShareCardDataUrl(input: ShareCardInput): string {
  const svg = buildShareCardSvg(input);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function buildShareCardFile(input: ShareCardInput): File {
  const svg = buildShareCardSvg(input);
  return new File([svg], "prism-fortune-card.svg", { type: "image/svg+xml;charset=utf-8" });
}
