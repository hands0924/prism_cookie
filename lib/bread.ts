type BreadMeta = {
  key: string;
  breadName: string;
  resultType: string;
  typeName: string;
  typeEmoji: string;
  typeDesc: string;
  shortDesc: string;
};

const TYPES: Record<string, BreadMeta> = {
  body_self: {
    key: "body_self",
    breadName: "팬케이크",
    resultType: "자기돌봄형",
    typeName: "포근한 팬케이크",
    typeEmoji: "🥞",
    typeDesc: "몸과 마음의 안전을 누구보다 소중히 여기는 당신은, 나를 먼저 돌보는 것이 진짜 용기라는 걸 아는 사람이에요. 한 장 한 장 정성껏 쌓아가는 팬케이크처럼, 자기돌봄의 작은 선택들이 결국 삶 전체의 안정감이 되어줘요. 그 마음을 체계적으로 정리해줄 누군가가 곁에 있다면, 다음 한 걸음은 훨씬 가벼워질 거예요.",
    shortDesc: "몸과 마음의 안전을 누구보다 소중히 여기는 당신은, 나를 먼저 돌보는 것이 진짜 용기라는 걸 아는 사람이에요."
  },
  body_others: {
    key: "body_others",
    breadName: "크루아상",
    resultType: "보호본능형",
    typeName: "다정한 크루아상",
    typeEmoji: "🥐",
    typeDesc: "예기치 못한 순간에도 소중한 사람을 지키고 싶은 당신은, 겹겹이 쌓인 마음의 결이 깊은 사람이에요. 바삭한 겉과 부드러운 속을 가진 크루아상처럼, 당신의 보호 본능은 사랑에서 시작된 강한 힘이에요. 그 마음을 든든한 안전망으로 바꿔줄 설계가 함께한다면, 지키고 싶은 사람 곁에 더 오래 설 수 있어요.",
    shortDesc: "예기치 못한 순간에도 소중한 사람을 지키고 싶은 당신은, 겹겹이 쌓인 마음의 결이 깊은 사람이에요."
  },
  relation_self: {
    key: "relation_self",
    breadName: "베이글",
    resultType: "중심지킴형",
    typeName: "단단한 베이글",
    typeEmoji: "🥯",
    typeDesc: "관계의 흔들림 속에서도 나를 잃지 않으려는 당신은, 감정을 섬세하게 다루면서도 중심을 지키는 사람이에요. 가운데 빈 공간이 오히려 단단함의 비결인 베이글처럼, 당신은 여유를 잃지 않는 감각을 가지고 있어요. 그 중심을 더 단단하게 받쳐줄 기반이 있다면, 관계 속에서도 흔들리지 않는 나를 지킬 수 있어요.",
    shortDesc: "관계의 흔들림 속에서도 나를 잃지 않으려는 당신은, 감정을 섬세하게 다루면서도 중심을 지키는 사람이에요."
  },
  relation_others: {
    key: "relation_others",
    breadName: "와플",
    resultType: "동반지킴형",
    typeName: "촘촘한 와플",
    typeEmoji: "🧇",
    typeDesc: "관계를 지키기 위해 기꺼이 마음을 쓰는 당신은, 사랑하는 사람 곁에서 함께 버티는 힘을 가진 사람이에요. 촘촘한 칸마다 정성을 채워 넣는 와플처럼, 당신의 따뜻함은 곁에 있는 것만으로도 큰 위로가 돼요. 그 마음을 실질적인 준비로 연결해줄 동반자가 있다면, 함께하는 내일이 더 안심이 될 거예요.",
    shortDesc: "관계를 지키기 위해 기꺼이 마음을 쓰는 당신은, 사랑하는 사람 곁에서 함께 버티는 힘을 가진 사람이에요."
  },
  future_self: {
    key: "future_self",
    breadName: "바게트",
    resultType: "기반구축형",
    typeName: "묵직한 바게트",
    typeEmoji: "🥖",
    typeDesc: "미래의 불확실함 앞에서 나만의 기반을 세우려는 당신은, 흔들리지 않는 중심을 만들어가는 사람이에요. 겉은 단단하고 속은 쫄깃한 바게트처럼, 시간이 지날수록 더 깊은 힘을 내는 사람이에요. 막연한 걱정을 구체적인 계획으로 바꿔줄 전문가와 함께라면, 미래는 훨씬 또렷해질 거예요.",
    shortDesc: "미래의 불확실함 앞에서 나만의 기반을 세우려는 당신은, 흔들리지 않는 중심을 만들어가는 사람이에요."
  },
  future_others: {
    key: "future_others",
    breadName: "식빵",
    resultType: "넉넉돌봄형",
    typeName: "넉넉한 식빵",
    typeEmoji: "🍞",
    typeDesc: "내일을 걱정하면서도 소중한 사람의 자리까지 챙기는 당신은, 일상을 든든하게 채우는 존재예요. 누구에게나 편안한 식빵처럼, 당신은 함께하는 삶의 안정감 그 자체예요. 그 넉넉한 마음을 뒷받침해줄 안전망을 함께 설계한다면, 지키고 싶은 모든 것이 더 오래 안전할 수 있어요.",
    shortDesc: "내일을 걱정하면서도 소중한 사람의 자리까지 챙기는 당신은, 일상을 든든하게 채우는 존재예요."
  }
};

const DEFAULT_META: BreadMeta = TYPES.body_self;

const CONCERN_CATEGORY: Record<string, string> = {
  "건강이 무너질 때": "body",
  "예기치 못한 사고": "body",
  "가까운 관계가 흔들릴 때": "relation",
  "수입이 불안정할 때": "future",
  "노후 준비": "future"
};

const SELF_TARGETS = new Set(["나 자신", "아직 잘 모르겠어요"]);

function deriveTypeKey(concern: string, protectTarget: string): string {
  const category = CONCERN_CATEGORY[concern] ?? "body";
  const targetSuffix = SELF_TARGETS.has(protectTarget) ? "self" : "others";
  return `${category}_${targetSuffix}`;
}

export function getBreadMeta(concern: string | null | undefined, protectTarget: string | null | undefined): BreadMeta {
  if (!concern || !protectTarget) return DEFAULT_META;
  const key = deriveTypeKey(concern, protectTarget);
  return TYPES[key] ?? DEFAULT_META;
}

export function getBreadMetaByKey(typeKey: string | null | undefined): BreadMeta {
  if (!typeKey) return DEFAULT_META;
  return TYPES[typeKey] ?? DEFAULT_META;
}

export function getBreadName(concern: string | null | undefined, protectTarget: string | null | undefined): string {
  return getBreadMeta(concern, protectTarget).breadName;
}

export function getResultType(concern: string | null | undefined, protectTarget: string | null | undefined): string {
  return getBreadMeta(concern, protectTarget).resultType;
}

export function getTypeProfile(concern: string | null | undefined, protectTarget: string | null | undefined): Pick<BreadMeta, "typeName" | "typeEmoji" | "typeDesc"> {
  const meta = getBreadMeta(concern, protectTarget);
  return { typeName: meta.typeName, typeEmoji: meta.typeEmoji, typeDesc: meta.typeDesc };
}

export const DEFAULT_BREAD_NAME = DEFAULT_META.breadName;
export const DEFAULT_RESULT_TYPE = DEFAULT_META.resultType;
export const DEFAULT_TYPE_NAME = DEFAULT_META.typeName;
export const DEFAULT_TYPE_EMOJI = DEFAULT_META.typeEmoji;
export const DEFAULT_TYPE_DESC = DEFAULT_META.typeDesc;
