# Medflex Appointment Booking Design

## Goal

Replace the generic external Medflex widget and the simulated home-page appointment form with a first-party booking experience for every doctor currently published on the clinic website. A booking action on an individual doctor page must open directly on that doctor's available dates and times. A general booking action must start with doctor selection.

The integration must use the official Medflex clinic-token API without exposing the clinic token, Medflex identifiers, trusted pricing, or raw upstream errors to the browser.

## Scope

- Cover all nine doctors in `src/lib/doctors-data.js` and no unpublished Medflex doctors.
- Reuse every existing `[data-booking-btn]` entry point across the website.
- Add direct booking actions to doctor cards and the mobile doctor carousel while preserving profile links.
- Replace the fake success behavior in `AppointmentFormSection` with the real booking flow.
- Fetch current availability and create doctor appointments through a same-origin server API.
- Preserve Astro static rendering, SEO metadata, doctor JSON-LD, and the current desktop/mobile page structure.
- Keep the existing phone contact path as a fail-closed fallback.

## Non-Goals

- Do not expose all doctors returned by the clinic token automatically.
- Do not manage, cancel, or reschedule existing appointments in the first release.
- Do not build a patient account or store a reusable patient profile.
- Do not persist medical information or copy Medflex patient records into the website database.
- Do not retain or extend the external `booking.medflex.ru` widget as the primary flow.
- Do not add a new runtime UI or date-picker dependency.

## Entry Points and Doctor Context

One global React island is mounted in `Layout.astro` and owns the appointment dialog. It listens for clicks on the existing `[data-booking-btn]` contract, so general content pages do not need individual booking implementations.

Doctor-specific entry points add a local, public doctor slug such as `odintsov`:

- both booking actions on an individual doctor profile;
- the booking action on `DoctorCard`;
- the active item in `MobileDoctorCarousel`;
- the rotating `HeroDoctorCard`;
- global header and sticky actions while an individual doctor route is open.

The route passes its doctor slug to `Layout`, which exposes it as page booking context. An explicitly supplied trigger slug takes precedence over page context. The browser never receives Medflex `doctor_id`, `lpu_id`, `speciality_id`, the clinic token, or a trusted appointment price.

## Patient Flow

### General booking action

1. Open the dialog on doctor selection.
2. Search the nine website doctors by name or specialty.
3. Select a doctor.
4. Load and select a date and time.
5. Enter patient details and consent.
6. Review doctor, location, date, time, and price when available.
7. Submit once and show the booking result.

### Doctor-specific booking action

1. Open the same dialog with the website doctor already selected.
2. Load the nearest availability immediately.
3. Continue with time, patient details, review, and submission.

### Dates and times

- Show a horizontally scrollable 14-day date strip.
- Select the first available day automatically.
- Show an availability count on each date.
- Group time chips into `Утро`, `День`, and `Вечер`.
- Keep controls at least 44 px in both dimensions.
- Load a later date window on demand when the initial range is empty.

If the doctor has no online availability, offer later dates, other published doctors with the same specialty, and the clinic phone number. Recommendations never silently change the selected doctor.

## Responsive Presentation

Desktop uses a dialog approximately 960 px wide. A stable left column contains the doctor portrait, specialty, clinic location, and current booking summary. The right column contains the active step.

Mobile uses a full-height `100dvh` surface above the site's sticky booking bar. It has a sticky header and a sticky primary action/summary area, while the active step scrolls independently.

The presentation reuses the site's Lora and Golos Text typography, white surfaces, emerald accent, thin borders, large radii, restrained shadows, and specialty tints. No gradients or decorative animation are required for core comprehension.

## Interaction and Accessibility

- The dialog is labelled with `aria-labelledby` and exposes status updates through a polite live region.
- Opening moves focus to the dialog; closing restores focus to the exact trigger.
- Focus is trapped while the dialog is open.
- `Escape` closes non-submitting states.
- Background scrolling is locked without changing the page's apparent width.
- Loading uses stable skeletons rather than layout shifts.
- Invalid fields show an inline message and an accessible error association.
- Date and time state is never communicated through color alone.
- Reduced-motion preferences disable non-essential transitions.
- While a booking is being submitted, all duplicate submission controls are disabled.

