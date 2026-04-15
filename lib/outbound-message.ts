function sanitizeName(name: string): string {
  const trimmed = (name || "").trim();
  return trimmed.length > 0 ? trimmed : "고객";
}

function renderInterests(interests: unknown): string {
  if (!Array.isArray(interests) || interests.length === 0) {
    return "문의";
  }

  const normalized = interests
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim());

  return normalized.length > 0 ? normalized.join(", ") : "문의";
}

export function composeOutboundMessage(input: {
  name: string;
  typeName: string;
  shortDesc: string;
  interests: unknown;
}): string {
  const name = sanitizeName(input.name);
  const interests = renderInterests(input.interests);

  return [
    `${name}님, 오늘의 미래 레시피가 도착했어요:)`,
    "",
    `${name}님의 베이킹 유형은`,
    `${input.typeName} 타입!`,
    "",
    input.shortDesc,
    "",
    "<포춘쿠키 교환권>",
    "프리즘지점 부스에서 이 문자를 보여주시면 당신만의 포춘쿠키를 받으실 수 있어요!",
    "",
    "프리즘지점 인스타 바로가기",
    "instagram.com/prism.fin",
    "",
    "상담신청 및 문의",
    "https://litt.ly/prism.fin",
    "",
    "프리즘지점은 모두를 위한 미래보장을 꿈꾸며, 금융의 경계를 넘어 연대합니다.",
    `선택해주신 ${interests} 문의에 반가운 마음을 전하며, 유용한 소식과 답변 안내드릴 수 있도록 곧 다시 연락드리겠습니다. 감사합니다!`
  ].join("\n");
}
