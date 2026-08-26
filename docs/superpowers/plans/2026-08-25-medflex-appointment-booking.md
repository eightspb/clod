# Medflex Appointment Booking Implementation Plan

> **Execution rule:** This plan intentionally contains no implementation code. Each task defines behavior, files, tests, and acceptance criteria; the implementing agent writes the code while executing the task with Red-Green-Refactor.

**Goal:** Replace the external Medflex widget and simulated appointment form with a secure, accessible first-party booking flow for all nine doctors published on the clinic website.

**Architecture:** A global React booking island reuses the website's existing booking triggers and calls same-origin Astro API handlers. Focused domain modules validate patient data, map public doctor slugs to an explicit Medflex allowlist, normalize schedules, protect paid booking attempts from duplicates, and isolate the clinic token in a fixed-origin server client.

**Stack:** Astro 4, React 18, JavaScript, Astro DB, Vitest, Testing Library, Playwright, official Medflex clinic-token API.

---

## Task 1: Establish safe booking request primitives

**Files:**

- Create `src/lib/client-ip.js`
- Create `src/lib/client-ip.test.js`
- Create `src/lib/appointment-validation.js`
- Create `src/lib/appointment-validation.test.js`

**Red:**

- Add failing tests for trusted client-IP extraction that prefers the proxy-overwritten real-IP header and refuses a spoofed first forwarded address.
- Add failing tests for normalization and bounds of Russian names, phone, birthday, optional comment, doctor slug, timestamps, consent, and unknown fields.
- Include irregular Unicode names, invalid calendar dates, future birthdays, malformed Russian phones, oversized values, and hostile object shapes.

**Green:**

- Implement focused immutable modules with explicit validation results suitable for safe API field errors.
- Keep request parsing, HTTP responses, and Medflex calls outside these modules.

**Acceptance:**

- Targeted tests pass without Internet access.
- No patient values or secrets are logged by validation failures.
- The module exposes no generic utility collection.

**Verification:** `bun run test:run -- src/lib/client-ip.test.js src/lib/appointment-validation.test.js`

## Task 2: Build and constrain the Medflex server client

**Files:**

- Create `src/lib/medflex-client.js`
- Create `src/lib/medflex-client.test.js`

**Red:**

- Add failing tests for a missing runtime token, fixed upstream origin, token isolation, redirect rejection, bounded timeouts, malformed JSON, unexpected response shapes, and safe normalization of upstream errors.
- Cover schedule, LPU catalog, doctor catalog, direct appointment creation, and appointment-history operations with injected fake fetch behavior.

**Green:**

- Implement the narrow client surface required by the design.
- Read `MEDFLEX_CLINIC_TOKEN` only at server runtime.
- Ensure authorization cannot be forwarded to an arbitrary host and raw upstream bodies never escape the client boundary.

**Acceptance:**

- Tests assert behavior rather than exact private error strings.
- No test calls the real Medflex API.
- No token value is committed, printed, or exposed through a public environment variable.

**Verification:** `bun run test:run -- src/lib/medflex-client.test.js`

## Task 3: Verify and encode the nine-doctor Medflex allowlist

**Files:**

- Create `src/lib/medflex-doctors.js`
- Create `src/lib/medflex-doctors.test.js`
- Create `scripts/medflex-discover.mjs`
- Modify `package.json`

**Red:**

- Add failing tests that require every current website doctor slug to resolve to one explicit doctor/LPU/town identity plus one or more local appointment-type keys mapped to allowed specialties.
- Add failing cases for unknown slugs, unknown appointment types, duplicate doctor or type identifiers, unapproved LPUs/specialties, ambiguous matches, unsupported direct appointment, and missing configuration.

**Green:**

- Implement a fail-closed mapping surface that resolves trusted identifiers only from a website slug and local appointment-type key.
- Add a read-only discovery command that loads a locally configured token, requests sanitized LPU and doctor metadata, and never prints authorization data.
- Keep ProDoctorov identifiers completely separate from Medflex identifiers.

**Operator checkpoint:**

- Before production, the operator places a rotated token directly in untracked `.env`.
- Preserve the verified 2026-08-25 result: one allowed branch, all nine full names, current specialties/prices, adult age ranges, and direct-booking support.
- Record only verified non-secret identifiers and local type labels in the mapping; unresolved doctors or types retain phone fallback.

**Acceptance:**

- Runtime booking cannot access unpublished doctors or unapproved branches.
- All nine website slugs and every published local appointment type have deterministic tested outcomes.
- Discovery output contains no credential or patient data.

**Verification:** `bun run test:run -- src/lib/medflex-doctors.test.js`

## Task 4: Normalize schedules and verify selected slots

**Files:**

- Create `src/lib/appointment-schedule.js`
- Create `src/lib/appointment-schedule.test.js`
- Modify `src/lib/appointment-validation.js`
- Modify `src/lib/appointment-validation.test.js`

**Red:**