## Components

### `BookingFlow`

The single global island owns open/closed state, selected website doctor, schedule state, current step, patient form state, submission state, and focus restoration. It resets only after a confirmed success or an intentional dismissal; a slot conflict keeps patient input.

### Focused child components

- `DoctorPicker`: filters and selects from the nine public doctors.
- `DoctorSummary`: displays the selected public doctor and trusted appointment summary.
- `SchedulePicker`: renders date navigation and grouped time slots.
- `PatientDetailsForm`: collects and validates patient details and consent.
- `BookingReview`: shows the final immutable summary before submission.
- `BookingResult`: represents confirmed, uncertain, and failed outcomes.

These remain presentation components. Validation, Medflex response normalization, doctor mapping, and booking invariants live in focused `src/lib` modules.

## Server Architecture

The browser calls a same-origin backend-for-frontend:

- `GET /api/appointments/slots?doctor=<slug>&from=<YYYY-MM-DD>&days=<1..14>`
- `POST /api/appointments/book`

The API handlers use `prerender = false`, return `Cache-Control: no-store`, and produce the project's stable JSON error shape. The browser supplies only a local doctor slug, selected start/end timestamps, patient data, consent, and an opaque booking intent identifier.

### Medflex client

`src/lib/medflex-client.js` is the only module that knows the upstream origin and authentication format. It:

- reads `MEDFLEX_CLINIC_TOKEN` only at runtime;
- fixes the origin to `https://api.medflex.ru`;
- sends `Authorization: Token ...` only to that origin;
- rejects redirects;
- applies bounded timeouts;
- validates response shape;
- maps upstream failures to internal typed errors;
- never logs the token, patient data, or raw upstream bodies.

### Doctor allowlist

`src/lib/medflex-doctors.js` maps each of the nine website slugs to explicitly verified numeric Medflex doctor, LPU, specialty, and town identifiers. ProDoctorov identifiers must never be reused for this purpose.

An onboarding discovery script may read the local runtime token and list sanitized LPU/doctor metadata for an operator. The final runtime mapping is explicit and fails closed. A missing, ambiguous, unpublished, or direct-booking-disabled mapping returns an unavailable result and the UI falls back to phone contact.

The open clinic token may cover more than one branch. Only explicitly configured LPU identifiers are accepted.

## Schedule Data Flow

1. Validate the local doctor slug, date, and day count.
2. Resolve the slug through the server allowlist.
3. Query the official Medflex schedule endpoint for only the allowed doctor/LPU and requested bounded window.
4. Normalize timestamps, duration, location, and price into a minimal browser response.
5. Drop slots outside the requested doctor/LPU mapping or in the past.
6. Return no upstream identifiers that the client could later present as trusted input.

Schedule requests are read-only and may use a short server-side cache keyed by doctor and date window. Browser responses remain `no-store`. Loading, empty, rate-limited, and temporarily unavailable states are distinct.

## Booking Data Flow

1. Require JSON, enforce a small request-size limit, validate same-origin submission, and apply a namespaced rate limit.
2. Validate the doctor slug, intent identifier, selected timestamps, patient names, phone, birthday, comment, and explicit consent.
3. Resolve trusted Medflex doctor/LPU/specialty data from the server allowlist.
4. Re-fetch current availability and require an exact slot match.
5. Take appointment duration and price from that current server response, never from the browser.
6. Atomically create or claim a durable booking intent fingerprint so concurrent duplicate requests cannot both call the paid Medflex operation.
7. Call the official direct doctor appointment endpoint once.
8. Persist only the minimum intent status needed for deduplication and uncertainty recovery; do not retain the patient form as an application record.
9. Return a normalized confirmation containing the claim identifier and the user-visible appointment summary.

## Validation and Privacy

- Normalize Russian names and enforce non-empty bounded values, with each name at most 100 characters.
- Normalize the phone to the Medflex-required Russian format and reject invalid numbers.
- Require a valid past birthday in `YYYY-MM-DD` form.
- Bound optional comments to 300 characters.
- Require an affirmative consent value; the server does not trust a hidden default.
- Reject unknown object keys where they could alter booking semantics.
- Never accept trusted doctor IDs, LPU IDs, specialty IDs, prices, or status fields from the browser.
- Never put patient data in URLs, analytics events, server logs, or client error reporting.

