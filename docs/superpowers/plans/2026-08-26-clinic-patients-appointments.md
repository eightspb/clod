# Clinic Patients and Appointments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing safe Medflex booking flow with encrypted local patient profiles, durable local appointment records, and authenticated admin workflows without weakening current idempotency or dispatch fencing.

**Architecture:** Keep `BookingIntent` as the authority for one-time Medflex dispatch and add a local projection keyed by the existing intent UUID. A focused contact-identity module owns phone normalization, HMAC fingerprints, masks, and AES-256-GCM envelopes; focused repositories own `Patient`, `Appointment`, and audit invariants. Public and admin routes remain thin adapters around the same booking service, while local-only admin entries use a separate domain operation that never calls Medflex.

**Tech Stack:** Astro 4 SSR, React 18 islands, JavaScript, Astro DB/@libsql SQLite, Node.js `crypto`, Vitest, Testing Library, Playwright, Bun

---

## Locked File Map

- Create `src/lib/contact-identity.js`: normalize Russian phone numbers, create versioned HMAC fingerprints and masks, encrypt/decrypt versioned AES-256-GCM profile envelopes.
- Create `src/lib/patient-records.js`: transactional patient upsert, exact-phone lookup, masked list/detail reads, audited reveal, and irreversible PII destruction.
- Create `src/lib/appointment-records.js`: prepare and project local appointments around `BookingIntent`, create local existing appointments, list/filter/detail, and local status transitions.
- Create `src/lib/admin-clinic-query.js`: strict pagination and filter parsing shared by patient and appointment admin routes.
- Modify `src/lib/appointment-booking.js`: invoke local persistence before Medflex dispatch and project every terminal/ambiguous intent outcome.
- Modify `src/lib/appointment-intents.js`: add only the retryable local-persistence failure needed to preserve dispatch fencing.
- Modify `src/lib/medflex-client.js`: add the contract-checked cancellation call used by authenticated admin flows.
- Modify `db/config.ts` and `scripts/init-db.mjs`: additive tables and indexes; preserve existing `BookingIntent` schema except its failure-code enum.
- Create `src/pages/api/admin/patients/**`, `src/pages/api/admin/appointments/**`: authenticated, origin-checked transport adapters.
- Create `src/components/admin/Patients.jsx`, `src/components/admin/Appointments.jsx` and matching Astro pages.
- Modify `src/layouts/AdminLayout.astro`, `src/pages/api/admin/stats.js`, and `src/components/admin/Dashboard.jsx`: navigation and clinic counters.
- Modify `nginx.https.conf`: give only the paid booking endpoint the required 75-second upstream read timeout.
- Modify `.env.example` and `README.md`: secret contracts, routes, data handling, operations, and verification.

## Domain Contracts

- `CONTACT_FINGERPRINT_KEY` is independent from encryption keys and is stable across Patient and MANGO modules.
- `PATIENT_ENCRYPTION_KEY` is a base64-encoded 32-byte key used only for patient profile envelopes.
- A profile envelope stores only normalized first, last, and optional second name, normalized phone, and optional birthday.
- A patient is deduplicated by the versioned phone fingerprint until PII is destroyed. A destroyed patient is never silently rehydrated; a future booking creates a new patient.
- An appointment UUID equals the existing booking intent UUID for website and `admin_medflex` sources. `bookingIntentId` is therefore unnecessary duplicate state.
- The existing `/appointment` page, booking dialog, server-trusted `/api/appointments/slots` response, and `/api/appointments/book` route remain the public contract. They already satisfy the approved first-party form requirement, so this plan does not add redundant catalog/create aliases or move trusted doctor mappings into the browser.
- A local appointment is inserted before a chargeable Medflex request. If that transaction fails, the booking intent records retryable `LOCAL_PERSISTENCE_FAILED` and no upstream request occurs.
- Local projection is idempotent and maps intent states as follows: `pending` to `pending`, `confirmed` to `confirmed`, `uncertain` to `needs_review`, and `failed` to `failed`.
- Replaying a confirmed or uncertain public request repairs its local projection without issuing another Medflex create call.
- Patient list/detail responses may contain the decrypted name for the authenticated admin view, but never the full phone or birthday. The full phone appears only in the separate audited reveal response.
- Unknown MANGO calls do not create Patient rows. Patient upsert backfills matching calls in the second implementation plan.
- Admin list endpoints return at most 50 rows and opaque cursor-free page metadata for v1: `page`, `pageSize`, `total`, `pages`.
- Every PII reveal and destruction writes `PatientAccess`; secrets, plaintext phone numbers, ciphertexts, and raw upstream payloads never enter logs.

