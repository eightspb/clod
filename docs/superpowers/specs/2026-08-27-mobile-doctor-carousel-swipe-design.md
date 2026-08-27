# Mobile Doctor Carousel Swipe Design

## Goal

Make the doctors carousel reliably respond to a one-finger horizontal swipe on mobile devices while preserving native vertical page scrolling.

## Scope

The behavior belongs to the presentation layer in `MobileDoctorCarousel`. Swipe listeners apply only to the existing portrait track and do not extend over the information plinth or the rest of the page. Arrow controls, keyboard navigation, circular wrapping, selection feedback, portrait geometry, and coverflow styling remain unchanged.

## Interaction

- Record the first touch point when a single-finger gesture starts in the portrait track.
- On touch end, compare horizontal and vertical displacement.
- Move to the next doctor after a left swipe and the previous doctor after a right swipe only when horizontal displacement is at least 48 pixels and greater than vertical displacement.
- Ignore short, vertical, multi-touch, and cancelled gestures.
- Do not cancel the browser's touch event or call `preventDefault`; the existing `touch-action: pan-y` declaration keeps vertical scrolling native.

## Implementation Boundary

Replace the current pointer-based swipe state and handlers with touch-specific handlers in `src/components/MobileDoctorCarousel.jsx`. Keep the gesture state in a ref so touch movement does not trigger React renders. Reuse the existing `moveTo` operation so wrapping and selection feedback continue to have one source of truth.

## Testing

Follow Red-Green-Refactor in `src/components/MobileDoctorCarousel.test.jsx`:

1. Add a failing test proving that a single-finger horizontal touch gesture changes the active doctor.
2. Add a test proving that a primarily vertical touch gesture does not change the doctor and is not prevented.
3. Add a test proving that a horizontal gesture shorter than the threshold does not change the doctor.
4. Run the focused component test, then the full unit suite and lint.
5. Verify the `/doctors` route in a mobile viewport at `scrollY = 0`, including horizontal swipe behavior and uninterrupted vertical scrolling from the portrait area.

## Acceptance Criteria

- A left or right one-finger swipe over the portrait track changes exactly one doctor.
- Vertical scrolling beginning over the portrait track remains available.
- Touches outside the portrait track do not control the carousel.
- Short, vertical, cancelled, and multi-touch gestures do not change the active doctor.
- Existing arrow, keyboard, wrapping, feedback, accessibility, and portrait-depth behavior remains green.
