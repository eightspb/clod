# Mobile Doctor Coverflow Design

## Goal

Present clinic doctors on mobile as a dimensional flat-projection coverflow: one focused transparent portrait occupies roughly 70% of the viewport while neighbouring cutout figures recede frontally at both sides. A single full-width lower plinth hides the portrait crop and carries the active doctor's concise information.

## Scope

- Apply below 768 px on the home doctor section and `/doctors` listing.
- Preserve the desktop `DoctorCard`, routes, filters, doctor order, ratings, profile links, and existing theme system.
- Use the clinic's real transparent `photoFull` assets as sources and preserve their alpha channel in responsive `photoMobile` WebP derivatives. Render them with `contain` at the podium edge; square derivatives may scale to the scene width but must not be cropped. Do not generate or alter faces.
- Add no dependency. This visual specification preserves the coverflow mechanics; the current `/doctors` information order is defined by the later collection-first design.

## Composition

- The active portrait stage is `70vw`, capped near `301px` on a 430 px viewport.
- Portrait slides have no card background, border, glow panel, rectangular shadow, or light alpha-contour: only the source silhouettes and a dark grounding shadow are visible.
- The portrait stack uses three exact depth levels: active `scale(1)`, immediate neighbours `scale(.757576)`, and second neighbours `scale(.573921)`. Each layer toward the viewer is exactly 32% larger than the layer behind it.
- Immediate neighbours sit behind the active portrait with a `24vw` horizontal offset, lower vertical position, reduced scale, and no perspective rotation.
- Second neighbours remain as quieter frontal depth layers with a `41vw` offset, smaller scale, lower opacity, and no geometric distortion.
- Immediate neighbours are fully opaque at both the slide and portrait levels. Their recession is communicated without transparency by `saturate(.62) brightness(1.10) contrast(.86) blur(.4px)`, so a third-layer body cannot show through a second-layer body.
- Second neighbours use `opacity: .64` with `saturate(.30) brightness(1.16) contrast(.72) blur(1.2px)`. They remain visibly softer and quieter than immediate neighbours while keeping the same frontal projection.
- The portrait stack starts at `2.8rem` instead of `3.5rem`, reducing the top inset by 20% and moving heads closer to the mobile header. Short-height screens use the same 20% reduction from `3.1rem` to `2.48rem`.
- On `/doctors`, the mobile route content begins below the sticky header with the “Ваши доктора” collection heading and specialty filters; the carousel follows those controls immediately. Breadcrumbs remain desktop-only, while the “Врачи клиники Одинцова” editorial introduction and statistics follow the responsive doctor collection.
- The layout is circular, so the last doctor is visible to the left of the first doctor and navigation wraps in both directions. A two-doctor result mirrors its only neighbour into both visual sides.
- The carousel height follows `clamp(31rem, calc(112vw + 8.75rem), 39rem)`, keeping the visible head close to the header without cropping transparent portraits at 320, 375, and 430 px widths.

## Lower Plinth

- One plinth spans the complete viewport width rather than repeating inside every slide.
- The portraits continue about 28 px behind its upper edge so the crop reads as a deliberate podium edge.
- A raised upper plane, a denser front face, inner highlights, theme-tinted body, and lower shadow create volume without adding a separate portrait card.
- Only the active doctor's name, primary specialty, ProDoctorov rating, booking action, and profile action appear inside it.
- Every doctor name occupies exactly two visual lines: surname and given name on the first line, patronymic on the second. The heading, specialty, action row, and plinth retain identical relative geometry for all nine doctors.
- The rating, booking action, and profile action use a fixed three-column grid. Variable rating text may contract inside its own column, but it must not move or overlap the two right-aligned actions.
- Solid-fill fallbacks preserve contrast when transparency is reduced or backdrop filters are unavailable.

## Interaction

- Previous and next buttons wrap around the collection.
- Horizontal pointer or touch swipes change doctor after a 48 px horizontal gesture; vertical page scrolling remains available.
- Left Arrow, Right Arrow, Home, and End remain supported.
- The polite counter announces the active position.
- Filtering resets the coverflow to the first matching doctor.
- A real user-initiated index change emits one subtle 18 ms Web Audio selection tick (`triangle`, `700 → 480 Hz`, low gain) and requests an 8 ms vibration only where the browser supports it. The audio context is created lazily, reused, resumed after suspension, and closed on unmount.
- Initial render, filter reset, insufficient/vertical swipes, and navigation to the already-active index emit no feedback. Audio or vibration failures never block doctor navigation.
- On route viewports no taller than `680px`, the global sticky booking bar is suppressed so it cannot cover the carousel rating or profile action.

## Accessibility and Performance

- The region and slides retain carousel semantics.
- Only the active slide is exposed to assistive technology.
- The single active profile action and rating link are the only doctor links in the tab order.
- Every visible layer uses a 600 px responsive WebP derived from the transparent PNG, reducing the initial five-layer payload from roughly 4.25 MiB to about 150 KiB while preserving transparency.
- Hidden doctors render inert placeholders and do not request images.
- Animation uses flat translation, scale, tonal filters, and opacity only. Reduced motion removes transitions while retaining the spatial layout.

## Verification

- Vitest covers circular positions, button and keyboard navigation, pointer swipe, filtering reset, active links, and selective portrait loading.
- Scoped ESLint, the targeted component suite, relevant integration tests, and the production build pass.
- Browser QA checks the default and an alternate accent palette at 320 x 568, 375 x 812, and 430 x 932.
- Browser assertions cover opaque washed immediate neighbours, progressively softer second neighbours, exactly two rendered name lines, and invariant plinth-relative geometry while cycling all nine doctors.
- Component tests cover one feedback event per real index change, no feedback for no-op/reset paths, audio-context reuse and cleanup, and graceful absence or rejection of feedback APIs.