- Add failing tests for bounded date windows, timezone-safe grouping, removal of past slots, duplicate slots, morning/day/evening groups, live appointment types, current price/age/duration, and filtering by the resolved doctor/LPU/specialty mapping.
- Add failing tests that reject a forged, stale, differently priced, or differently scoped selected slot.
- Extend booking payload validation with a required safe local appointment-type key and unknown-key protection.

**Green:**

- Implement a minimal browser-safe schedule model that exposes local type keys/labels and exact server-side slot/type verification.
- Ensure trusted duration, price, clinic, and specialty values come only from the current schedule response.

**Acceptance:**

- The browser-safe model contains no Medflex authentication or trusted IDs required to create a booking.
- Slot equality is explicit and timezone-stable.

**Verification:** `bun run test:run -- src/lib/appointment-schedule.test.js`

## Task 5: Add durable booking-intent protection

**Files:**

- Modify `db/config.ts`
- Modify `scripts/init-db.mjs`
- Modify `docker-entrypoint.sh`
- Modify `.env.example`
- Modify `README.md`
- Create `src/lib/appointment-intents.js`
- Create `src/lib/appointment-intents.test.js`
- Create `src/test/appointment-database-migration.test.js`
- Create `src/test/fixtures/appointment-intent-race-worker.mjs`

**Red:**

- Add failing tests for atomic intent claiming, concurrent duplicate attempts, confirmed-result replay, failed-slot retry, uncertain timeout state, pending-lease expiration to uncertain without reclaim or record retirement, and history reconciliation.
- Verify that stored intent data excludes names, phone numbers, birthdays, comments, and raw Medflex responses.
- Verify that full replay and reconciliation require the exact stored intent identifier, fingerprint, and trusted scope, while a fingerprint match under another identifier returns the same generic detail-free duplicate state for every stored status.
- Verify that an exact identifier is resolved before bounded fingerprint recovery so crowding one slot cannot block its confirmed replay or uncertain reconciliation.
- Add a real temporary-SQLite migration test proving that an existing database keeps its data, receives the new table and indexes, and tolerates repeated startup migration.
- Exercise acquire and reconciliation races from independent worker threads released through a shared start barrier.

**Green:**

- Add the minimum Astro DB table and focused repository needed for pending, confirmed, uncertain, and failed intent states.
- Use an irreversible request fingerprint for duplicate detection without retaining the patient form.
- Protect paid-attempt ownership with a fencing token and make every state transition an atomic compare-and-swap that rejects stale or invalid transitions.
- Use a dedicated runtime HMAC secret for versioned request fingerprints and document it without adding a real credential.
- Run the additive idempotent database migration at every container startup so existing production volumes receive the booking-intent schema.

**Acceptance:**

- Parallel requests for one intent can start at most one paid Medflex call.
- A confirmed repeat returns the original safe confirmation.
- A different intent identifier can suppress a duplicate paid call but cannot read the stored claim, booking details, status-specific state, or reconciliation capability.
- A timed-out request cannot be blindly submitted again.
- A stale worker cannot finalize an intent owned by another attempt.
- Production startup migration is safe on both fresh and populated SQLite volumes.

**Verification:** `bun run test:run -- src/lib/appointment-intents.test.js src/test/appointment-database-migration.test.js`

## Task 6: Implement the same-origin appointment API

**Files:**

- Create `src/pages/api/appointments/slots.js`
- Create `src/pages/api/appointments/book.js`
- Create `src/test/appointments-api.test.js`

**Red:**

- Add failing API tests for an unknown doctor, invalid date window, empty schedule, upstream schedule failure, and normalized success.
- Add failing booking tests for content type, body size, origin, patient validation, consent, rate limit, stale or forged slot, upstream conflict, concurrent duplicate, confirmed replay after the slot disappears, uncertain reconciliation after the slot disappears, pre-submit failure, post-submit timeout, and sanitized errors.
- Assert that invalid requests never call Medflex and duplicate requests call the paid operation at most once.

**Green:**

- Implement non-prerendered handlers that compose the existing origin/rate-limit patterns with the new trusted-IP, validation, mapping, schedule, client, and intent modules.
- Return the project's stable JSON success/error shape and no-store responses.
- Reconcile uncertain outcomes through Medflex history before permitting another booking attempt.
- Resume a matching durable intent before checking current slot availability; require a fresh live slot check only for a genuinely new or safely retryable attempt.

**Acceptance:**

- Browser-supplied doctor IDs, LPU IDs, specialty IDs, prices, or status fields are ignored or rejected.
- Token, patient data, stack traces, and raw upstream errors never appear in responses or logs.
- API tests remain fully offline.

**Verification:** `bun run test:run -- src/test/appointments-api.test.js`

## Task 7: Build the global booking flow from mocked contracts

**Files:**

- Create `src/components/booking/BookingFlow.jsx`
- Create `src/components/booking/DoctorPicker.jsx`
- Create `src/components/booking/AppointmentTypePicker.jsx`
- Create `src/components/booking/DoctorSummary.jsx`
- Create `src/components/booking/SchedulePicker.jsx`
- Create `src/components/booking/PatientDetailsForm.jsx`
- Create `src/components/booking/BookingReview.jsx`
- Create `src/components/booking/BookingResult.jsx`
- Create `src/components/booking/BookingFlow.test.jsx`

