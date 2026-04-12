"use client";

import Image from "next/image";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { DEFAULT_TYPE_DESC, DEFAULT_TYPE_EMOJI, DEFAULT_TYPE_NAME, getTypeProfile } from "@/lib/bread";
import { generateShareCardPng, type ShareCardInput } from "@/lib/share-canvas";

type Option = {
  label: string;
  value: string;
  icon: string;
};

const concernOptions: Option[] = [
  { label: "건강이 무너질 때", value: "건강이 무너질 때", icon: "🏥" },
  { label: "가까운 관계가 흔들릴 때", value: "가까운 관계가 흔들릴 때", icon: "💔" },
  { label: "수입이 불안정할 때", value: "수입이 불안정할 때", icon: "💸" },
  { label: "노후 준비", value: "노후 준비", icon: "🏡" },
  { label: "예기치 못한 사고", value: "예기치 못한 사고", icon: "⚡" }
];

const protectTargetOptions: Option[] = [
  { label: "나 자신", value: "나 자신", icon: "🪞" },
  { label: "파트너", value: "파트너", icon: "💑" },
  { label: "가족", value: "가족", icon: "👨‍👩‍👧" },
  { label: "반려동물", value: "반려동물", icon: "🐾" },
  { label: "아직 잘 모르겠어요", value: "아직 잘 모르겠어요", icon: "🌀" }
];

const neededThingOptions: Option[] = [
  { label: "정보", value: "정보", icon: "📖" },
  { label: "안전망", value: "안전망", icon: "🛡️" },
  { label: "응원", value: "응원", icon: "📣" },
  { label: "계획", value: "계획", icon: "📋" },
  { label: "연결", value: "연결", icon: "🤝" }
];

const interestOptions = [
  { label: "앞으로 활동소식을 받고 싶어요", value: "활동소식" },
  { label: "보험상담을 의뢰하고 싶어요", value: "보험상담" },
  { label: "재무상담을 의뢰하고 싶어요", value: "재무상담" },
  { label: "채용, 이직을 알아보고 싶어요", value: "채용/이직" }
];

type SubmitSuccess = {
  success: true;
  name: string;
  message: string[];
  submissionId: string;
  breadName?: string;
  resultType?: string;
  typeName?: string;
  typeEmoji?: string;
  typeDesc?: string;
};

type SubmitFailure = {
  success: false;
  error: string;
};

type SubmitResponse = SubmitSuccess | SubmitFailure;

type FormState = {
  name: string;
  phone: string;
  concern: string;
  protectTarget: string;
  neededThing: string;
  interests: string[];
  privacyConsent: boolean;
  supportMessage: string;
};

const initialForm: FormState = {
  name: "",
  phone: "",
  concern: "",
  protectTarget: "",
  neededThing: "",
  interests: [],
  privacyConsent: false,
  supportMessage: ""
};

function sanitizePhone(input: string): string {
  return input.replace(/\D/g, "");
}