### Task 1: Add the additive clinic schema

**Files:**
- Modify: `db/config.ts`
- Modify: `scripts/init-db.mjs`
- Modify: `src/test/appointment-database-migration.test.js`

- [x] **Step 1: Write failing schema-contract tests**

Add assertions for `Patient`, `PatientAccess`, `Appointment`, and `MedflexDoctorLink`, including nullable post-destruction PII columns, enum values, foreign-key identifier columns, unique phone fingerprint, unique Medflex claim ID, unique booking fingerprint, and indexes for every documented filter. Extend the generated-schema equivalence test so `db/config.ts` and `scripts/init-db.mjs` describe equivalent tables and indexes.

- [x] **Step 2: Run the migration test and verify RED**

Run: `bun run test:run -- src/test/appointment-database-migration.test.js`

Expected: FAIL because the four new tables and `LOCAL_PERSISTENCE_FAILED` are absent.

- [x] **Step 3: Implement the additive schema**

Define all four tables in `db/config.ts`. Extend `BookingIntent.failureCode` with `LOCAL_PERSISTENCE_FAILED`. Add idempotent create-table/create-index statements and strict schema verification in `scripts/init-db.mjs`; do not alter or delete analytics data and do not make an existing column less strict.

- [x] **Step 4: Run the migration test and verify GREEN**

Run: `bun run test:run -- src/test/appointment-database-migration.test.js`

Expected: PASS with both empty-database initialization and generated Astro schema equivalence.

- [x] **Step 5: Commit the schema boundary**

Run: `git add db/config.ts scripts/init-db.mjs src/test/appointment-database-migration.test.js && git commit -m "feat: add clinic patient and appointment schema"`

### Task 2: Build the contact identity boundary

**Files:**
- Create: `src/lib/contact-identity.js`
- Create: `src/lib/contact-identity.test.js`

- [x] **Step 1: Write failing normalization and cryptography tests**

Cover `+7`, `8`, spaces, parentheses, hyphens, Unicode rejection, invalid lengths, HMAC domain separation, deterministic fingerprints, stable safe masks, random 96-bit IVs, AES-GCM authentication failure, strict base64 key length, envelope version rejection, oversized profile rejection, and absence of plaintext PII from fingerprint/envelope metadata.

- [x] **Step 2: Run the focused test and verify RED**

Run: `bun run test:run -- src/lib/contact-identity.test.js`

Expected: FAIL because `contact-identity.js` does not exist.

- [x] **Step 3: Implement the focused module**

Export immutable operations for phone normalization, mask creation, `v1:` HMAC-SHA256 fingerprints, AES-256-GCM profile encryption, and decryption. Accept explicit keys and random/clock adapters where determinism is required by tests; validate all inputs before cryptographic work and use authenticated additional data containing the envelope version and domain.

- [x] **Step 4: Run the focused test and verify GREEN**

Run: `bun run test:run -- src/lib/contact-identity.test.js`

Expected: PASS with no Internet access.

- [x] **Step 5: Commit the identity boundary**

Run: `git add src/lib/contact-identity.js src/lib/contact-identity.test.js && git commit -m "feat: protect clinic contact identity"`

### Task 3: Add transactional patient records

**Files:**
- Create: `src/lib/patient-records.js`
- Create: `src/lib/patient-records.test.js`

