# Mobile Doctor Carousel Swipe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make one-finger horizontal swipes over the mobile doctor portrait track change doctors while native vertical page scrolling remains available.

**Architecture:** Keep the existing Pointer Events implementation because a real touch-enabled Chromium reproduction confirms that it already converts finger input into `pointerdown`/`pointermove`/`pointerup`, changes one doctor, and preserves vertical scrolling through `touch-action: pan-y`. Close the actual gap by adding browser-level regression coverage with native touch input; modify production code only if that test reveals a reproducible defect.

**Tech Stack:** React 18, JavaScript, Testing Library, Vitest, Astro 4, Playwright

---

## File Map

- Modify `e2e/mobile-doctor-carousel.spec.js`: exercise native horizontal, vertical, and out-of-scope touch sequences in a touch-enabled Chromium context.
- Modify `src/components/MobileDoctorCarousel.test.jsx`: add missing characterization for vertical, short, cancelled, and secondary pointer paths.
- Inspect `src/components/MobileDoctorCarousel.jsx`: retain the working Pointer Events implementation unless the browser test reproduces a defect.
- Inspect `src/styles/global.css`: retain the existing `touch-action: pan-y` contract without changing portrait geometry.
- Do not modify `README.md`: this interaction adjustment does not change architecture, commands, environment variables, routes, or public API contracts.

## Audit Findings

- The original plan incorrectly treated Pointer Events as the cause without reproducing the reported behavior.
- A real CDP touch sequence at 390 × 844 changes `/doctors` from `1 из 9` to `2 из 9`; the same sequence also works in the home-page carousel.
- A real vertical touch sequence beginning in the `/doctors` portrait track moves `scrollY` from 0 to 102 and leaves the active doctor unchanged.
- Replacing Pointer Events with Touch Events would regress unified mouse, pen, and touch support and would duplicate browser input semantics.
- The existing unit test uses a synthetic mouse event with pointer event names and covers only an accepted left swipe; it does not cover browser touch integration or rejected gesture paths.
- The correct missing artifact is a browser-level touch regression test, not a second production input path.

### Task 1: Add native touch regression coverage

- [ ] **Step 1: Add a touch-enabled browser helper**

In `e2e/mobile-doctor-carousel.spec.js`, add focused helpers that create a mobile Chromium context with `hasTouch: true`, open `/doctors`, wait for the hydrated carousel, and dispatch a sequence through the Chromium DevTools `Input.dispatchTouchEvent` command. Keep the existing visual tests on their current context.

- [ ] **Step 2: Add the horizontal touch scenario**

Add `changes exactly one doctor after left and right finger swipes over the portrait track`. Begin at least 100 pixels to the right of the ending point for the left swipe, reverse those points for the right swipe, keep vertical displacement below the 48-pixel threshold, and assert one final sequence proving `1 из 9 → 2 из 9 → 1 из 9`.

- [ ] **Step 3: Add the vertical scrolling scenario**

Add `preserves vertical page scrolling from the portrait track`. Confirm `scrollY = 0`, drag upward in several native touch moves from the portrait track, and assert one final state proving positive page scroll and an unchanged doctor count.

- [ ] **Step 4: Add the gesture-scope scenario**

Add `ignores a horizontal finger swipe over the information plinth`. Dispatch a horizontal native touch sequence within `.mobile-doctor-plinth` and assert that the active count remains `1 из 9`.

- [ ] **Step 5: Run the focused scenarios**

Run `bun run test:e2e -- e2e/mobile-doctor-carousel.spec.js --project=chromium --workers=1 --grep "finger swipe|vertical page scrolling"`.

Expected: all three characterization tests pass against the current Pointer Events implementation. If any fails, stop and use the captured event sequence to identify a specific production defect before changing the component.

### Task 2: Verify existing gesture boundaries

- [ ] **Step 1: Add missing rejected-pointer characterization**

In `src/components/MobileDoctorCarousel.test.jsx`, add separate tests proving that a primarily vertical pointer gesture, a horizontal gesture shorter than 48 pixels, a pointer-cancelled gesture, and a non-primary pointer gesture leave the first doctor active. Use one final assertion per test and keep each fixture local.

- [ ] **Step 2: Run the focused component test file**

Run `bun run test:run -- src/components/MobileDoctorCarousel.test.jsx`.

Expected: the accepted swipe and all new rejected-path characterizations pass with the existing component.

- [ ] **Step 3: Review gesture scope and CSS contract**

Confirm in `src/components/MobileDoctorCarousel.jsx` that pointer handlers remain attached only to `.mobile-doctor-carousel-track`. Confirm in `src/styles/global.css` that this track retains `touch-action: pan-y` and that the information plinth is outside the track.

Expected: only portrait-track gestures can select a doctor, while vertical scrolling remains browser-native.

- [ ] **Step 4: Review portrait invariants**

Confirm that no production component or style change modifies scale, translation, saturation, opacity, brightness, contrast, blur, plinth geometry, perspective, or portrait shadow.

Expected: the mobile carousel's high-key flat coverflow remains visually unchanged.

### Task 3: Run repository validation

- [ ] **Step 1: Run the complete mobile carousel E2E file**

Run `bun run test:e2e -- e2e/mobile-doctor-carousel.spec.js --project=chromium --workers=1`.

Expected: all carousel interaction and visual acceptance tests pass.

- [ ] **Step 2: Run the full unit suite**

Run `bun run test:run`.

Expected: all Vitest files pass.

- [ ] **Step 3: Run lint**

Run `bun run lint`.

Expected: exit code 0 with no new lint errors.

- [ ] **Step 4: Review the focused diff**

Run `git diff --check` and inspect the diff for the two planning documents, `e2e/mobile-doctor-carousel.spec.js`, and `src/components/MobileDoctorCarousel.test.jsx`.

Expected: no whitespace errors, no unrelated edits, and no production carousel or style changes unless a browser failure required a separately proven fix.

### Task 4: Finalize the verified behavior

- [ ] **Step 1: Confirm documentation scope**

Verify that no command, environment variable, architecture, route, API contract, or reusable project convention changed.

Expected: no `README.md`, `.env.example`, rule, or architecture documentation update is needed.

- [ ] **Step 2: Commit the regression coverage**

Stage the audited design, implementation plan, and `e2e/mobile-doctor-carousel.spec.js`, then commit with `test: verify mobile doctor touch gestures`.

- [ ] **Step 3: Verify the final tree**

Run `git status --short` and inspect the latest commit summary.

Expected: no accidental generated files or unrelated edits remain.
