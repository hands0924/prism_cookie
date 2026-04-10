# Sprint Board

Last updated: 2026-04-10

## Already Established
- `[x]` Core survey submit flow and result screen
- `[x]` Async message/share-image worker pipeline
- `[x]` Public share page with OG metadata
- `[x]` Admin console with auth, pagination, and CSV export
- `[x]` Ops dashboard and queue summary APIs
- `[x]` Share-card rendering now reuses the generated SVG asset instead of live DOM capture
- `[x]` Result screen now matches the saved/shared asset more closely
- `[x]` Shared result UI is the single place for save/copy/Kakao/X/Instagram/Message actions
- `[x]` Admin login/logout uses a cookie-backed password gate
- `[x]` Admin CSV export is protected by auth
- `[x]` Removed insecure default admin password fallback and query-string auth
- `[x]` Added regression checks for admin auth and a share/image-focused load test script
- `[x]` Local build/typecheck passed after the latest modifications

## Next Sprint Goal
Finish release evidence for the current share/image implementation: device QA, visual parity checks, channel-behavior notes, and harness gate proof.

## Epic PRISM-060: Image Fidelity and Single Render Path
Owner: Frontend + Backend
Status: In Progress

### Ticket PRISM-060-1: Canonical card source
- `[x]` Single share-card source is already in place (`lib/share-card.ts`)
- `[x]` On-screen result preview uses the same card data as export/share
- `[x]` Confirm OG image path uses the same card composition
- `[ ]` Document the card source-of-truth contract for preview, export, and OG output

### Ticket PRISM-060-2: Remove ugly intermediate render
- `[x]` Remove the ugly intermediate state so the preview and final card share the same structure
- `[ ]` Verify the card never shows a lower-fidelity placeholder before the final render
- `[ ]` Confirm the first paint and final paint use the same layout hierarchy

### Ticket PRISM-060-3: Image parity QA
- `[ ]` Compare the visible card against the saved image pixel-for-pixel on desktop
- `[ ]` Compare the visible card against the saved image pixel-for-pixel on mobile
- `[ ]` Fix any spacing, typography, or cropping drift found in QA
- `[ ]` Produce a final visual QA checklist with screenshots

### Ticket PRISM-060-4: Variant correctness
- `[ ]` Validate long Korean copy wrapping in the card body
- `[ ]` Validate all bread/type variants render cleanly
- `[x]` Verify the `브리오슈 타입` link shows the actual brioche-style image and not a generic or wrong bread illustration
- `[ ]` Confirm each type maps to the correct source/reference art before release

## Epic PRISM-061: Share Performance and Unified Share Panel
Owner: Frontend
Status: In Progress

### Ticket PRISM-061-1: Unified share panel layout
- `[x]` All share actions are exposed in a single visible share panel
- `[ ]` Confirm desktop share panel remains readable and not cluttered
- `[ ]` Keep the action order stable and intentional across desktop and mobile

### Ticket PRISM-061-2: Native Kakao/Message payload
- `[x]` Native share sheet is attempted first when available
- `[x]` Route the native share path to Kakao and Message without a Kakao API dependency
- `[ ]` Make the native Kakao/Message payload carry message + link + image
- `[ ]` Confirm Kakao opens the correct native destination from the unified share panel
- `[ ]` Confirm Message opens the correct native destination from the unified share panel

### Ticket PRISM-061-3: X share payload repair
- `[ ]` X(Twitter) should include the image when supported
- `[ ]` Ensure X carries exactly one link and no duplicated link text
- `[ ]` Keep the X payload from degrading to link-only by default

### Ticket PRISM-061-4: Share latency and reuse
- `[x]` Image work is no longer tied to live DOM capture on click
- `[x]` Prewarm or reuse the share card before the user taps share
- `[ ]` Reduce perceived wait time when opening the share panel
- `[ ]` Keep share preparation off the critical click path where possible

### Ticket PRISM-061-5: Device QA
- `[ ]` Confirm Kakao, X, Instagram, and Message flows behave correctly on iOS Safari
- `[ ]` Confirm Kakao, X, Instagram, and Message flows behave correctly on Android Chrome
- `[ ]` Make the image-preparation step explicit when a channel cannot attach the image directly

## Epic PRISM-062: Image Save Diagnostics and Reliability
Owner: Frontend + Backend
Status: Planned

### Ticket PRISM-062-1: Save failure telemetry
- `[x]` Add structured logs for image save failures and share-image preparation failures
- `[ ]` Capture browser-specific save errors and correlate them with device/browser QA results

### Ticket PRISM-062-2: User guidance
- `[x]` Define the retry and user guidance path when image saving fails
- `[x]` Make failure modes observable before changing the save algorithm again

### Ticket PRISM-062-3: Failure triage
- `[ ]` Classify the top failure modes into save, render, and share-preparation buckets
- `[ ]` Record which browsers/devices most often fail during save/share preparation

## Epic PRISM-070: Admin Security Hardening
Owner: Backend + Ops
Status: Mostly Done

- `[x]` Admin auth uses a cookie-backed password gate
- `[x]` Admin CSV export is protected by auth
- `[x]` Removed fallback/query-string password acceptance
- `[ ]` Decide whether admin stays shared-secret based or moves to stronger role-based auth
- `[ ]` Add a short admin security note to the runbook

## Epic PRISM-080: Release Verification and Go-Live
Owner: Entire team
Status: Planned

### Ticket PRISM-080-1: Automated verification
- `[x]` Run `npm run tests`
- `[x]` Run `npm run smoke`
- `[ ]` Run `npm run harness:gate`

### Ticket PRISM-080-2: Real-device sign-off
- `[ ]` Verify share/image QA on real devices
- `[ ]` Freeze and document final production tuning values
- `[ ]` Review secret rotation and rollback steps

### Ticket PRISM-080-3: Launch closure
- `[ ]` Complete launch checklist sign-off
- `[ ]` Capture final release notes and known limitations

## Current Sprint Notes
- `[x]` The main risk is now visual fidelity, not backend flow completeness.
- `[x]` The biggest remaining product gap is how closely the exported image matches the in-app card.
- `[x]` The `브리오슈 타입` link exposed a bread-image mapping bug that needs to be treated as a parity issue.
- `[x]` Share performance should be improved by warming the share asset before click.
- `[x]` The share experience should stay inside one visible UI instead of opening a separate fallback modal.
- `[x]` Admin security is already hardened enough for the current launch scope, with only policy decision and runbook cleanup left.
- `[x]` The in-app result preview now renders the share asset immediately instead of showing an ugly intermediate placeholder.
- `[x]` The OG image route now uses the same `share-card` composition path as the main preview/export flow.
- `[ ]` Save/share preparation failures still need a real log/telemetry path before we change the save algorithm again.
- `[x]` X share should carry the image plus one link, not a duplicated-link payload or link-only share.

## Next Sprint Order
1. Finish PRISM-060-1 through PRISM-060-4 with screenshot evidence.
2. Finish PRISM-061-1 through PRISM-061-5 for Kakao, X, Instagram, and Message behavior.
3. Finish PRISM-062-1 through PRISM-062-3 so save/share failures are observable.
4. Complete PRISM-080-1 through PRISM-080-3 for harness, device QA, and launch sign-off.
5. Add the short PRISM-070 admin security note to the runbook.
