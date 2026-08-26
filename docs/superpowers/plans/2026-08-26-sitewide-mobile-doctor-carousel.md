# Sitewide Mobile Doctor Carousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every multi-doctor mobile hero rotation and horizontal doctor-card strip with the existing home-page doctor carousel while preserving single-doctor and desktop presentations.

**Architecture:** Add one responsive hero adapter and one responsive collection adapter around the existing `MobileDoctorCarousel`, `HeroDoctorCard`, and `DoctorCard`. Keep carousel state and interaction in `MobileDoctorCarousel`; the adapters only select mobile versus desktop presentation, preserve page-specific wrapper classes, and avoid carousel controls for zero- or one-doctor collections. Hydrate the five currently server-only specialty page components so their new mobile carousels are interactive.

**Tech Stack:** Astro 4, React 18, JavaScript, Tailwind/CSS variables, Vitest, Testing Library, Playwright, Bun.

---

## File Structure

- Create `src/components/ResponsiveDoctorHero.jsx`: responsive multi-doctor hero boundary and single/empty fallback.
- Create `src/components/ResponsiveDoctorHero.test.jsx`: hero breakpoint, accessibility label, CTA propagation, desktop-class, and collection-size contracts.
- Create `src/components/ResponsiveDoctorCollection.jsx`: responsive mobile carousel or single card plus desktop doctor grid.
- Create `src/components/ResponsiveDoctorCollection.test.jsx`: collection breakpoint, label, class, ordering, single, and empty contracts.
- Modify `src/components/HeroDoctorCard.jsx`: optionally media-gate a desktop-only hero portrait without changing default rendering.
- Modify `src/components/HeroDoctorCard.test.jsx`: verify the optional portrait media contract and unchanged default contract.
- Create `e2e/sitewide-mobile-doctor-carousel.spec.js`: route inventory, hydration, mobile interaction, desktop preservation, and `scrollY = 0` layout checks.
- Modify the 14 page components listed in Tasks 4 and 5: replace hero and mobile doctor-strip duplication with the responsive adapters.
- Modify `src/pages/mammology.astro`, `src/pages/gynecology.astro`, `src/pages/endocrinology.astro`, `src/pages/nutrition.astro`, and `src/pages/vab.astro`: hydrate the page React component with `client:idle`.
- Modify `README.md`: document the responsive doctor adapters and specialty-page hydration.

### Task 1: Specify the responsive component contracts

**Files:**

- Create: `src/components/ResponsiveDoctorHero.test.jsx`
- Create: `src/components/ResponsiveDoctorCollection.test.jsx`
- Modify: `src/components/HeroDoctorCard.test.jsx`

- [ ] **Step 1: Write failing `ResponsiveDoctorHero` tests**

Cover a two-doctor collection, an exact accessible carousel label, the desktop `HeroDoctorCard` branch, propagated `ctaHref`, preserved custom desktop wrapper classes/media query, a one-doctor non-carousel fallback, and an empty collection. Keep each Angry Test under twelve lines with one final assertion.

- [ ] **Step 2: Write failing `ResponsiveDoctorCollection` tests**

Cover a two-doctor mobile carousel, preserved doctor order in the desktop grid, custom mobile and desktop wrapper classes, a one-doctor mobile `DoctorCard` without carousel semantics, and an empty collection. Assert that no previous/next controls exist for the one-doctor case.

- [ ] **Step 3: Write a failing optional portrait-media test**

Extend `HeroDoctorCard.test.jsx` with a case that supplies the planned desktop portrait media query and expects a matching `<source>` plus a non-fetching fallback image. Keep the current no-prop rendering assertions unchanged.

- [ ] **Step 4: Run the focused suite and verify RED**

Run: `bun run test:run -- src/components/HeroDoctorCard.test.jsx src/components/ResponsiveDoctorHero.test.jsx src/components/ResponsiveDoctorCollection.test.jsx`

Expected: FAIL because the responsive adapters and portrait media option do not exist; the existing `HeroDoctorCard` tests still pass.

- [ ] **Step 5: Commit the red contracts**

Commit only the three test files with message: `test: specify responsive doctor presentations`.