- [x] **Step 1: Write failing patient repository tests**

Use an in-memory libSQL database initialized with the real migration statements. Cover first insert, repeated-phone upsert without a duplicate, monotonic `lastSeenAt`, encrypted profile replacement, authorized list results containing the name but no full phone/birthday/ciphertext, exact-phone lookup by fingerprint, page size clamped to 50, audited reveal, wrong-key reveal failure, destruction clearing all three PII fields, destruction audit, idempotent second destruction, and creation of a new patient after a previously matching profile was destroyed.

- [x] **Step 2: Run the focused test and verify RED**

Run: `bun run test:run -- src/lib/patient-records.test.js`

Expected: FAIL because the patient repository does not exist.

- [x] **Step 3: Implement patient transactions**

Create a repository factory requiring a libSQL client, fingerprint key, patient encryption key, UUID source, and clock. Implement transaction-scoped upsert and audit writes, strict row parsing, masked list/detail shapes, exact fingerprint lookup, and destruction that retains only the patient UUID and timestamps needed by anonymized history.

- [x] **Step 4: Run the focused test and verify GREEN**

Run: `bun run test:run -- src/lib/patient-records.test.js`

Expected: PASS and leave no open database handles.

- [x] **Step 5: Commit patient records**

Run: `git add src/lib/patient-records.js src/lib/patient-records.test.js && git commit -m "feat: add encrypted patient records"`

### Task 4: Add local appointment projection

**Files:**
- Create: `src/lib/appointment-records.js`
- Create: `src/lib/appointment-records.test.js`

- [x] **Step 1: Write failing appointment repository tests**

Cover atomic patient upsert plus pending appointment insert, idempotent prepare by intent UUID, conflict on mismatched reuse, deterministic booking fingerprint duplicate prevention, projection of all BookingIntent states, confirmed claim uniqueness, recovery after a failed local final update, local `admin_existing` creation without Medflex identifiers, UTC validation, integer kopeck conversion, immutable doctor/speciality/type snapshots, safe `MedflexDoctorLink` upsert from the already verified mapping without ambiguous name matching, date/status/source/doctor filters, 50-row pagination, and allowed local/manual review transitions.

- [x] **Step 2: Run the focused test and verify RED**

Run: `bun run test:run -- src/lib/appointment-records.test.js`

Expected: FAIL because the appointment repository does not exist.

- [x] **Step 3: Implement the appointment repository**

Compose the patient repository rather than duplicating contact cryptography. Keep prepare and projection idempotent, use parameterized SQL, validate stored rows before returning them, and expose only masked patient data from list/detail operations. Store ruble prices from the current Medflex flow as checked integer kopecks.

- [x] **Step 4: Run the focused test and verify GREEN**

Run: `bun run test:run -- src/lib/appointment-records.test.js`

Expected: PASS.

- [x] **Step 5: Commit local appointment records**

Run: `git add src/lib/appointment-records.js src/lib/appointment-records.test.js && git commit -m "feat: add local appointment records"`

### Task 5: Fence Medflex dispatch behind local persistence

**Files:**
- Modify: `src/lib/appointment-intents.js`
- Modify: `src/lib/appointment-intents.test.js`
- Modify: `src/lib/appointment-booking.js`
- Modify: `src/lib/appointment-booking.test.js`
- Modify: `src/pages/api/appointments/book.js`
- Modify: `src/test/appointments-api.test.js`

- [x] **Step 1: Write failing intent and booking orchestration tests**

Add `LOCAL_PERSISTENCE_FAILED` as a retryable failure and test its fenced retry. At the booking-service level prove that prepare runs before Medflex, prepare failure produces sanitized `503` and zero upstream creates, a retry repairs local state then dispatches once, every confirmed/failed/uncertain outcome is projected, a confirmed replay repairs a missing projection without dispatch, final projection uses at most three short local-only retries, and exhaustion after upstream confirmation returns safe `202 needs_review` without a second external call. At the route level prove the existing stricter IP limit remains intact and add 3 attempts per 15 minutes by contact fingerprint without retaining the plaintext phone in limiter keys.

