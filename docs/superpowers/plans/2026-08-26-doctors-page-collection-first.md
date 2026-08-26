# Doctors Page Collection-First Implementation Plan

> Shared-worktree note: the target files contain overlapping uncommitted work. Do not stage or commit implementation files from this plan, and preserve unrelated changes.

## Goal

Put the selectable doctor collection before the clinic editorial content on mobile and desktop. The route should present “Ваши доктора”, specialty filters, the responsive collection, and then “Врачи клиники Одинцова”. Keep the existing coverflow mechanics, desktop cards, doctor routes, booking actions, and SEO data.

## Architecture

- `Doctors.jsx` remains the single owner of filter state.
- One semantic collection section feeds the mobile carousel and desktop grid from the same filtered array.
- The unfiltered state remains internal; only specialty buttons are visible, and pressing the active specialty clears it.
- `global.css` owns responsive presentation, filter overflow, plinth rhythm, rating color, and route-scoped floating-control behavior.
- Component tests cover state and semantic order; Playwright covers rendered geometry and responsive behavior.

## Task 1 — Component contracts

**Files:** `src/components/pages/Doctors.test.jsx`

- [x] Require one `h1` named “Ваши доктора”.
- [x] Require filters before both responsive collections and both collections before the editorial `h2`.
- [x] Keep the result count polite and visually hidden.
- [x] Remove the visible “Выберите специализацию” heading.
- [x] Verify RED before implementation and GREEN afterward.

## Task 2 — Browser contracts

**Files:** `e2e/mobile-doctor-carousel.spec.js`

- [x] Replace the obsolete direct-below-header assertion with collection-first order checks.
- [x] Verify the mobile filter strip scrolls internally at `320px` without page overflow.
- [x] Require warm-gold collection stars on mobile and desktop.
- [x] Verify the desktop grid is visible and the mobile carousel is hidden at the desktop breakpoint.
- [x] Verify RED before implementation and GREEN afterward.

## Task 3 — React structure

**Files:** `src/components/pages/Doctors.jsx`

- [x] Render the collection heading, accessible specialty group, and live result count first.
- [x] Keep the mobile carousel and desktop grid in the same semantic section.
- [x] Move the existing clinic editorial content after the collection and change its heading to `h2`.
- [x] Preserve doctor statistics, empty state, shared CTA, routes, and filtering behavior.
- [x] Remove the visible “Все доктора” control while preserving the initial full collection.
- [x] Make the active specialty clearable so users can return to all doctors without reloading.

## Task 4 — Responsive presentation

**Files:** `src/styles/global.css`

- [x] Add compact responsive collection-heading and section spacing.
- [x] Make specialty pills a one-line mobile scroll strip and a wrapping desktop group.
- [x] Apply `#C49738` to mobile and desktop collection stars.
- [x] Set the approved plinth, specialty, and action-row spacing without changing coverflow depth.
- [x] Keep filter focus indicators visible inside the scroll container with sufficient contrast.
- [x] Hide the overlapping theme switcher only on the mobile doctors route; retain it elsewhere and on desktop.
- [x] Preserve portrait spatial transforms when reduced motion removes transitions.

## Task 5 — Documentation and delivery

**Files:** `README.md`, doctors-page design specs, this plan

- [x] Document the collection-first route order and clearable specialty-only filters.
- [x] Remove obsolete wording that placed the carousel directly below the header.
- [x] Keep mobile asset and responsive-fit documentation aligned with doctor data.
- [x] Visually inspect `320 × 568`, `375 × 812`, `430 × 932`, and `1280 × 900`.
- [x] Verify no page-level horizontal overflow, stable plinth geometry, visible rating/actions, gold stars, mobile coverflow, and desktop grid.
- [x] Run focused and full Vitest, the full doctors-carousel Playwright file on an isolated server, scoped ESLint, whitespace checks, and the production build.
- [x] Complete independent spec, quality, accessibility, and production-readiness reviews.

## Acceptance Criteria

- One visible `h1` introduces the doctor collection on both responsive presentations.
- Specialty controls are the only visible filters, remain keyboard accessible, and can be toggled off.
- Mobile and desktop render the same filtered doctors in the approved presentation for each breakpoint.
- The editorial clinic block follows the collection in DOM and rendered order.
- Mobile portraits retain transparent assets, flat depth, stable two-line names, fixed information geometry, and user-initiated selection feedback.
- Rating stars use the fixed warm-gold token and remain readable at narrow widths.
- Reduced-motion mode changes motion only, not spatial composition.
- Documentation and automated checks describe and protect the delivered behavior.
