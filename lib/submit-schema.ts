import { z } from "zod";

export const concerns = [
  "아플 때",
  "가족/파트너 문제",
  "일이 끊길 때",
  "노후",
  "갑작스러운 사고",
  "건강이 무너질 때",
  "가까운 관계가 흔들릴 때",
  "수입이 불안정할 때",
  "노후 준비",
  "예기치 못한 사고"
] as const;

export const protectTargets = ["나 자신", "파트너", "가족", "반려동물", "아직 잘 모르겠다", "아직 잘 모르겠어요"] as const;

export const neededThings = ["정보", "안전망", "응원", "계획", "연결"] as const;

export const submitSchema = z.object({
  name: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(8).max(30),
  concern: z.enum(concerns),
  protectTarget: z.enum(protectTargets),
  neededThing: z.enum(neededThings),
  interests: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
  supportMessage: z.string().trim().max(500).optional().default(""),
  userAgent: z.string().trim().max(500).optional().default("")
});

export type SubmitPayload = z.infer<typeof submitSchema>;
