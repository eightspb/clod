# Sitewide Mobile Doctor Carousel Design

## Goal

Use the existing home-page `MobileDoctorCarousel` everywhere a public mobile page presents a changing collection of doctors. Replace both automatically rotating hero doctor cards and horizontal mobile `DoctorCard` strips while preserving every desktop presentation.

## Approved Behaviour

- Below `768px`, every doctor collection with two or more doctors uses the same carousel component, portrait depth treatment, plinth, controls, swipe gesture, keyboard navigation, booking action, and profile action as the home page.
- At `768px` and above, existing `HeroDoctorCard` and `DoctorCard` grid layouts remain visually and behaviourally unchanged.
- Mobile hero collections stop changing automatically. The visitor changes the active doctor explicitly by swiping, using the arrow controls, or using the supported keyboard keys.
- A collection with exactly one doctor remains a normal non-carousel card and exposes no inactive previous/next controls.
- An empty collection renders no doctor presentation.
- Existing doctor order, specialty filters, booking slugs, profile routes, ratings, content, and image assets remain unchanged.

## Scope

The responsive hero adapter applies to every public page currently rendering `HeroDoctorCard`:

- `Mammology.jsx`
- `Gynecology.jsx`
- `Endocrinology.jsx`
- `Nutrition.jsx`
- `SecondOpinion.jsx`
- `Vab.jsx`
- `Adenomioz.jsx`
- `Endometrioz.jsx`
- `EroziyaSheykyMatki.jsx`
- `Fibroadenoma.jsx`
- `Gipotireoz.jsx`
- `KistaMolochnoyZhelezy.jsx`
- `Mastopatiya.jsx`
- `TireoiditKhashimoto.jsx`

The responsive collection adapter replaces the hand-built mobile snap strips on these pages:

- `Mammology.jsx`
- `Gynecology.jsx`
- `Endocrinology.jsx`
- `Vab.jsx`
- `Adenomioz.jsx`
- `Endometrioz.jsx`
- `EroziyaSheykyMatki.jsx`
- `Fibroadenoma.jsx`
- `Gipotireoz.jsx`
- `KistaMolochnoyZhelezy.jsx`
- `Mastopatiya.jsx`
- `TireoiditKhashimoto.jsx`

The existing home and `/doctors` carousel integrations remain the reference implementation and are not replaced. Admin doctor lists, booking-dialog doctor selection, navigation menus, and individual doctor pages are outside this change.

## Architecture

Add two focused responsive presentation components rather than repeating breakpoint markup across every page:

1. `ResponsiveDoctorHero` owns the mobile/desktop split for hero doctor collections. For two or more doctors it renders `MobileDoctorCarousel` below `768px` and the existing `HeroDoctorCard` at larger sizes. It accepts the existing hero CTA destination and desktop wrapper classes so compact disease-page desktop cards keep their current dimensions. A page that previously hid a multi-doctor hero on mobile now shows the approved carousel there.
2. `ResponsiveDoctorCollection` owns the mobile carousel or single-card fallback plus the existing desktop `DoctorCard` grid. It accepts the desktop grid class so pages with different column containers retain their current desktop geometry.

Both components receive doctor data through props and delegate doctor interaction to existing components. They do not copy carousel state, filter logic, booking logic, or doctor-card rendering. `MobileDoctorCarousel` remains the only owner of active index, circular positions, gestures, selection feedback, and active-doctor actions.

For a multi-doctor hero, the hidden desktop portrait source must be media-gated so mobile browsers do not download a redundant full-size `HeroDoctorCard` portrait in addition to carousel portraits. Existing mobile carousel image loading and transparent portrait handling remain intact.

## Layout

- The carousel keeps its existing full-viewport mobile stage and fixed two-line plinth geometry.
- Hero carousels sit after the hero copy and actions within the existing document order. Their full-width stage may break out of the padded container exactly as the home carousel does.
- Section carousels sit after the existing section heading and description, replacing only the mobile snap strip.
- No new mobile carousel variant, compact mode, alternate controls, or page-specific portrait transform is introduced.
- Existing desktop wrapper classes and compact hero overrides remain attached to the desktop `HeroDoctorCard` branch.
- Transparent portrait edges remain unrotated and high-key. The established flat translation, scale, tonal filters, slight blur, and shadow rules are reused without page-specific perspective or alpha-contour effects.

## Accessibility and Interaction

- Every carousel receives a page-context label such as “Карусель маммологов” or “Карусель гинекологов”. When a page contains both hero and section carousels, their labels distinguish the two regions.
- Existing carousel semantics, active-slide exposure, live count, swipe threshold, arrow controls, Home/End keys, focus styling, booking button, profile link, reduced-motion behaviour, and selection feedback remain unchanged.
- CSS-hidden desktop and mobile branches must not expose duplicate controls to assistive technology at the active breakpoint.
- Single-doctor presentations must not announce themselves as carousels.

## Testing

Follow Red–Green–Refactor:

1. Add failing component tests for the responsive hero and collection contracts: multi-doctor mobile carousel, preserved desktop branch, single-doctor fallback, empty collection, propagated labels and CTA context, and retained desktop class names.
2. Run the focused tests and confirm they fail because the responsive adapters do not exist.
3. Implement the minimum adapters and media-gated hero portrait support, then make the focused tests pass.
4. Replace each page’s hero and mobile snap-strip markup with the adapters.
5. Add route-level Playwright coverage at `393x852` for representative mammology, gynecology, nutrition, and single-doctor endocrinology cases. Verify the correct number of carousel regions, no legacy snap strip, working doctor change, correct booking slug, and no duplicate visible desktop card.
6. Inspect full routes at `scrollY = 0`, including header-to-content spacing and the complete hero composition. Also inspect a lower doctor section after scrolling.
7. Run scoped component tests, relevant E2E tests, lint, production build, and `git diff --check`.

## Acceptance Criteria

- All public multi-doctor hero presentations use the home carousel below `768px`.
- All public multi-doctor section strips use the home carousel below `768px`.
- Desktop hero cards and grids retain their current appearance and automatic hero rotation.
- Mobile carousels never auto-advance.
- Single-doctor pages show no non-functional carousel navigation.
- Booking and profile actions always target the active doctor.
- No legacy mobile `overflow-x-auto` doctor strip remains in the scoped pages.
- Mobile hero routes have no header overlap, unintended top gap, horizontal page overflow, cropped transparent portrait, gray receding portrait, variable plinth geometry, or duplicate visible doctor presentation.
- No dependency, route, environment variable, API, security behaviour, or doctor content changes.