### Task 2: Implement the responsive presentation adapters

**Files:**

- Create: `src/components/ResponsiveDoctorHero.jsx`
- Create: `src/components/ResponsiveDoctorCollection.jsx`
- Modify: `src/components/HeroDoctorCard.jsx`
- Test: `src/components/ResponsiveDoctorHero.test.jsx`
- Test: `src/components/ResponsiveDoctorCollection.test.jsx`
- Test: `src/components/HeroDoctorCard.test.jsx`

- [ ] **Step 1: Add optional media-gated portrait rendering**

Add a `portraitMedia` option to `HeroDoctorCard`. With no option, retain the existing image markup and loading behaviour. With an option, expose the real portrait only through a matching `<source>` and use the same transparent pixel strategy as `MobileDoctorCarousel` for the fallback `<img>` so a hidden desktop hero does not duplicate the mobile portrait download.

- [ ] **Step 2: Implement `ResponsiveDoctorHero` minimally**

For two or more doctors, render `MobileDoctorCarousel` below `768px` and a media-gated `HeroDoctorCard` in the supplied desktop wrapper. Accept `doctors`, `label`, `ctaHref`, `desktopClassName`, and `desktopMedia`. For one doctor, render only the normal hero card through the supplied desktop wrapper; for zero doctors, render nothing.

- [ ] **Step 3: Implement `ResponsiveDoctorCollection` minimally**

Accept `doctors`, `label`, `mobileClassName`, and `desktopClassName`. Render the existing carousel in the mobile branch only for two or more doctors; render one `DoctorCard` in the mobile branch for one doctor; render no presentation for zero doctors. Preserve the provided array order and map the same doctors into the desktop grid.

- [ ] **Step 4: Run the focused suite and verify GREEN**

Run: `bun run test:run -- src/components/HeroDoctorCard.test.jsx src/components/ResponsiveDoctorHero.test.jsx src/components/ResponsiveDoctorCollection.test.jsx`

Expected: all focused tests pass with zero warnings.

- [ ] **Step 5: Run scoped lint**

Run: `bunx eslint src/components/HeroDoctorCard.jsx src/components/HeroDoctorCard.test.jsx src/components/ResponsiveDoctorHero.jsx src/components/ResponsiveDoctorHero.test.jsx src/components/ResponsiveDoctorCollection.jsx src/components/ResponsiveDoctorCollection.test.jsx`

Expected: exit code `0`.

- [ ] **Step 6: Commit the adapters**

Commit the two new component files, their two tests, and the `HeroDoctorCard` implementation/test pair with message: `feat: add responsive doctor presentations`.

### Task 3: Specify sitewide route behaviour before migration

**Files:**

- Create: `e2e/sitewide-mobile-doctor-carousel.spec.js`

- [ ] **Step 1: Add the mobile route inventory contract**

At `393x852`, enumerate all 14 scoped routes and assert the visible carousel count. Expect two on `/mammology`, `/gynecology`, `/vab`, `/adenomioz`, `/endometrioz`, `/eroziya-sheyki-matki`, `/fibroadenoma`, `/kista-molochnoy-zhelezy`, and `/mastopatiya`; one on `/nutrition` and `/second-opinion`; and zero on `/endocrinology`, `/gipotireoz`, and `/tireoidit-khashimoto`. Wait for each React island to hydrate before measuring.

- [ ] **Step 2: Add the representative interaction contract**

On `/mammology`, scope to the labelled hero carousel, activate “Следующий врач”, and assert that the active doctor, booking slug, and profile route change together. Assert that the lower labelled carousel changes independently.

- [ ] **Step 3: Add layout and legacy-strip contracts**

At `scrollY = 0`, assert that the mobile header does not overlap the hero, the document width equals the viewport, the hero copy precedes the hero carousel, and no scoped page contains a visible legacy snap strip. On a `1280x900` viewport, assert that the mobile carousel is hidden and the existing hero/grid desktop branches are visible.

- [ ] **Step 4: Add single-doctor contracts**

On `/endocrinology`, `/gipotireoz`, and `/tireoidit-khashimoto`, assert that no carousel region or previous/next doctor controls exist while the expected doctor card remains visible in its original page position.