- [x] **Step 2: Run the focused tests and verify RED**

Run: `bun run test:run -- src/lib/appointment-intents.test.js src/lib/appointment-booking.test.js src/test/appointments-api.test.js`

Expected: FAIL on the new failure code and missing record adapter.

- [x] **Step 3: Extend booking configuration and transitions**

Require an appointment-record adapter in production route construction, prepare it immediately after a `dispatch` or `retry` acquisition, and project state after all transitions and resume outcomes. Retry only the local final projection up to three times with an injectable bounded retry adapter; never retry the Medflex create. Preserve the current 16 KiB boundary, origin check, stricter IP rate limit, 65-second Medflex timeout, intent capabilities, public response contract, and no-automatic-retry rule for uncertain upstream outcomes. Apply the contact-fingerprint rate limit only after strict structural validation and before schedule/Medflex access.

- [x] **Step 4: Run the focused tests and verify GREEN**

Run: `bun run test:run -- src/lib/appointment-intents.test.js src/lib/appointment-booking.test.js src/test/appointments-api.test.js`

Expected: PASS with existing appointment tests unchanged except explicit adapter fixtures.

- [x] **Step 5: Commit the public dual-write flow**

Run: `git add src/lib/appointment-intents.js src/lib/appointment-intents.test.js src/lib/appointment-booking.js src/lib/appointment-booking.test.js src/pages/api/appointments/book.js src/test/appointments-api.test.js && git commit -m "feat: persist website bookings locally"`

### Task 6: Add strict admin clinic queries and patient APIs

**Files:**
- Create: `src/lib/admin-clinic-query.js`
- Create: `src/lib/admin-clinic-query.test.js`
- Create: `src/lib/admin-patient-api.js`
- Create: `src/pages/api/admin/patients/index.js`
- Create: `src/pages/api/admin/patients/[id].js`
- Create: `src/pages/api/admin/patients/[id]/reveal.js`
- Create: `src/pages/api/admin/patients/[id]/personal-data.js`
- Create: `src/test/admin-patients-api.test.js`
- Modify: `src/lib/admin-api.js`
- Create: `src/lib/admin-api.test.js`

- [x] **Step 1: Write failing query, guard, and endpoint tests**

Cover page coercion, 50-row clamp, unknown filter rejection, literal treatment of SQL wildcard characters, auth-first reads, rate-limit-first public abuse, origin-before-mutation, JSON body limits, name-plus-mask list/detail output without full phone/birthday, exact normalized-phone search, audited reveal, a stable non-secret session actor fingerprint, reveal-specific 10-per-minute administrative-session limit, destruction confirmation, not-found behavior, and sanitized database/configuration failures.

- [x] **Step 2: Run the focused tests and verify RED**

Run: `bun run test:run -- src/lib/admin-clinic-query.test.js src/lib/admin-api.test.js src/test/admin-patients-api.test.js`

Expected: FAIL because the parser, patient endpoints, and PII-specific guard do not exist.

- [x] **Step 3: Implement the thin patient transport layer**

Add a named PII mutation guard with its own 10-per-minute session-keyed request budget and a helper that derives an audit actor fingerprint from the authenticated session token without storing or returning the token. Preserve existing admin guards. Parse and validate all route/query/body values before repository access, load encryption keys only on server request handling, return stable `{ data, page }` or `{ error, message }` JSON, and log only route stage codes.

- [x] **Step 4: Run the focused tests and verify GREEN**

Run: `bun run test:run -- src/lib/admin-clinic-query.test.js src/lib/admin-api.test.js src/test/admin-patients-api.test.js`

Expected: PASS.

- [ ] **Step 5: Commit patient admin APIs**

Run: `git add src/lib/admin-clinic-query.js src/lib/admin-clinic-query.test.js src/lib/admin-api.js src/lib/admin-api.test.js src/pages/api/admin/patients src/test/admin-patients-api.test.js && git commit -m "feat: expose protected patient admin APIs"`

