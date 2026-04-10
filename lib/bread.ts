type BreadMeta = {
  breadName: string;
  resultType: string;
  typeName: string;
  typeEmoji: string;
  typeDesc: string;
};

const DEFAULT_BREAD_META: BreadMeta = {
  breadName: "포춘쿠키",
  resultType: "프리즘 포춘형",
  typeName: "포근한 팬케이크",
  typeEmoji: "🥞",
  typeDesc: "따뜻한 응원과 연결의 힘으로 삶을 부드럽게 이어가는 타입이에요."
};

const breadMetaByNeed: Record<string, BreadMeta> = {
  정보: {
    breadName: "크루아상",
    resultType: "정보탐험형",
    typeName: "지혜로운 크루아상",
    typeEmoji: "🥐",
    typeDesc: "불안을 줄이기 위해 정확한 정보를 찾고, 이해를 바탕으로 선택하는 힘이 큰 타입이에요."
  },
  안전망: {
    breadName: "통밀식빵",
    resultType: "안정설계형",
    typeName: "든든한 통밀식빵",
    typeEmoji: "🍞",
    typeDesc: "흔들리는 순간에도 버틸 수 있는 기반을 먼저 다지는 현실적인 안정 설계 타입이에요."
  },
  응원: {
    breadName: "팬케이크",
    resultType: "온기충전형",
    typeName: "포근한 팬케이크",
    typeEmoji: "🥞",
    typeDesc: "정답보다 마음을 북돋는 온기를 중요하게 여기고, 주변과 함께 힘을 내는 타입이에요."
  },
  계획: {
    breadName: "프레첼",
    resultType: "플래너형",
    typeName: "치밀한 프레첼",
    typeEmoji: "🥨",
    typeDesc: "막연한 불안보다 실행 가능한 계획을 세우며 내일을 또렷하게 준비하는 타입이에요."
  },
  연결: {
    breadName: "브리오슈",
    resultType: "브릿지형",
    typeName: "다정한 브리오슈",
    typeEmoji: "🥖",
    typeDesc: "혼자가 아닌 연결의 힘을 믿고, 관계를 통해 안정과 가능성을 넓혀가는 타입이에요."
  }
};

export function getBreadMeta(neededThing: string | null | undefined): BreadMeta {
  if (!neededThing) {
    return DEFAULT_BREAD_META;
  }
  return breadMetaByNeed[neededThing] ?? DEFAULT_BREAD_META;
}

export function getBreadName(neededThing: string | null | undefined): string {
  return getBreadMeta(neededThing).breadName;
}

export function getResultType(neededThing: string | null | undefined): string {
  return getBreadMeta(neededThing).resultType;
}

export function getTypeProfile(neededThing: string | null | undefined): Pick<BreadMeta, "typeName" | "typeEmoji" | "typeDesc"> {
  const meta = getBreadMeta(neededThing);
  return {
    typeName: meta.typeName,
    typeEmoji: meta.typeEmoji,
    typeDesc: meta.typeDesc
  };
}

export const DEFAULT_BREAD_NAME = DEFAULT_BREAD_META.breadName;
export const DEFAULT_RESULT_TYPE = DEFAULT_BREAD_META.resultType;
export const DEFAULT_TYPE_NAME = DEFAULT_BREAD_META.typeName;
export const DEFAULT_TYPE_EMOJI = DEFAULT_BREAD_META.typeEmoji;
export const DEFAULT_TYPE_DESC = DEFAULT_BREAD_META.typeDesc;
