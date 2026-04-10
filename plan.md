# Prism Cookie End-to-End Delivery Plan

## 1) Product Goal
- Deliver a complete festival experience from survey input to result sharing, follow-up messaging, and internal operations.
- Keep submit UX fast while making result image quality and share responsiveness feel production-ready.
- Ensure admin and ops can safely monitor, export, and troubleshoot without exposing sensitive data.

## 2) End-to-End User Journey (Feature Contract)
1. Visitor lands on `/`, completes 3-step survey + profile form.
2. `POST /api/submit` validates input, stores submission, returns recipe result quickly.
3. Async pipeline processes:
- Message delivery (`message_jobs`)
- Share image generation (`share_image_jobs`)
4. Visitor sees result card and uses one-tap share flow:
- Native share sheet first (when supported)
- Unified share panel inside the result screen for save / copy / Kakao / X(Twitter) / Instagram / Message
- Kakao and Message should use the shared native share path, not a Kakao API or Kakao-only flow.
- X(Twitter) should carry the image plus a single link, not a link-only or duplicated-link share payload.
5. Shared link opens `GET /r/[submissionId]` with valid OG metadata/image.
6. Admin uses `/admin`:
- Recent 100
- Full history with pagination
- Date-range CSV export
7. Ops uses `/ops` and `/api/ops/summary` for queue health and incident response.

## 3) Current Image + Share Status
- The result screen, saved image, and OG fallback now share the same `share-card` asset layer.
- The main remaining launch risk is no longer "how do we generate the card?" but "did we verify parity and behavior on real devices?"
- The active gaps are:
- desktop/mobile visual QA for preview vs exported image
- long-copy and variant coverage for all bread/type combinations
- browser-specific image save behavior and its diagnostics
- channel policy clarity where direct image attachment is not supported or must fall back to a native share sheet destination
- duplicated-link behavior in X share payloads
- The launch focus should therefore stay on validation, observability, and device behavior rather than inventing another rendering path.

## 4) End-to-End Feature Scope
### A. Visitor Experience
- Multi-step survey UI
- Result card with type profile and generated text
- Result image rendering that matches on-screen composition as closely as possible
- Image capture/save for sharing without layout drift or broken assets
- Unified share panel that keeps every channel action in one visible UI
- Share/save interactions should feel immediate, with expensive image work moved off the critical click path where possible

### B. API + Data
- Deterministic submit contract and idempotency handling
- Submission/event/job persistence in Supabase
- Retry/backoff and terminal-failure rules for async jobs

### C. Share + Social
- SSR share page (`/r/[id]`) with OG/Twitter cards
- Unified in-app share panel with visible actions for:
- Save: direct image save action with browser fallback guidance
- Copy: link copy action
- Kakao: native share destination with message + link + image, no Kakao API dependency
- X: direct image-share action when supported, with exactly one link in the payload and no duplicated link text
- Instagram: save image + caption copy flow
- Message: native destination with message + link + image, no SMS-only fallback that drops the visual asset
- Native share remains the primary convenience action, with Kakao and Message as the intended destinations when the browser supports them

### D. Admin + Ops
- Password/cookie-protected admin access
- Rich admin table columns for survey choices and send/share status
- Time-range CSV export
- Queue snapshots, lag visibility, fail counters

### E. Security + Reliability
- No public admin data routes
- Service-role access only on server
- Cron/worker auth keys enforced
- Controlled dispatch lease to avoid double-drain

## 5) Delivery Epics
### Epic PRISM-060: Image Fidelity and Visual Parity
- Build a single share-card source of truth for the result card.
- Treat the source/reference art as the canonical target for layout, hierarchy, and bread illustration accuracy.
- Keep typography, spacing, and hierarchy aligned between preview and export.
- Make the exported image match the on-screen card for desktop and mobile.
- Keep the share asset resilient to long Korean text and multi-line messages.
- Keep the result screen free of an ugly intermediate preview state.
- Map each result type to the correct bread illustration, including `브리오슈`, and verify the shared link uses that exact asset.
- Validate the OG image path against the same card design.