### Task 7: Add appointment admin APIs and Medflex cancellation

**Files:**
- Modify: `src/lib/medflex-client.js`
- Modify: `src/lib/medflex-client.test.js`
- Create: `src/lib/admin-appointment.js`
- Create: `src/lib/admin-appointment.test.js`
- Create: `src/pages/api/admin/appointments/index.js`
- Create: `src/pages/api/admin/appointments/[id].js`
- Create: `src/pages/api/admin/appointments/[id]/cancel.js`
- Create: `src/pages/api/admin/appointments/[id]/resolve.js`
- Create: `src/test/admin-appointments-api.test.js`

- [ ] **Step 1: Write failing Medflex and admin appointment tests**

From the checked OpenAPI schema, assert the exact cancellation method/path/body and sanitized error mapping. Cover filtered list/detail, local existing creation with no Medflex call, `admin_medflex` creation through the shared booking service, external-first cancellation for Medflex appointments, local-only cancellation warning for `admin_existing`, no local cancellation after ambiguous external failure, idempotent repeated cancellation, manual confirmation of `needs_review`, invalid transitions, auth/origin/rate limits, and bounded bodies.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `bun run test:run -- src/lib/medflex-client.test.js src/lib/admin-appointment.test.js src/test/admin-appointments-api.test.js`

Expected: FAIL because cancellation and admin appointment operations do not exist.

- [ ] **Step 3: Implement domain operations and routes**

Extend only the current allowlisted Medflex client surface. Keep source-specific cancellation rules in `admin-appointment.js`, delegate local storage to `appointment-records.js`, delegate charged creates to `appointment-booking.js`, and keep route files limited to request guards, parsing, invocation, and response mapping.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run: `bun run test:run -- src/lib/medflex-client.test.js src/lib/admin-appointment.test.js src/test/admin-appointments-api.test.js`

Expected: PASS without Internet or external mutations.

- [ ] **Step 5: Commit appointment admin APIs**

Run: `git add src/lib/medflex-client.js src/lib/medflex-client.test.js src/lib/admin-appointment.js src/lib/admin-appointment.test.js src/pages/api/admin/appointments src/test/admin-appointments-api.test.js && git commit -m "feat: add appointment admin workflows"`

### Task 8: Build patients and appointments admin UI

**Files:**
- Create: `src/components/admin/Patients.jsx`
- Create: `src/components/admin/Patients.test.jsx`
- Create: `src/components/admin/Appointments.jsx`
- Create: `src/components/admin/Appointments.test.jsx`
- Create: `src/pages/admin/patients.astro`
- Create: `src/pages/admin/appointments.astro`
- Modify: `src/layouts/AdminLayout.astro`
- Create: `e2e/admin-clinic.spec.js`

- [ ] **Step 1: Write failing component and browser tests**

Cover loading/error/empty states, filters and pagination, masked-by-default phone display, explicit reveal with automatic 30-second re-hide using fake timers, destruction confirmation and post-success anonymized rendering, appointment source/status labels, local-only cancellation warning, manual review action, accessible labels/focus behavior, and authenticated route navigation. Keep network fixtures local and deterministic.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `bun run test:run -- src/components/admin/Patients.test.jsx src/components/admin/Appointments.test.jsx`

Expected: FAIL because the components do not exist.

- [ ] **Step 3: Implement the React islands and Astro pages**

Follow the current `useAdminFetch` pattern, retain Astro route protection, render all statuses in Russian and dates in `Europe/Moscow`, clear revealed PII on timer expiry/unmount/navigation, and add semantic buttons, tables, dialogs, labels, and visible errors. Add the two navigation entries without changing existing admin routes.

- [ ] **Step 4: Run component and route tests**

Run: `bun run test:run -- src/components/admin/Patients.test.jsx src/components/admin/Appointments.test.jsx`

Expected: PASS.

Run: `bun run test:e2e -- e2e/admin-clinic.spec.js`