**Red:**

- Add failing component tests for general and doctor-specific opening, doctor search, single/multiple appointment types, current prices, first available date, grouped slots, later dates, patient validation, review, double-submit prevention, success, slot/type conflict, empty schedule, uncertain result, and retry.
- Add accessibility tests for dialog labelling, focus trap, Escape, focus restoration, live announcements, keyboard selection, and disabled submitting controls.

**Green:**

- Implement one global state owner and focused presentational children using the approved responsive flow.
- Call only the same-origin appointment endpoints.
- Preserve patient input across schedule conflicts and uncertain-state checks, while rotating the browser intent identifier whenever the patient selects a different slot after a safe failure.

**Acceptance:**

- No new runtime dependency is added.
- The component can be fully exercised with fake endpoint responses.
- All interactive targets meet the 44 px minimum.

**Verification:** `bun run test:run -- src/components/booking/BookingFlow.test.jsx`

## Task 8: Connect every booking entry point

**Files:**

- Modify `src/layouts/Layout.astro`
- Modify `src/pages/doctors/[slug].astro`
- Modify `src/components/pages/DoctorPage.jsx`
- Modify `src/components/pages/DoctorPage.test.jsx`
- Modify `src/components/CtaSection.jsx`
- Modify `src/components/CtaSection.test.jsx`
- Modify `src/components/DoctorCard.jsx`
- Modify `src/components/DoctorCard.test.jsx`
- Modify `src/components/MobileDoctorCarousel.jsx`
- Modify `src/components/MobileDoctorCarousel.test.jsx`
- Modify `src/components/HeroDoctorCard.jsx`
- Modify `src/components/HeroDoctorCard.test.jsx`
- Modify `src/components/home/AppointmentFormSection.jsx`
- Modify the closest existing home-page test

**Red:**

- Add or update failing tests that require each doctor-specific trigger to carry the correct local slug.
- Require general triggers to open without a doctor and profile-route header/sticky triggers to inherit page doctor context.
- Require doctor cards and mobile slides to expose separate profile and booking actions.
- Require the home appointment section to open the real flow rather than simulate success.

**Green:**

- Mount the booking island once in `Layout` and replace the external widget click bridge.
- Pass static page doctor context without hydrating the entire doctor profile.
- Preserve all existing profile links, SSR content, SEO metadata, and unrelated visual redesign work.

**Acceptance:**

- Existing `[data-booking-btn]` calls continue to work site-wide.
- Every doctor-specific action opens the matching doctor's schedule.
- The old third-party widget and fake submission path are no longer reachable.

**Verification:** Run targeted tests for every modified component and the home/doctor pages.

## Task 9: Style and harden the responsive dialog

**Files:**

- Modify `src/styles/global.css`
- Modify `src/middleware.js`
- Modify the closest middleware/security tests

**Red:**

- Add test coverage for any middleware/CSP behavior changed by removing the external widget.
- Extend component assertions for accessible states that are represented through CSS classes or attributes.

**Green:**

- Add namespaced booking styles for the approved desktop dialog and mobile full-height surface.
- Add stable skeleton, selected, unavailable, invalid, submitting, conflict, and success states.
- Preserve body width during scroll lock and keep the dialog above the existing sticky CTA.
- Remove Medflex widget CSP allowances only when no remaining runtime path needs them.

**Acceptance:**

- The booking UI uses existing typography and design tokens.
- Reduced motion, high zoom, narrow mobile width, and keyboard-only use remain functional.
- Existing global styles outside the booking namespace do not regress.

**Verification:** Targeted unit tests followed by a production build.

## Task 10: Document configuration and verify delivery

**Files:**

- Modify `.env.example`
- Modify `README.md`
- Create `e2e/booking.spec.js`

**Documentation:**

- Document the empty `MEDFLEX_CLINIC_TOKEN` variable, secure token placement, rotation, doctor/LPU discovery, explicit mapping, phone fallback, API routes, and deployment checks.
- State that the token shared in chat must be revoked before production.
- Document the new booking components and durable intent table without duplicating source code.

**End-to-end checks:**

- Add a mocked general-CTA flow that selects a doctor and completes a booking.
- Add a mocked individual-doctor flow that begins on the correct schedule.
- Add mobile, keyboard, slot-conflict, and phone-fallback coverage.
- Run a controlled real-API smoke check only after a rotated token is configured and only with explicit confirmation before creating a paid appointment.

**Final verification:**

- `bun run test:run`
- `bun run lint`
- `bun run build`
- Focused Playwright booking suite
- Review browser assets and Git diff for token leakage, patient data, unrelated user changes, and generated artifacts

**Acceptance:**

- All automated gates pass or any pre-existing unrelated failure is documented with evidence.
- No secret is present in Git, a browser bundle, test fixture, screenshot, or command output.
- All nine published doctors have either verified online booking or an explicit safe phone fallback.