- [ ] **Step 5: Run the new E2E file and verify RED**

Run: `bun run test:e2e -- e2e/sitewide-mobile-doctor-carousel.spec.js --project=chromium --reporter=line --workers=1`

Expected: FAIL because specialty heroes still render `HeroDoctorCard`, lower sections still use snap strips, and five page components are not hydrated.

- [ ] **Step 6: Commit the red browser contract**

Commit the new E2E file with message: `test: require sitewide mobile doctor carousels`.

### Task 4: Migrate specialty, procedure, and second-opinion pages

**Files:**

- Modify: `src/components/pages/Mammology.jsx`
- Modify: `src/components/pages/Gynecology.jsx`
- Modify: `src/components/pages/Endocrinology.jsx`
- Modify: `src/components/pages/Nutrition.jsx`
- Modify: `src/components/pages/SecondOpinion.jsx`
- Modify: `src/components/pages/Vab.jsx`
- Modify: `src/pages/mammology.astro`
- Modify: `src/pages/gynecology.astro`
- Modify: `src/pages/endocrinology.astro`
- Modify: `src/pages/nutrition.astro`
- Modify: `src/pages/vab.astro`

- [ ] **Step 1: Replace six hero presentations**

Use `ResponsiveDoctorHero` with route-specific accessible labels. Preserve each existing doctor array, CTA destination, hero position, and desktop wrapper styling. The single-doctor endocrinology hero remains a normal card without carousel controls.

- [ ] **Step 2: Replace four lower mobile strips**

Use `ResponsiveDoctorCollection` in Mammology, Gynecology, Endocrinology, and Vab. Preserve section copy, doctor order, desktop column counts, and the existing `pt-6` or `pt-10` spacing through adapter props. Remove obsolete `DoctorCard` imports and all four hand-built `overflow-x-auto` snap strips.

- [ ] **Step 3: Hydrate five previously server-only page components**

Add `client:idle` to Mammology, Gynecology, Endocrinology, Nutrition, and Vab in their Astro routes. Do not change prerender flags, metadata, canonical data, JSON-LD, breadcrumbs, or service-data props. Keep the existing `SecondOpinion client:idle` directive unchanged.

- [ ] **Step 4: Run focused component tests**

Run: `bun run test:run -- src/components/HeroDoctorCard.test.jsx src/components/ResponsiveDoctorHero.test.jsx src/components/ResponsiveDoctorCollection.test.jsx src/components/MobileDoctorCarousel.test.jsx`

Expected: all focused tests pass.

- [ ] **Step 5: Run the representative E2E subset**

Run: `bun run test:e2e -- e2e/sitewide-mobile-doctor-carousel.spec.js --project=chromium --grep "mammology|gynecology|nutrition|endocrinology|vab|second-opinion" --reporter=line --workers=1`

Expected: the six migrated routes pass; route inventory cases for unmigrated condition pages remain excluded by the grep.

- [ ] **Step 6: Commit the specialty migration**

Commit only the six page components and five Astro routes with message: `feat: use mobile doctor carousel on specialty pages`.

### Task 5: Migrate disease pages

**Files:**

- Modify: `src/components/pages/Adenomioz.jsx`
- Modify: `src/components/pages/Endometrioz.jsx`
- Modify: `src/components/pages/EroziyaSheykyMatki.jsx`
- Modify: `src/components/pages/Fibroadenoma.jsx`
- Modify: `src/components/pages/Gipotireoz.jsx`
- Modify: `src/components/pages/KistaMolochnoyZhelezy.jsx`
- Modify: `src/components/pages/Mastopatiya.jsx`
- Modify: `src/components/pages/TireoiditKhashimoto.jsx`

- [ ] **Step 1: Replace eight hero presentations**

Use `ResponsiveDoctorHero` with distinct route labels. Preserve each existing `hidden lg:block` compact desktop wrapper and its nested hero-photo sizing classes. Pass `(min-width: 1024px)` as the desktop portrait media query. Multi-doctor routes gain the mobile carousel; Gipotireoz and TireoiditKhashimoto retain their current single-doctor mobile absence and compact desktop card.

