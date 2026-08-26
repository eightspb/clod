# Mobile Doctor Depth Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise the mobile portrait stack by 20% of its current top inset and establish an exact 32% size increase from far to near and from near to active.

**Architecture:** Keep the existing React carousel and transparent `photoMobile` assets unchanged. Express the approved geometry as CSS custom properties in `global.css`, apply one portrait art-direction scale per asset shape at every depth, and verify computed browser transforms with a focused Playwright specification.

**Tech Stack:** Astro 4, React 18, CSS transforms, Playwright, Bun

---

### Task 1: Lock the approved geometry in a browser test

**Files:**
- Create: `e2e/mobile-doctor-carousel.spec.js`

- [ ] **Step 1: Write the failing depth test**

```js
import { test, expect } from '@playwright/test'

const MOBILE_VIEWPORT = Object.freeze({ width: 375, height: 812 })

async function scaleOf(slide) {
  return slide.evaluate((element) => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform)
    return Number(Math.hypot(matrix.m11, matrix.m12, matrix.m13).toFixed(6))
  })
}

test('uses the approved three-level doctor depth scale', async ({ page }) => {
  await page.setViewportSize(MOBILE_VIEWPORT)
  await page.goto('/doctors')
  const carousel = page.locator('[data-mobile-doctor-carousel]')
  await expect(carousel).toBeVisible()
  const scales = [
    await scaleOf(carousel.locator('[data-coverflow-position="current"]')),
    await scaleOf(carousel.locator('[data-coverflow-position="next"]')),
    await scaleOf(carousel.locator('[data-coverflow-position="next-far"]')),
  ]
  expect(scales).toEqual([1, 0.757576, 0.573921])
})
```

- [ ] **Step 2: Write the failing vertical-inset test**

```js
test('reduces the standard portrait top inset by twenty percent', async ({ page }) => {
  await page.setViewportSize(MOBILE_VIEWPORT)
  await page.goto('/doctors')
  const top = await page.locator('[data-coverflow-position="current"]').evaluate((element) => parseFloat(getComputedStyle(element).top))
  expect(top).toBeCloseTo(44.8, 1)
})
```

- [ ] **Step 3: Run the test to verify RED**

Run: `bunx playwright test e2e/mobile-doctor-carousel.spec.js --project=chromium`

Expected: FAIL because the current scales are `1 / .91 / .8` and the current top inset is `56px`.

### Task 2: Apply the exact CSS geometry

**Files:**
- Modify: `src/styles/global.css:2023-2425`

- [ ] **Step 1: Add reusable geometry variables**

```css
--mobile-doctor-depth-current: 1;
--mobile-doctor-depth-near: 0.757576;
--mobile-doctor-depth-far: 0.573921;
```

- [ ] **Step 2: Raise the portrait stack and apply depth variables**

```css
.mobile-doctor-slide {
  top: 2.8rem;
}
.mobile-doctor-slide[data-coverflow-position='current'] {
  transform: translate3d(-50%, 0, 0) scale(var(--mobile-doctor-depth-current));
}
.mobile-doctor-slide[data-coverflow-position='previous'],
.mobile-doctor-slide[data-coverflow-position='next'] {
  transform: translate3d(calc(-50% - var(--mobile-doctor-near-offset)), 1.15rem, 0) scale(var(--mobile-doctor-depth-near));
}
.mobile-doctor-slide[data-coverflow-position='previous-far'],
.mobile-doctor-slide[data-coverflow-position='next-far'] {
  transform: translate3d(calc(-50% - var(--mobile-doctor-far-offset)), 2.35rem, 0) scale(var(--mobile-doctor-depth-far));
}
@media (max-width: 767px) and (max-height: 680px) {
  .mobile-doctor-slide {
    top: 2.48rem;
  }
}
```

Keep the existing opposite horizontal translation signs on the right-side `next` selectors. Use the same three scale variables and zero-Z frontal transforms in the reduced-motion overrides.

- [ ] **Step 3: Preserve art direction independently from depth**

```css
.mobile-doctor-slide {
  --mobile-doctor-portrait-scale: 1.04;
}
.mobile-doctor-slide[data-photo-fit='square'] {
  --mobile-doctor-portrait-scale: 1.42;
}
```

Use `scale(var(--mobile-doctor-portrait-scale))` for active and side portrait transforms so every depth layer uses the same asset-shape scale and the 32% slide ratio remains exact.

```css
.mobile-doctor-portrait {
  transform: translate3d(0, 0.75rem, 0) scale(var(--mobile-doctor-portrait-scale));
}
.mobile-doctor-slide:not([aria-current='true']) .mobile-doctor-portrait {
  transform: translate3d(0, 1.35rem, 0) scale(var(--mobile-doctor-portrait-scale));
}
.mobile-doctor-slide[data-coverflow-position='previous'] .mobile-doctor-portrait,
.mobile-doctor-slide[data-coverflow-position='previous-far'] .mobile-doctor-portrait {
  transform: translate3d(-13%, 1.35rem, 0) scale(var(--mobile-doctor-portrait-scale));
}
.mobile-doctor-slide[data-coverflow-position='next'] .mobile-doctor-portrait,
.mobile-doctor-slide[data-coverflow-position='next-far'] .mobile-doctor-portrait {
  transform: translate3d(13%, 1.35rem, 0) scale(var(--mobile-doctor-portrait-scale));
}
```

- [ ] **Step 4: Run the focused test to verify GREEN**

Run: `bunx playwright test e2e/mobile-doctor-carousel.spec.js --project=chromium`

Expected: 2 tests pass.

### Task 3: Verify visual and project quality

**Files:**
- Modify: `docs/superpowers/specs/2026-08-25-mobile-doctor-carousel-design.md`

- [ ] **Step 1: Inspect 320, 375, and 430 pixel viewports**

Check the active, near, and far layers, both square and vertical portraits, the reduced top gap, transparent backgrounds, and the plinth crop. Confirm the head and body remain visible without clipping.

- [ ] **Step 2: Run focused unit and static checks**

Run: `bun run test:run -- src/components/MobileDoctorCarousel.test.jsx src/lib/doctors-data.test.js`

Run: `bunx eslint src/components/MobileDoctorCarousel.jsx src/components/MobileDoctorCarousel.test.jsx src/lib/doctors-data.js src/lib/doctors-data.test.js e2e/mobile-doctor-carousel.spec.js`

Run: `git diff --check -- src/styles/global.css e2e/mobile-doctor-carousel.spec.js docs/superpowers/specs/2026-08-25-mobile-doctor-carousel-design.md`

Expected: all commands exit with status 0.

- [ ] **Step 3: Run the production build**

Run: `bun run build`

Expected: build exits with status 0.
