# Mobile Doctor Layer Stability and Selection Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the mobile doctor coverflow with opaque washed near layers, softer far layers, invariant two-line doctor information, and an iPhone-like selection tick for real doctor changes.

**Architecture:** Keep `MobileDoctorCarousel.jsx` as the interactive owner of the active index. CSS alone controls visual depth appearance and plinth geometry; deterministic JSX spans control the two name lines. A focused feedback object owns one lazily-created Web Audio context and optional vibration so navigation remains independent from unavailable or failing device APIs.

**Tech Stack:** Astro 4, React 18, JavaScript, CSS filters and grid, Web Audio API, Vibration API progressive enhancement, Vitest, Testing Library, Playwright.

---

### Task 1: Lock visual layers and plinth geometry in browser tests

**Files:**
- Modify: `e2e/mobile-doctor-carousel.spec.js`

- [ ] **Step 1: Add a RED layer-style contract**

Cycle the settled `previous`, `next`, `previous-far`, and `next-far` layers and assert one object: near effective alpha is `1`, near saturation is below `1`, near brightness is above `1`, near blur is above `0`, far blur exceeds near blur, and far effective alpha is below near alpha.

- [ ] **Step 2: Add RED two-line and invariant-geometry contracts**

After `document.fonts.ready`, cycle all nine doctors. Count actual visual text lines with `Range.getClientRects()` and collect plinth-relative name, specialty, and action rectangles. Expect nine two-line headings and nine identical geometry tuples.

- [ ] **Step 3: Run the browser tests and verify RED**

Run: `bunx playwright test e2e/mobile-doctor-carousel.spec.js --project=chromium --grep "washed|two visual lines|plinth geometry" --reporter=line --workers=1`

Expected: layer alpha/blur assertions fail and current line counts include one-line names with a roughly 20.64 px vertical shift.

### Task 2: Lock selection feedback behavior in component tests

**Files:**
- Modify: `src/components/MobileDoctorCarousel.test.jsx`
- Create: `src/lib/selection-feedback.test.js`

- [ ] **Step 1: Add RED feedback lifecycle tests**

Use fake Web Audio nodes and a fake vibration function. Assert one real move starts one oscillator and requests one vibration, repeated moves reuse one context, no-op moves emit nothing, unsupported/rejected APIs do not break navigation, and unmount closes one created context.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `bun run test:run -- src/components/MobileDoctorCarousel.test.jsx src/lib/selection-feedback.test.js`

Expected: fail because no selection-feedback module or carousel integration exists.

### Task 3: Implement reusable selection feedback

**Files:**
- Create: `src/lib/selection-feedback.js`
- Modify: `src/components/MobileDoctorCarousel.jsx`

- [ ] **Step 1: Implement the feedback object**

Create one lazy `AudioContext({ latencyHint: 'interactive' })`, synthesize an 18 ms low-gain triangle tick from 700 to 480 Hz, request `vibrate(8)` when callable, reuse the context, and expose an idempotent `close()`. Catch API failures so feedback never changes navigation behavior.

- [ ] **Step 2: Integrate only with real index changes**

Create the feedback object once per carousel instance. In `moveTo()`, return without feedback when the normalized index equals the current index; otherwise play once and update state. Close on unmount. Keep filter-reset state changes outside `moveTo()` so they remain silent.

- [ ] **Step 3: Run the focused tests and verify GREEN**

Run: `bun run test:run -- src/components/MobileDoctorCarousel.test.jsx src/lib/selection-feedback.test.js`

Expected: all focused tests pass without console errors.

### Task 4: Implement depth appearance and stable information layout

**Files:**
- Modify: `src/components/MobileDoctorCarousel.jsx`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Render deterministic two-line names**

Split every three-part doctor name after the given name and render two `.mobile-doctor-name-line` spans while preserving the full accessible heading name.

- [ ] **Step 2: Apply opaque near and softer far filters**

Set near slide and portrait opacity to `1` with `saturate(.62) brightness(1.10) contrast(.86) blur(.4px)`. Set far slide opacity to `.64` with `saturate(.30) brightness(1.16) contrast(.72) blur(1.2px)`. Keep exact scales `1 / .757576 / .573921` and flat zero-Z transforms unchanged.

- [ ] **Step 3: Freeze plinth geometry**

Give the name a fixed two-line block size and make the action row `grid-template-columns: minmax(0, 1fr) max-content max-content`. Constrain rating overflow inside the first column so variable review counts cannot move or overlap booking/profile actions.

- [ ] **Step 4: Run browser tests and verify GREEN**

Run: `bunx playwright test e2e/mobile-doctor-carousel.spec.js --project=chromium --reporter=line --workers=1`

Expected: all mobile carousel tests pass, including the unchanged exact scale and frontal projection contracts.

### Task 5: Document, visually QA, and validate

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `docs/superpowers/specs/2026-08-25-mobile-doctor-carousel-design.md`

- [ ] **Step 1: Record the durable rule**

Add one project rule: depth filters must not lower near-layer alpha, and variable doctor copy must not change plinth geometry.

- [ ] **Step 2: Inspect real route viewports**

Use the Playwright CLI at 320 x 568, 375 x 812, and 430 x 932. Cycle all nine doctors and verify no body show-through in near layers, progressive far softness, fixed names/actions, and unchanged crop/control behavior.

- [ ] **Step 3: Run final validation**

Run targeted Vitest, full mobile-carousel Playwright, scoped ESLint with `--no-ignore` for E2E, `git diff --check`, and `bun run build`. Record unrelated dirty-worktree failures separately.