export default function HomePage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitResult, setSubmitResult] = useState<SubmitSuccess | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [interestError, setInterestError] = useState("");
  const [consentError, setConsentError] = useState("");

  const typeProfile =
    submitResult?.typeName || submitResult?.typeEmoji || submitResult?.typeDesc
      ? {
          typeName: submitResult?.typeName ?? DEFAULT_TYPE_NAME,
          typeEmoji: submitResult?.typeEmoji ?? DEFAULT_TYPE_EMOJI,
          typeDesc: submitResult?.typeDesc ?? DEFAULT_TYPE_DESC
        }
      : getTypeProfile(form.neededThing);

  const [shareAsset, setShareAsset] = useState<{
    file: File | null;
    previewUrl: string | null;
    loading: boolean;
    error: string | null;
  }>({ file: null, previewUrl: null, loading: false, error: null });

  const buildShareAsset = useCallback(async (input: ShareCardInput) => {
    setShareAsset((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await generateShareCardPng(input);
      setShareAsset({ file: result.file, previewUrl: result.previewUrl, loading: false, error: null });
    } catch (err) {
      setShareAsset({
        file: null,
        previewUrl: null,
        loading: false,
        error: err instanceof Error ? err.message : "share_card_generation_failed"
      });
    }
  }, []);

  useEffect(() => {
    if (!submitResult) return;
    const input: ShareCardInput = {
      name: submitResult.name,
      breadName: submitResult.breadName ?? "포춘쿠키",
      typeName: typeProfile.typeName,
      typeEmoji: typeProfile.typeEmoji,
      typeDesc: typeProfile.typeDesc,
      message: submitResult.message ?? []
    };
    void buildShareAsset(input);
  }, [submitResult, typeProfile.typeName, typeProfile.typeEmoji, typeProfile.typeDesc, buildShareAsset]);

  function showToast(message: string) {
    setToast(message);
    setToastVisible(true);
    window.setTimeout(() => setToastVisible(false), 2800);
  }

  async function logClientIssue(eventType: string, detail: Record<string, unknown>) {
    try {
      const body = JSON.stringify({
        eventType,
        submissionId: submitResult?.submissionId ?? null,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
        detail
      });

      if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
        const blob = new Blob([body], { type: "application/json" });
        navigator.sendBeacon("/api/ops/client-event", blob);
        return;
      }

      await fetch("/api/ops/client-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true
      });
    } catch {
      // Logging must never block the user flow.
    }
  }

  function moveToStep(index: number) {
    setStep(index);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function handlePick(field: "concern" | "protectTarget" | "neededThing", value: string, nextStep: number) {
    setForm((prev) => ({ ...prev, [field]: value }));
    window.setTimeout(() => moveToStep(nextStep), 280);
  }

  function toggleInterest(value: string) {
    setForm((prev) => {
      const exists = prev.interests.includes(value);
      const next = exists ? prev.interests.filter((item) => item !== value) : [...prev.interests, value];
      return { ...prev, interests: next };
    });
    setInterestError("");
  }

  function validateForm(): boolean {
    let ok = true;
    const trimmedName = form.name.trim();
    const phone = sanitizePhone(form.phone);

    setNameError("");
    setPhoneError("");
    setInterestError("");
    setConsentError("");

    if (!trimmedName) {
      setNameError("이름 또는 닉네임을 입력해주세요");
      ok = false;
    }

    if (!phone) {
      setPhoneError("연락처를 입력해주세요");
      ok = false;
    } else if (phone.length !== 11) {
      setPhoneError("정확한 11자리 연락처를 입력해주세요");
      ok = false;
    } else if (!phone.startsWith("010")) {
      setPhoneError("010으로 시작하는 정확한 번호를 입력해주세요");
      ok = false;
    }

    if (form.interests.length === 0) {
      setInterestError("관심 항목을 1개 이상 선택해주세요");
      ok = false;
    }

    if (!form.privacyConsent) {
      setConsentError("개인정보 수집에 동의해주세요");
      ok = false;
    }

    return ok;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    moveToStep(5);
    const startedAt = Date.now();
    const phone = sanitizePhone(form.phone);

    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-idempotency-key": crypto.randomUUID()
        },
        body: JSON.stringify({
          ...form,
          name: form.name.trim(),
          phone,
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "web-client"
        })
      });
      const json = (await response.json()) as SubmitResponse;
      if (!response.ok || !json.success) {
        showToast("잠시 후 다시 시도해주세요");
        moveToStep(4);
        return;
      }

      setSubmitResult(json);
      const remainMs = Math.max(0, 1500 - (Date.now() - startedAt));
      window.setTimeout(() => {
        moveToStep(6);
      }, remainMs);
    } catch {
      showToast("연결이 불안정해요. 다시 시도해주세요.");
      moveToStep(4);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyText(text: string, successMessage = "결과가 복사되었어요! 원하는 곳에 붙여넣기 해주세요") {
    try {
      await navigator.clipboard.writeText(text);
      showToast(successMessage);
    } catch {
      try {
        window.prompt("복사해서 사용해주세요", text);
        showToast("복사 창을 열었어요.");
      } catch {
        showToast("복사에 실패했어요.");
      }
    }
  }

  function getShareUrl(): string {
    if (typeof window === "undefined") {
      return "";
    }
    if (submitResult?.submissionId) {
      return `${window.location.origin}/r/${submitResult.submissionId}`;
    }
    return window.location.href;
  }

  function getShareText(shareUrl: string): string {
    return `서울퀴어문화축제 프리즘지점 부스에서\n나의 미래 레시피를 만들어보세요 🌈\n\n포용적 금융서비스 프리즘지점\n${shareUrl}`;
  }

  function getSharePayload(): { title: string; shareUrl: string; shareText: string } {
    const shareUrl = getShareUrl();
    return {
      title: "Bake Your Future | 나의 미래 레시피",
      shareUrl,
      shareText: getShareText(shareUrl)
    };
  }

  function openExternalUrl(url: string) {
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) {
      window.location.href = url;
    }
  }

  async function getOrCreateShareImageFile(): Promise<File> {
    if (!submitResult) {
      throw new Error("missing_submit_result");
    }
    if (shareAsset.file) {
      return shareAsset.file;
    }
    // Try generating on-the-fly if the initial build hasn't finished
    if (shareAsset.loading) {
      await new Promise((r) => setTimeout(r, 1500));
      if (shareAsset.file) return shareAsset.file;
    }
    await logClientIssue("share_asset_prepare_failed", {
      reason: shareAsset.error ?? "missing_share_asset"
    });
    throw new Error(shareAsset.error ?? "missing_share_asset");
  }

  async function saveShareImage(file?: File) {
    if (!submitResult) {
      return;
    }
    try {
      const shareFile = file ?? (await getOrCreateShareImageFile());
      const url = URL.createObjectURL(shareFile);
      const isIOS = /iPad|iPhone|iPod/i.test(navigator.userAgent);
      const supportsDownload = "download" in HTMLAnchorElement.prototype;
      if (isIOS || !supportsDownload) {
        window.open(url, "_blank", "noopener,noreferrer");
        showToast("새 탭에서 이미지를 길게 눌러 저장해 주세요.");
        window.setTimeout(() => URL.revokeObjectURL(url), 5000);
        return;
      }
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = shareFile.name;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      showToast("이미지를 저장했어요.");
    } catch (error) {
      await logClientIssue("image_save_failed", {
        error: error instanceof Error ? error.message : "unknown_save_failure",
        hasShareAsset: Boolean(shareAsset.file),
        shareAssetError: shareAsset.error ?? null
      });
      if (shareAsset.previewUrl) {
        openExternalUrl(shareAsset.previewUrl);
        showToast("저장이 어려워 새 탭에서 이미지를 열었어요. 길게 눌러 저장해 주세요.");
        return;
      }
      showToast("이미지 저장에 실패했어요. 링크를 먼저 복사해둘게요.");
      await copyText(getSharePayload().shareUrl, "링크를 복사했어요.");
    }
  }

  async function shareToSocialMedia() {
    if (!submitResult) {
      return;
    }
    const { title, shareUrl, shareText } = getSharePayload();
    const imageFile = shareAsset.file;

    if (navigator.share) {
      try {
        if (imageFile && navigator.canShare?.({ files: [imageFile] })) {
          await navigator.share({
            title,
            text: shareText,
            url: shareUrl,
            files: [imageFile]
          });
        } else {
          await navigator.share({
            title,
            text: shareText,
            url: shareUrl
          });
        }
        return;
      } catch (error) {
        await logClientIssue("system_share_failed", {
          error: error instanceof Error ? error.message : "unknown_system_share_failure",
          hasImageFile: Boolean(imageFile)
        });
        await copyText(shareUrl, "기기 공유를 열 수 없어서 링크를 복사했어요.");
        return;
      }
    }
    await copyText(shareUrl, "공유 기능을 열 수 없어 링크를 복사했어요.");
  }

  async function shareViaTwitter() {
    const { shareUrl } = getSharePayload();
    // Compose tweet text — keep short so Twitter card (OG image) shows prominently
    const tweetText = submitResult
      ? `${submitResult.name}님의 프리즘 포춘 결과를 확인해보세요 🌈\n\n포용적 금융서비스 프리즘지점`
      : "나의 미래 레시피를 만들어보세요 🌈";
    const twitterIntent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(shareUrl)}`;
    openExternalUrl(twitterIntent);
    showToast("X 공유 창을 열었어요. 트윗에 이미지 카드가 표시돼요.");
  }

  async function shareViaMessage() {
    const { shareText } = getSharePayload();
    const isIOS = /iPad|iPhone|iPod/i.test(navigator.userAgent);
    const separator = isIOS ? "&" : "?";
    window.location.href = `sms:${separator}body=${encodeURIComponent(shareText)}`;
    showToast("메시지 앱으로 이동합니다.");
  }

  async function shareViaKakao() {
    const { shareUrl } = getSharePayload();
    // Simple URL share — Kakao reads OG tags from the share page
    const kakaoUrl = `https://story.kakao.com/share?url=${encodeURIComponent(shareUrl)}`;
    openExternalUrl(kakaoUrl);
    showToast("카카오 공유 창을 열었어요.");
  }

  async function shareViaInstagram() {
    const { shareUrl, shareText } = getSharePayload();
    const captionText = `${shareText}\n\n#프리즘지점 #서울퀴어문화축제 #BakeYourFuture #미래레시피`;
    let imageFile: File | null = null;
    try {
      imageFile = await getOrCreateShareImageFile();
    } catch (error) {
      await logClientIssue("instagram_share_prepare_failed", {
        error: error instanceof Error ? error.message : "unknown_instagram_prepare_failure"
      });
      imageFile = null;
    }

    // On mobile: try native share with image file (user picks Instagram)
    if (navigator.share && imageFile && navigator.canShare?.({ files: [imageFile] })) {
      try {
        await navigator.share({
          title: "Prism Future Recipe",
          text: captionText,
          files: [imageFile]
        });
        return;
      } catch {
        // User cancelled — fall through to save + copy flow
      }
    }

    // Desktop / fallback: save image → copy caption → open Instagram
    if (imageFile) {
      await saveShareImage(imageFile);
    } else {
      showToast("이미지 준비가 덜 되어 링크와 문구를 먼저 복사할게요.");
    }
    await copyText(captionText, "인스타 업로드용 문구를 복사했어요. 이미지와 함께 붙여넣기 해주세요!");
    openExternalUrl("https://www.instagram.com/");
  }

  return (
    <main className="fortune-app">
      <div className={`fortune-progress ${step >= 1 && step <= 4 ? "visible" : ""}`}>
        <span className="fortune-progress-text">{step}/5</span>
        <div className="fortune-progress-dots">
          {[1, 2, 3, 4, 5].map((dot) => (
            <div
              key={dot}
              className={`fortune-progress-dot ${dot < step ? "done" : ""} ${dot === step ? "active" : ""}`}
            />
          ))}
        </div>
      </div>

      <button
        className={`fortune-btn-back ${step >= 2 && step <= 4 ? "visible" : ""}`}
        aria-label="이전으로"
        type="button"
        onClick={() => moveToStep(step - 1)}
      >
        ←
      </button>

      <section className={`fortune-section fortune-intro ${step === 0 ? "active" : ""}`}>
        <div className="fortune-intro-brand">Prism</div>
        <div className="fortune-intro-cookie">
          <div className="fortune-cookie-body">
            <svg className="fortune-cookie-svg" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="70" cy="95" rx="50" ry="12" fill="#FFE0B2" opacity="0.3" />
              <path
                d="M30 70 C30 40, 70 20, 70 50 C70 20, 110 40, 110 70 C110 90, 90 100, 70 95 C50 100, 30 90, 30 70Z"
                fill="#FFB74D"
              />
              <path d="M30 70 C30 40, 70 20, 70 50 C70 65, 50 80, 30 70Z" fill="#FFCC80" />
              <path d="M65 50 C68 60, 72 60, 75 50" stroke="#E09940" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              <rect x="55" y="28" width="40" height="18" rx="2" fill="#FFFDF8" transform="rotate(-8 75 37)" />
              <line x1="60" y1="33" x2="85" y2="31" stroke="#FFB74D" strokeWidth="1" opacity="0.4" transform="rotate(-8 75 37)" />
              <line x1="60" y1="38" x2="80" y2="36" stroke="#FFB74D" strokeWidth="1" opacity="0.3" transform="rotate(-8 75 37)" />
            </svg>
          </div>
        </div>
        <div className="fortune-intro-title">Bake your future</div>
        <div className="fortune-intro-subtitle">당신의 미래 레시피를 만들어보세요</div>
        <div className="fortune-intro-desc">
          지금의 마음을 고르면,
          <br />
          당신만의 미래 레시피가 완성돼요
        </div>
        <button className="fortune-btn-cta" type="button" onClick={() => moveToStep(1)}>
          🍞 나만의 미래 레시피 만들기
        </button>
      </section>

      <section className={`fortune-section fortune-question ${step === 1 ? "active" : ""}`}>
        <div className="fortune-question-title">
          지금 내 삶에서
          <br />
          가장 불안한 것은?
        </div>
        <div className="fortune-question-helper">지금 가장 가까운 마음을 골라주세요</div>
        <div className="fortune-choices">
          {concernOptions.map((item) => (
            <button
              key={item.label}
              className={`fortune-choice ${form.concern === item.value ? "selected" : ""}`}
              type="button"
              onClick={() => handlePick("concern", item.value, 2)}
            >
              <span className="fortune-choice-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className={`fortune-section fortune-question ${step === 2 ? "active" : ""}`}>
        <div className="fortune-question-title">
          지금 내가 가장
          <br />
          지키고 싶은 대상은?
        </div>
        <div className="fortune-question-helper">마음이 먼저 향하는 대상을 골라주세요</div>
        <div className="fortune-choices">
          {protectTargetOptions.map((item) => (
            <button
              key={item.label}
              className={`fortune-choice ${form.protectTarget === item.value ? "selected" : ""}`}
              type="button"
              onClick={() => handlePick("protectTarget", item.value, 3)}
            >
              <span className="fortune-choice-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className={`fortune-section fortune-question ${step === 3 ? "active" : ""}`}>
        <div className="fortune-question-title">
          지금 내 삶에
          <br />
          가장 필요한 건?
        </div>
        <div className="fortune-question-helper">당신의 미래 레시피에 마지막 재료를 넣어보세요</div>
        <div className="fortune-choices">
          {neededThingOptions.map((item) => (
            <button
              key={item.label}
              className={`fortune-choice ${form.neededThing === item.value ? "selected" : ""}`}
              type="button"
              onClick={() => handlePick("neededThing", item.value, 4)}
            >
              <span className="fortune-choice-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className={`fortune-section fortune-info ${step === 4 ? "active" : ""}`}>
        <div className="fortune-info-title">거의 다 왔어요 ✨</div>
        <div className="fortune-info-desc">당신의 결과를 확인하고 포춘쿠키를 받기 위해, 몇 가지만 알려주세요</div>
        <form onSubmit={handleSubmit}>
          <div className="fortune-form-group">
            <label className="fortune-form-label" htmlFor="inputName">
              이름 또는 닉네임 <span className="fortune-req">*</span>
            </label>
            <input
              id="inputName"
              className={`fortune-form-input ${nameError ? "error" : ""}`}
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="부담 없이 닉네임도 좋아요"
              autoComplete="given-name"
            />
            <div className={`fortune-error-msg ${nameError ? "visible" : ""}`}>{nameError}</div>
          </div>

          <div className="fortune-form-group">
            <label className="fortune-form-label" htmlFor="inputPhone">
              연락처 <span className="fortune-req">*</span>
            </label>
            <input
              id="inputPhone"
              className={`fortune-form-input ${phoneError ? "error" : ""}`}
              value={form.phone}
              onChange={(event) => setForm((prev) => ({ ...prev, phone: sanitizePhone(event.target.value).slice(0, 11) }))}
              placeholder="01012345678"
              autoComplete="tel"
              maxLength={11}
              inputMode="numeric"
            />
            <div className="fortune-form-hint">
              &quot;-&quot; 없이 숫자만 입력해주세요
              <br />📮 이 번호로 포춘쿠키 교환 문자가 발송돼요
              <br />⚠️ 번호가 정확하지 않으면 쿠키를 받을 수 없어요
            </div>
            <div className={`fortune-error-msg ${phoneError ? "visible" : ""}`}>{phoneError}</div>
          </div>

          <div className="fortune-interest-section">
            <div className="fortune-interest-label">프리즘지점에서,</div>
            <div className="fortune-interest-hint">중복 선택이 가능해요</div>
            <div className="fortune-interest-chips">
              {interestOptions.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`fortune-interest-chip ${form.interests.includes(item.value) ? "selected" : ""}`}
                  onClick={() => toggleInterest(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className={`fortune-error-msg ${interestError ? "visible" : ""}`}>{interestError}</div>
          </div>

          <div className={`fortune-consent-row ${consentError ? "error" : ""}`} onClick={() => setForm((prev) => ({ ...prev, privacyConsent: !prev.privacyConsent }))}>
            <div className={`fortune-consent-check ${form.privacyConsent ? "checked" : ""}`}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2.5 7.5L5.5 10.5L11.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="fortune-consent-main">
              개인정보 수집 및 이용에 동의합니다 <span className="fortune-req">(필수)</span>
            </div>
          </div>
          <div className="fortune-consent-detail">
            수집항목: 이름(닉네임), 연락처
            <br />
            수집 목적: 프리즘지점 소식 및 상담 문의 답변 제공
            <br />
            보관 기간: 신청일로부터 1년 보관 후 즉시 폐기
          </div>
          <div className={`fortune-error-msg ${consentError ? "visible" : ""}`} style={{ marginTop: -12, marginBottom: 16 }}>
            {consentError}
          </div>

          <div className="fortune-form-group">
            <label className="fortune-form-label" htmlFor="supportMessage">
              프리즘지점에게 응원의 한마디 (선택)
            </label>
            <textarea
              id="supportMessage"
              className="fortune-form-input fortune-textarea"
              value={form.supportMessage}
              maxLength={500}
              onChange={(event) => setForm((prev) => ({ ...prev, supportMessage: event.target.value }))}
              placeholder="응원의 메시지를 남겨주세요"
            />
          </div>

          <div className="fortune-privacy-note">남겨주신 정보는 프리즘지점의 소식 안내 및 상담 답변을 위해서만 사용됩니다.</div>
          <button className="fortune-btn-cta" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "결과 생성 중..." : "🍞 내 미래 레시피 확인하기"}
          </button>
        </form>
      </section>

      <section className={`fortune-section fortune-loading ${step === 5 ? "active" : ""}`}>
        <div className="fortune-loading-glow" />
        <div className="fortune-loading-cookie">
          <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="60" cy="82" rx="40" ry="10" fill="#FFE0B2" opacity="0.25" />
            <path
              d="M25 60 C25 35, 60 18, 60 44 C60 18, 95 35, 95 60 C95 78, 78 86, 60 82 C42 86, 25 78, 25 60Z"
              fill="#FFB74D"
            />
            <path d="M25 60 C25 35, 60 18, 60 44 C60 56, 42 68, 25 60Z" fill="#FFCC80" />
          </svg>
        </div>
        <div className="fortune-loading-title">당신의 미래를 굽는 중이에요...</div>
        <div className="fortune-loading-desc">마음의 재료를 조합하고 있어요</div>
      </section>

      <section className={`fortune-section fortune-result ${step === 6 ? "active" : ""}`}>
        <div className="fortune-share-capture">
          <div className="fortune-result-label">Prism Future Recipe</div>
          <div className="fortune-result-title">{submitResult ? `${submitResult.name}님의 미래 레시피` : "당신의 미래 레시피"}</div>
          <div className="fortune-share-preview-shell">
            {shareAsset.previewUrl ? (
              <Image
                className="fortune-share-preview"
                src={shareAsset.previewUrl}
                alt="미래 레시피 카드"
                width={1080}
                height={1440}
                unoptimized
              />
            ) : shareAsset.loading ? (
              <div className="fortune-share-preview-placeholder">
                <div className="fortune-share-preview-copy">카드를 만들고 있어요...</div>
              </div>
            ) : (
              <div className="fortune-share-preview-placeholder">
                <div className="fortune-share-preview-copy">카드를 준비하지 못했어요</div>
              </div>
            )}
          </div>
          <div className="fortune-result-capture-hint">보이는 카드 그대로 PNG 이미지로 저장·공유돼요</div>
        </div>

        <section className="fortune-share-panel" aria-label="공유 옵션">
          <div className="fortune-share-panel-title">공유하기</div>
          <div className="fortune-share-icon-row">
            <button className="fortune-share-icon-btn" type="button" onClick={shareViaKakao} aria-label="카카오톡">
              <span className="fortune-share-icon fortune-share-icon--kakao">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.48 3 2 6.42 2 10.6c0 2.7 1.76 5.05 4.4 6.39-.14.52-.9 3.34-.93 3.56 0 0-.02.16.08.22.1.06.22.03.22.03.3-.04 3.44-2.24 3.98-2.62.72.1 1.47.16 2.25.16 5.52 0 10-3.42 10-7.74C22 6.42 17.52 3 12 3z"/></svg>
              </span>
              <span className="fortune-share-icon-label">카카오톡</span>
            </button>
            <button className="fortune-share-icon-btn" type="button" onClick={shareViaTwitter} aria-label="X">
              <span className="fortune-share-icon fortune-share-icon--x">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </span>
              <span className="fortune-share-icon-label">X</span>
            </button>
            <button className="fortune-share-icon-btn" type="button" onClick={shareViaInstagram} aria-label="인스타그램">
              <span className="fortune-share-icon fortune-share-icon--insta">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </span>
              <span className="fortune-share-icon-label">인스타</span>
            </button>
            <button className="fortune-share-icon-btn" type="button" onClick={() => saveShareImage()} aria-label="저장">
              <span className="fortune-share-icon fortune-share-icon--save">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </span>
              <span className="fortune-share-icon-label">저장</span>
            </button>
            <button className="fortune-share-icon-btn" type="button" onClick={() => copyText(getSharePayload().shareUrl, "링크를 복사했어요.")} aria-label="링크 복사">
              <span className="fortune-share-icon fortune-share-icon--link">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
              </span>
              <span className="fortune-share-icon-label">링크</span>
            </button>
          </div>
        </section>

        <div className="fortune-prism-intro">
          <div className="fortune-prism-intro-label">About Prism</div>
          <div className="fortune-prism-intro-name">프리즘지점</div>
          <div className="fortune-prism-intro-tagline">모두를 위한 미래보장</div>
          <div className="fortune-prism-intro-desc">
            프리즘지점은 성적 지향과 성별 정체성에 관계없이 누구나 경제적 안정과 안전한 미래를 꿈꿀 수 있도록 돕는 포용적
            금융서비스 팀이에요. 퀴어 당사자와 앨라이로 구성된 팀이 당신의 미래 설계를 함께합니다.
          </div>
          <a className="fortune-btn-consult" href="https://forms.gle/A7QsH8J8GgVPTqNJ7" target="_blank" rel="noopener noreferrer">
            ⚡ 30초만에 상담 신청하기
          </a>
        </div>
      </section>

      <div className={`fortune-toast ${toastVisible ? "visible" : ""}`}>{toast}</div>
    </main>
  );
}