### Epic PRISM-061: Share Performance and Unified Share Panel
- Remove expensive image work from the share button critical path.
- Expose all share actions in a single visible share panel.
- Keep native share available when the browser supports it.
- Make Instagram a practical save-and-copy flow rather than a broken direct-post attempt.
- Route the native share path to Kakao and Message, with message + link + image payloads and no Kakao API dependency.
- Keep X as a direct image-share action in the same panel, with image plus a single link and no duplicated-link payload.
- Ensure share/save feels fast by reusing the prebuilt share asset.
- If a channel cannot attach the image directly, present the native share-sheet destination or explicit image-preparation step rather than implying file upload support.

### Epic PRISM-062: Image Save Diagnostics and Reliability
- Add structured logs for image save failures and share-image preparation failures.
- Capture browser-specific save errors and correlate them with device/browser QA results.
- Define the retry and user guidance path when image saving fails.
- Make failure modes observable before changing the save algorithm again.

### Epic PRISM-070: Admin Security and Data Access
- Require a configured admin secret in production-like environments.
- Avoid fallback secrets and query-string auth.
- Keep CSV export protected by the same auth boundary.
- Add regression checks for login, logout, and unauthorized export rejection.

### Epic PRISM-080: Release Verification and Go-Live
- Run smoke, tests, and harness gate.
- Confirm queue behavior under peak traffic.
- Freeze operational tuning values.
- Review secret rotation and rollback steps.
- Sign off launch readiness.

## 6) Sprint Roadmap
### Sprint 1: Core Submit + Result
- Form validation and submit API parity
- Result rendering and message generation parity
- Basic DB write path and idempotency

### Sprint 2: Async Processing
- Job fan-out + claim-and-process workers
- Retry, timeout, and failure handling
- Queue observability baseline

### Sprint 3: Share E2E
- `/r/[submissionId]` OG page
- Unified share button with native + fallback channels
- Mobile + desktop fallback QA

### Sprint 4: Admin E2E
- Admin auth gate (password/cookie)
- Recent 100 + all-history pagination
- Date-range CSV export

### Sprint 5: Image Fidelity and Single Render Path
- Lock the card design tokens and typography in the shared asset layer
- Remove the ugly intermediate state so the preview and final card share the same structure
- Make preview and exported image visually identical for the important layout regions
- Add device/browser QA for long text, small screens, and image generation state transitions

### Sprint 6: Share Panel and Channel Policy
- Keep all actions inside one visible share panel
- Keep Kakao and Message on the native share path with no Kakao API dependency
- Require image preparation for X/Twitter share with exactly one link in the payload
- Reduce share/save click latency by precomputing or reusing the share asset
- Add device/browser QA for iOS Safari and Android Chrome share flows

### Sprint 7: Image Save Diagnostics and Security
- Add structured logs for image save failures and share-image preparation failures
- Reproduce and document browser-specific save errors
- Remove weak admin auth paths
- Add auth regression coverage for protected export and login/logout
- Verify the production tuning values, secrets, and runbook
- Close out launch checklist items

### Sprint 8: Release Hardening
- Final regression pass for share/image parity, admin auth, and export flow
- Smoke and harness gate validation
- Freeze production tuning values and rollback steps
- Launch checklist sign-off

## 7) Definition of Done (Per Sprint)
- User-visible flow for sprint scope is complete and testable end-to-end.
- No P0/P1 open defects.
- Required checks pass:
- `npm run lint`
- `npm run typecheck`
- `npm run tests`
- `npm run smoke`
- Harness evaluator skill gate status is `PASS`

## 8) Operating Rhythm
- Plan source of truth: `plan.md`
- Sprint execution log: `sprint.md` (update every sprint close)
- Harness artifacts remain required under `.codex/skills/harness-loop/artifacts/*`

## 9) Current Priority
1. Finish visual QA for preview/export parity on desktop and mobile, with screenshots.
2. Validate save/share behavior on iOS Safari and Android Chrome using the current unified share panel.
3. Keep collecting image-save diagnostics and use them to decide whether another save algorithm change is necessary.
4. Freeze release evidence in harness artifacts and keep the gate green.