Expected: PASS for the mocked authenticated admin flow.

- [ ] **Step 5: Commit the admin UI**

Run: `git add src/components/admin/Patients.jsx src/components/admin/Patients.test.jsx src/components/admin/Appointments.jsx src/components/admin/Appointments.test.jsx src/pages/admin/patients.astro src/pages/admin/appointments.astro src/layouts/AdminLayout.astro e2e/admin-clinic.spec.js && git commit -m "feat: add patient and appointment admin views"`

### Task 9: Add clinic counters to the dashboard

**Files:**
- Modify: `src/pages/api/admin/stats.js`
- Modify: `src/test/analytics-api.test.js`
- Modify: `src/components/admin/Dashboard.jsx`
- Create: `src/components/admin/Dashboard.test.jsx`

- [ ] **Step 1: Write failing statistics and presentation tests**

Cover today/upcoming/needs-review appointment counts, total active patients, UTC database boundaries converted from the clinic day in `Europe/Moscow`, zero defaults, authenticated failure behavior, and dashboard cards/links without regressing existing analytics cards.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `bun run test:run -- src/test/analytics-api.test.js src/components/admin/Dashboard.test.jsx`

Expected: FAIL because clinic counters are missing.

- [ ] **Step 3: Extend stats response and cards**

Query only aggregate non-PII fields, retain the existing response keys, add a `clinic` object, and render the new counters as links to filtered patient/appointment views.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run: `bun run test:run -- src/test/analytics-api.test.js src/components/admin/Dashboard.test.jsx`

Expected: PASS.

- [ ] **Step 5: Commit dashboard clinic statistics**

Run: `git add src/pages/api/admin/stats.js src/test/analytics-api.test.js src/components/admin/Dashboard.jsx src/components/admin/Dashboard.test.jsx && git commit -m "feat: show clinic activity on admin dashboard"`

### Task 10: Document and verify the patient/appointment release

**Files:**
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `nginx.https.conf`
- Modify: `docs/superpowers/plans/2026-08-26-clinic-patients-appointments.md`

- [ ] **Step 1: Document configuration and operations**

Document `CONTACT_FINGERPRINT_KEY`, `PATIENT_ENCRYPTION_KEY`, generation requirements, rotation warning, new tables/routes, local-vs-Medflex cancellation semantics, `needs_review` recovery, backup requirements, and the fact that this is not a medical record system. Add a specific HTTPS location for `/api/appointments/book` with `proxy_read_timeout 75s` while keeping existing proxy headers. Do not include real secrets or example production credentials.

- [ ] **Step 2: Run targeted clinic tests**

Run: `bun run test:run -- src/lib/contact-identity.test.js src/lib/patient-records.test.js src/lib/appointment-records.test.js src/lib/appointment-intents.test.js src/lib/appointment-booking.test.js src/test/appointments-api.test.js src/test/admin-patients-api.test.js src/test/admin-appointments-api.test.js`

Expected: PASS.

- [ ] **Step 3: Run repository quality gates**

Run: `bun run lint`

Expected: PASS with no new warnings.

Run: `bun run build`

Expected: PASS and all new SSR routes compile.

Run: `bun run test:run`

Expected: PASS. If the known load-dependent five-second migration timeout recurs while the focused test remains green, record it as a baseline harness issue and rerun once without weakening the assertion.

Run: `bun run test:e2e`

Expected: PASS.

- [ ] **Step 4: Review security invariants**

Verify every admin mutation uses `guardAdminWrite` or the stricter PII guard, every SQL value is parameterized, no response/log contains plaintext phone or birthday unless it is the audited reveal response, names appear only behind admin auth, encryption keys are server-only, all public booking constraints still pass, and no test performs a real paid Medflex mutation.

- [ ] **Step 5: Mark completed checkboxes and commit documentation**

Run: `git add .env.example README.md nginx.https.conf docs/superpowers/plans/2026-08-26-clinic-patients-appointments.md && git commit -m "docs: describe patient and appointment operations"`
