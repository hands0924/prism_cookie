const interestLabelMap: Record<string, string> = {
  활동소식: "앞으로 활동소식을 받고 싶어요!",
  보험상담: "보험상담을 의뢰하고 싶어요!",
  "채용/이직": "채용/이직을 알아보고 싶어요!"
};

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
    .map((value) => interestLabelMap[value] ?? value)
    .join(", ");

  return normalized.length > 0 ? normalized : "문의";
}

export function composeOutboundMessage(input: { name: string; interests: unknown }): string {
  const name = sanitizeName(input.name);
  const interests = renderInterests(input.interests);

  return [
    `[포용적 금융서비스, 프리즘지점]${name}님,`,
    "[Web발신]",
    "",
    "[포용적 금융서비스, 프리즘지점]",
    `${name}님, 만사형통 프리즘 부적 이벤트에 참여해주셔서 감사합니다!`,
    "",
    "프리즘지점은 퀴어 당사자와 앨라이 보험설계사가 함께하는 보험 조직입니다. 모두를 위한 미래보장을 꿈꾸며, 금융의 경계를 넘어 연대합니다.",
    "",
    `선택해주신 프리즘지점에서, ${interests} 문의에 반가운 마음을 전하며, 유용한 소식과 답변 안내드릴 수 있도록 곧 다시 연락드리겠습니다. 고맙습니다!`,
    "",
    "프리즘지점 드림",
    "[보험상담 및 채용문의]",
    "https://litt.ly/prism.fin",
    "",
    "앞으로 소식은",
    "[인스타그램] 팔로우해주세요!",
    "www.instagram.com/prism.fin"
  ].join("\n");
}