- [ ] **Step 2: Replace eight lower mobile strips**

Use `ResponsiveDoctorCollection`, preserve each surrounding two-column page layout, the `pt-8` spacing, and the desktop two-column doctor grid. Single-doctor thyroid pages receive one normal mobile `DoctorCard` with no carousel semantics.

- [ ] **Step 3: Remove obsolete imports and markup**

Remove direct `HeroDoctorCard` and `DoctorCard` imports that no longer have a consumer. Confirm no `snap-mandatory` doctor strip remains in the eight files and no non-doctor horizontal scroller is altered.

- [ ] **Step 4: Run the complete sitewide E2E contract**

Run: `bun run test:e2e -- e2e/sitewide-mobile-doctor-carousel.spec.js --project=chromium --reporter=line --workers=1`

Expected: all route counts, interactions, single-doctor, desktop, and layout assertions pass.

- [ ] **Step 5: Commit the disease-page migration**

Commit the eight page components with message: `feat: use mobile doctor carousel on disease pages`.

### Task 6: Verify visual invariants and regressions

**Files:**

- Test: `e2e/sitewide-mobile-doctor-carousel.spec.js`
- Test: `e2e/mobile-doctor-carousel.spec.js`
- Test: `e2e/hero-alignment.spec.js`
- Inspect: `src/styles/global.css`

- [ ] **Step 1: Inspect `/mammology` at the reported viewport**

Open the full route at `393x852` and `scrollY = 0`. Verify header-to-content spacing, hero copy order, full-width stage breakout, transparent portrait edges, high-key receding doctors, fixed two-line plinth geometry, controls, and no horizontal page overflow. Scroll to the lower doctors section and repeat the carousel inspection.

- [ ] **Step 2: Inspect representative edge viewports**

Inspect `/gynecology` at `320x568`, `/nutrition` at `375x812`, and `/vab` at `430x932`. Change every visible doctor and verify no crop, gray receding layer, perspective rotation, light alpha-contour shadow, sticky-CTA collision, or theme-switcher collision.

- [ ] **Step 3: Verify desktop preservation**

Inspect `/mammology`, `/gynecology`, and `/adenomioz` at `1280x900`. Confirm the carousel is hidden, the existing hero doctor card is present in its original column, disease-page compact sizing remains intact, and lower doctor grids retain their prior columns and spacing.

- [ ] **Step 4: Run carousel and hero browser regression suites**

Run: `bun run test:e2e -- e2e/sitewide-mobile-doctor-carousel.spec.js e2e/mobile-doctor-carousel.spec.js e2e/hero-alignment.spec.js --project=chromium --reporter=line --workers=1`

Expected: all selected Playwright tests pass with zero failures.

- [ ] **Step 5: Review the scoped diff**

Confirm no page metadata, JSON-LD, API, booking flow, doctor data, global carousel geometry, or unrelated presentation changed.

### Task 7: Document and validate the finished change

**Files:**

- Modify: `README.md`
- Verify: all files changed by Tasks 1–6

- [ ] **Step 1: Update the component map and responsive behaviour documentation**

Add `ResponsiveDoctorHero.jsx` and `ResponsiveDoctorCollection.jsx` to the component tree. Document that all multi-doctor public mobile heroes and doctor sections reuse `MobileDoctorCarousel`, single-doctor collections remain cards, desktop remains unchanged, and five main specialty page components now hydrate with `client:idle`.

- [ ] **Step 2: Run all unit tests**

Run: `bun run test:run`

Expected: zero failed tests.

- [ ] **Step 3: Run repository lint**

Run: `bun run lint`

Expected: exit code `0` with no errors.

- [ ] **Step 4: Run the production build**

Run: `bun run build`

Expected: exit code `0`; all public routes generate or render under their existing SSG/SSR settings.

- [ ] **Step 5: Check patch integrity and requirements**

Run: `git diff --check`

Expected: no whitespace errors. Re-read the approved design and confirm every acceptance criterion maps to a passing component test, browser assertion, or completed visual inspection.

- [ ] **Step 6: Commit documentation and final verification state**

Commit `README.md` and any final test-only adjustments with message: `docs: document sitewide mobile doctor carousels`.
