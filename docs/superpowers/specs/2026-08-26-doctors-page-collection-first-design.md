# Doctors Page Collection-First Design

## Goal

Reorder the doctors index on mobile and desktop so selection comes first: “Ваши доктора”, specialty filters, the responsive doctor collection, and only then the editorial “Врачи клиники Одинцова” block. Preserve the current mobile coverflow, desktop cards, filtering behavior, doctor routes, booking actions, and SEO-critical doctor data.

## Approved Approach

Use one semantic content order and one filter state for both viewports. The collection changes presentation responsively: the existing coverflow remains mobile-only and the existing card grid remains desktop-only.

Rejected alternatives:

- Duplicating complete mobile and desktop headers would repeat filter markup and accessibility state.
- Reordering existing blocks only with CSS would leave keyboard, screen-reader, and document order inconsistent with the visible page.
- Replacing the desktop grid with a carousel would reduce scanability and was explicitly rejected.

## Page Order

The doctors route must render in this order:

1. Existing desktop breadcrumbs.
2. Collection introduction with the page heading “Ваши доктора”.
3. Specialty filter buttons.
4. Mobile coverflow below `768px`, or the existing doctor-card grid from `768px` upward.
5. Editorial clinic block headed “Врачи клиники Одинцова”, including its badge, copy, and statistics.
6. Existing help CTA.

The collection introduction, filters, and responsive collection form one section. The editorial block is a separate following section and must not appear between filters and doctors.

## Heading and Accessibility Semantics

- “Ваши доктора” becomes the route’s single visible `h1` on both mobile and desktop.
- “Врачи клиники Одинцова” becomes an `h2` because it introduces supporting clinic information after the selectable collection.
- The filter group has an accessible specialty-filter label and retains one `aria-pressed` button per tab.
- Filter-result changes retain a polite accessible count without placing a visible label between the filter buttons and collection.
- The mobile carousel keeps its existing region, slide, keyboard, swipe, counter, and active-link semantics.
- The desktop grid remains a normal scan-friendly list of doctor cards.

## Collection Header and Filters

- The collection header sits directly below the route chrome with compact responsive top padding: approximately `1rem` on mobile and `2.5rem` on desktop.
- The heading uses the existing serif display system and has no decorative badge above it.
- Filter pills sit `0.875rem` below the heading.
- Below `768px`, pills remain on one line in a horizontally scrollable, touch-friendly strip with hidden visual scrollbar and no page-width overflow.
- From `768px`, pills wrap naturally in place.
- The gap from the filters to the doctor collection is approximately `1rem` on mobile and `2rem` on desktop.
- The former bulky filter card and its “Выберите специализацию” heading are removed from the visible flow.

## Responsive Doctor Collection

- Mobile retains the full-width transparent coverflow, exact depth scales, flat projection, opaque washed immediate neighbours, progressively softer far neighbours, shared plinth, and circular navigation.
- Desktop retains the existing two- and three-column doctor-card grid and current card content.
- Both presentations consume the same filtered doctor array. Selecting a filter updates the currently visible collection and resets the mobile carousel silently to its first result.
- An empty result remains available after the collection controls and before the editorial block.

## Mobile Doctor Information Spacing

The shared plinth keeps invariant geometry for all doctors while gaining deliberate breathing room:

- Side padding is `1.25rem` from `361px` upward and `0.75rem` at `360px` and below so rating and both actions remain visible.
- The name begins about `1.25rem` below the plinth content edge and always occupies exactly two lines: surname plus given name, then patronymic.
- The specialty starts about `0.3rem` below the name block.
- The rating/action row starts about `0.8rem` below the specialty.
- The row keeps the fixed `minmax(0, 1fr) max-content max-content` grid so rating length cannot move the booking or profile actions.
- The numeric rating must remain visible at both `320px` and `375px`; review count may stay visually omitted in the compact plinth while remaining in the rating link’s accessible name.
- Short screens retain protected name/specialty space for the theme switcher without shrinking the action row.

## Golden Rating Stars

- Doctor rating stars in both the mobile coverflow and doctors-page desktop cards use one warm gold token, `#C49738`, independent of the active theme palette.
- The numeric rating remains normal high-contrast text.
- Mobile stars retain the subtle staggered glint and dark gold grounding shadow.
- The color change does not alter the rating link’s minimum `44px` touch target or accessible label.

## Editorial Block

- The current badge, explanatory copy, location copy, and three statistics remain unchanged in meaning.
- Its heading changes from `h1` to `h2` and the entire block moves below the responsive doctor collection.
- Mobile spacing after the coverflow is approximately `2rem`; desktop spacing after the card grid is approximately `4rem`.
- The block remains visually distinct through its current gradient and responsive text/statistics layout.

## Testing and Verification

- Component tests assert the semantic order: page `h1`, filter group, responsive collection, then editorial `h2`.
- Component tests retain filter-state and doctor-result coverage.
- Browser tests replace the obsolete “carousel directly below header” assertion with exact route-order and spacing checks.
- Mobile browser tests retain all nine-doctor checks for flat projection, transparent images, depth hierarchy, two-line names, fixed plinth geometry, visible numeric rating, and profile reachability.
- Browser tests verify filter pills do not overflow the page at `320px`, the desktop grid follows filters at a desktop viewport, and both mobile and desktop collection stars compute to `rgb(196, 151, 56)`.
- Visual QA covers `320 × 568`, `375 × 812`, `430 × 932`, and one desktop viewport at initial `scrollY = 0`.
- Targeted Vitest, full mobile-carousel Playwright, scoped ESLint, `git diff --check`, and `bun run build` must pass.