Before the paid POST is enabled, client-IP handling must not trust a spoofable first `X-Forwarded-For` entry. With the project's single Nginx proxy, the application should prefer the proxy-overwritten `X-Real-IP`, or Nginx should replace rather than append the external forwarding chain.

## Duplicate and Timeout Handling

Medflex does not expose an idempotency key for direct appointment creation, and a create call can take close to a minute. The website therefore uses a durable intent with `pending`, `confirmed`, `uncertain`, and `failed` states.

- A second request for the same active intent returns its current state and never starts a second upstream call.
- A known validation or slot conflict marks the attempt failed and permits a new slot selection.
- A network timeout after submission marks the intent uncertain and does not retry automatically.
- An uncertain intent is reconciled against Medflex appointment history before the UI offers any new submission.
- A confirmed intent returns the original confirmation on a safe repeat request.

The UI preserves patient fields during conflicts and uncertain-state checks.

## Error Model

- Unknown or unmapped doctor: online booking unavailable with phone fallback.
- Empty schedule: later dates and same-specialty alternatives.
- Slot conflict: `409`, refresh the schedule, retain entered patient data, and focus the new time choices.
- Invalid patient input: `400` with safe field-level details.
- Invalid origin or content type: `403`/`415` without upstream access.
- Rate limited: `429` with a calm retry message.
- Medflex unavailable before submission: `503` and retry schedule/submit manually.
- Medflex timeout after a possibly accepted submission: uncertain result and history reconciliation, never blind retry.
- Confirmed success: claim identifier, doctor, clinic location, local date/time, and an add-to-calendar action.

Raw Medflex messages, stack traces, credentials, and patient data are never returned.

## Token and Configuration

- The token shared in chat is treated as exposed and must not be copied into source, tests, tool output, Docker build arguments, or committed environment files.
- Production requires a newly issued token placed directly into the server's untracked `.env` as `MEDFLEX_CLINIC_TOKEN`.
- `.env.example` documents only empty variable names and formats.
- README documents setup, discovery/mapping, deployment, and rotation.
- The implementation verifies that no `PUBLIC_*` value or browser bundle contains the token.

## Verification

### Unit tests

- Medflex client: missing token, fixed origin, authentication isolation, redirect rejection, timeout, malformed response, and safe error mapping.
- Doctor mapping: all nine slugs, duplicate/ambiguous mapping, LPU allowlist, unsupported direct booking, and fail-closed behavior.
- Appointment domain: patient normalization, phone/date/name/comment bounds, exact slot verification, trusted price, and intent state transitions.

### API tests

- Slots: unknown doctor, invalid date window, normalization, empty schedule, rate limit, and upstream failure.
- Booking: content type, request size, origin, consent, rate limit, forged/stale slot, conflict, duplicate and concurrent submit, timeout uncertainty, history reconciliation, and sanitized errors.

### Component tests

- General CTA starts at doctor selection.
- Doctor-profile CTA opens with the correct preselected slug.
- Date/time selection, grouped slots, later dates, loading, empty, conflict, and retry states.
- Patient validation, review, double-submit protection, success, uncertain result, focus trap, Escape, focus restoration, and live announcements.
- Doctor cards and mobile carousel keep profile navigation and add the correct booking context.

### End-to-end and delivery checks

- Mocked complete booking from a general CTA.
- Mocked complete booking from an individual doctor page, beginning at that doctor's schedule.
- Mobile dialog layout, sticky controls, keyboard interaction, and phone fallback.
- Full unit suite, lint, production build, and focused Playwright checks.
- Browser bundle and Git diff review for credentials and unintended unrelated changes.

## Rollout

1. Implement and test the server boundary and mapping in isolation.
2. Verify all nine doctors against a safely configured development token.
3. Add the global dialog and doctor-specific context behind the new first-party path.
4. Replace the simulated home form and external widget only after the full mocked flow is green.
5. Run production verification with a newly rotated token and a controlled test appointment.
6. Keep the phone fallback visible during initial monitoring.
