# Mobile Doctor Carousel Swipe Design

## Goal

Make the doctors carousel reliably respond to a one-finger horizontal swipe on mobile devices while preserving native vertical page scrolling.

## Scope

The behavior belongs to the presentation layer in `MobileDoctorCarousel`. Swipe listeners apply only to the existing portrait track and do not extend over the information plinth or the rest of the page. Arrow controls, keyboard navigation, circular wrapping, selection feedback, portrait geometry, and coverflow styling remain unchanged.

## Interaction

- Record the primary pointer contact when a one-finger gesture starts in the portrait track.
- On pointer end, compare horizontal and vertical displacement.
- Move to the next doctor after a left swipe and the previous doctor after a right swipe only when horizontal displacement is at least 48 pixels and greater than vertical displacement.
- Ignore short, primarily vertical, secondary-pointer, and cancelled gestures.
- Do not cancel the browser's touch event or call `preventDefault`; the existing `touch-action: pan-y` declaration keeps vertical scrolling native.

## Implementation Boundary

Retain the existing Pointer Events implementation in `src/components/MobileDoctorCarousel.jsx`. A touch-enabled Chromium reproduction confirms that a native touch sequence produces `pointerdown`, `pointermove`, and `pointerup`, changes the active doctor, and leaves vertical scrolling available through `touch-action: pan-y`. Replacing this standard input path with touch-only handlers would reduce input compatibility without fixing a reproduced defect.

The missing boundary is browser-level regression coverage. Add a Chromium E2E scenario that dispatches native touch input through the browser protocol on the `/doctors` route and proves both horizontal selection and vertical scrolling from the portrait track. Production component code changes are required only if this browser scenario exposes a reproducible failure.

## Testing

Add browser-level characterization coverage in `e2e/mobile-doctor-carousel.spec.js`:

1. Create a touch-enabled mobile Chromium context for the `/doctors` route.
2. Dispatch a native horizontal touch sequence inside the portrait track and prove that exactly one doctor becomes active.
3. Dispatch a native vertical touch sequence from the same track at `scrollY = 0` and prove that the page scrolls while the doctor remains unchanged.
4. Dispatch a horizontal touch sequence over the information plinth and prove that it does not control the carousel.
5. Add focused component characterization for vertical, short, cancelled, and secondary pointer paths.
6. Run the focused E2E file, component tests, the full unit suite, and lint.
7. Recheck both `/doctors` at `scrollY = 0` and the home-page carousel without changing portrait geometry.

## Acceptance Criteria

- A left or right one-finger swipe over the portrait track changes exactly one doctor.
- Vertical scrolling beginning over the portrait track remains available.
- Touches outside the portrait track do not control the carousel.
- Short, vertical, cancelled, and secondary-pointer gestures do not change the active doctor.
- Existing arrow, keyboard, wrapping, feedback, accessibility, and portrait-depth behavior remains green.
