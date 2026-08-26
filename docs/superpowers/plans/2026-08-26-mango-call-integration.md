# MANGO Call Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Receive authenticated inbound MANGO OFFICE live and summary events, persist a privacy-safe real-time call journal, link callers to existing patients, and expose operational call analytics in the admin panel.

**Architecture:** Treat `entry_id` as the call aggregate and `call_id` as an independently sequenced leg. A signature boundary validates raw form fields before JSON parsing, a domain reducer applies monotonic events, and a transactional repository persists calls/legs while using the shared phone fingerprint from the patient plan. HTTP routes acknowledge duplicate, stale, and irrelevant events with `200`, but reject malformed or unauthenticated requests before storage.

**Tech Stack:** Astro 4 SSR, React 18 islands, JavaScript, Astro DB/@libsql SQLite, Node.js `crypto`, Vitest, Testing Library, Playwright, Bun, Nginx

**Prerequisite:** Complete `2026-08-26-clinic-patients-appointments.md` through Task 5 so `contact-identity.js`, `Patient`, and shared fingerprint semantics exist.

---

## Locked File Map

- Create `src/lib/mango-signature.js`: form/body size boundary, exact credential match, SHA-256 signature verification over raw JSON, and strict event envelope parsing.
- Create `src/lib/mango-call-event.js`: normalize live/summary payloads and reduce only supported inbound state transitions.
- Create `src/lib/mango-call-records.js`: transactional aggregate/leg persistence, `seq` fencing, patient linkage, repeat-caller computation, reveal/destruction audit, filters, and aggregates.
- Create `src/pages/api/integrations/mango/index.js`, `events/call.js`, and `events/summary.js`: health and webhook adapters.
- Create `src/pages/api/admin/calls/**`, `src/components/admin/Calls.jsx`, and `src/pages/admin/calls.astro`: protected call journal and PII actions.
- Modify `db/config.ts`, `scripts/init-db.mjs`, dashboard files, `AdminLayout.astro`, Nginx configuration, privacy-policy content, deployment docs, `.env.example`, and `README.md`.

## Domain Contracts

- `MANGO_VPBX_API_KEY` identifies the Virtual PBX; `MANGO_VPBX_API_SALT` signs requests; `MANGO_CALL_ENCRYPTION_KEY` is a separate base64 32-byte AES key.
- `MANGO_INBOUND_LINES` is a mandatory normalized-phone allowlist. The initial confirmed line is `+78127482210`; a signed event for any unlisted line is acknowledged but ignored.
- Webhook input is `application/x-www-form-urlencoded` with exactly `vpbx_api_key`, `sign`, and `json`; the total body limit is 64 KiB.
- The expected signature is lowercase hexadecimal SHA-256 of `vpbx_api_key + raw_json + MANGO_VPBX_API_SALT`, compared in constant time only after exact length/encoding checks.
- Invalid credentials/signatures return `401`; invalid media type/body/form/JSON/event return `400` or `415`; oversized input returns `413`; safe internal failures return retryable `5xx`.
- Duplicate/stale legs and valid non-inbound events return `200` so MANGO does not retry them forever.
- Only inbound calls are retained. A provisional aggregate created by a live event is removed when a trustworthy summary proves the call was not inbound.
- `seq` is monotonic per `call_id`; a lower/equal `seq` cannot overwrite newer state. Summary finalization is idempotent per `entry_id`.
- Summary `talk_time > 0` is the source of truth for answered status; otherwise the final status is missed.
- A call links to an existing patient only by `phoneFingerprint`; a call never creates a patient. Patient creation backfills older matching calls transactionally.
- Exact phone reveal is audited and automatically re-hidden after 30 seconds in UI. Destruction clears caller envelope, mask, fingerprint, repeat-caller indicator, and `patientId` but retains anonymized call metrics.
- Raw webhook JSON, signature, API key, salt, ciphertext, and plaintext phone are never logged or stored.

### Task 1: Add MANGO call schema

**Files:**
- Modify: `db/config.ts`
- Modify: `scripts/init-db.mjs`
- Modify: `src/test/appointment-database-migration.test.js`

- [x] **Step 1: Write failing schema-contract tests**

Add strict expectations for `MangoCall`, `MangoCallLeg`, and `MangoCallAccess`, including nullable caller PII after destruction, primary/unique identifiers, optional patient links, sequence/finalization fields, integer durations, and indexes for time/status/patient/fingerprint/line/operator.

- [x] **Step 2: Run the migration test and verify RED**

Run: `bun run test:run -- src/test/appointment-database-migration.test.js`

Expected: FAIL because MANGO tables are absent.

- [x] **Step 3: Implement additive tables and verification**

Add the three Astro DB tables and repeatable libSQL migration statements without modifying existing patient, appointment, booking, or analytics rows. Extend strict schema verification to reject partially compatible MANGO tables.

- [x] **Step 4: Run the migration test and verify GREEN**

Run: `bun run test:run -- src/test/appointment-database-migration.test.js`

Expected: PASS.

- [x] **Step 5: Commit MANGO schema**

Run: `git add db/config.ts scripts/init-db.mjs src/test/appointment-database-migration.test.js && git commit -m "feat: add MANGO call schema"`

### Task 2: Verify raw MANGO webhook signatures

**Files:**
- Create: `src/lib/mango-signature.js`
- Create: `src/lib/mango-signature.test.js`

- [x] **Step 1: Write failing signature-boundary tests**

Cover exact form keys, duplicate keys, 64 KiB declared and streamed limits, media type with charset, missing environment configuration, wrong PBX key, malformed/uppercase/wrong-length hex signatures, signature over the byte-preserved raw JSON string, constant-time comparison path, invalid UTF-8/form escapes, invalid JSON, arrays/non-objects, reserved object keys, bounded nesting/text, mandatory normalized `MANGO_INBOUND_LINES`, and safe error codes with no reflected secrets.

- [x] **Step 2: Run the focused test and verify RED**

Run: `bun run test:run -- src/lib/mango-signature.test.js`

Expected: FAIL because the signature boundary does not exist.

- [x] **Step 3: Implement strict parsing and verification**

Read a bounded request body once, parse form data without normalizing the `json` value before hashing, validate configuration and identifiers, compute SHA-256 using Node crypto, compare equal-length buffers with `timingSafeEqual`, then parse JSON into a plain-data envelope. Return typed safe failures for route mapping.

- [x] **Step 4: Run the focused test and verify GREEN**

Run: `bun run test:run -- src/lib/mango-signature.test.js`

Expected: PASS.

- [x] **Step 5: Commit signature verification**

Run: `git add src/lib/mango-signature.js src/lib/mango-signature.test.js && git commit -m "feat: verify MANGO webhook signatures"`

### Task 3: Normalize and reduce call events

**Files:**
- Create: `src/lib/mango-call-event.js`
- Create: `src/lib/mango-call-event.test.js`

- [ ] **Step 1: Write failing event-domain tests**

Build fixtures from the checked official `events/call` and `events/summary` contracts. Cover `entry_id`, `call_id`, integer `seq`, inbound direction recognition, provisional live states, location/line/operator extraction, Unix timestamp normalization, impossible time ordering, missing caller number, Russian aliases and international E.164 phone normalization, ignored outgoing/internal events, ignored signed events for lines outside `MANGO_INBOUND_LINES`, summary answered/missed decision from `talk_time`, bounded wait/talk durations, finalization, and non-inbound summary cleanup instruction.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `bun run test:run -- src/lib/mango-call-event.test.js`

Expected: FAIL because the event domain does not exist.

- [ ] **Step 3: Implement strict live and summary normalization**

Expose separate live and summary parsers that return immutable accepted/ignored commands. Reject ambiguous identifiers, negative or overflowing durations, unknown mandatory state, invalid timestamps, and unbounded technical strings. Do not preserve unused provider fields.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `bun run test:run -- src/lib/mango-call-event.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the MANGO event domain**

Run: `git add src/lib/mango-call-event.js src/lib/mango-call-event.test.js && git commit -m "feat: normalize inbound MANGO events"`

### Task 4: Persist sequenced call aggregates

**Files:**
- Create: `src/lib/mango-call-records.js`
- Create: `src/lib/mango-call-records.test.js`
- Modify: `src/lib/patient-records.js`
- Modify: `src/lib/patient-records.test.js`

- [ ] **Step 1: Write failing repository and patient-backfill tests**

Cover first live aggregate/leg insert, same-event duplicate, stale lower `seq`, accepted higher `seq`, independent legs under one entry, atomic aggregate updates, existing-patient linkage, unknown caller remaining patientless, repeat-caller flag from prior finalized calls, idempotent summary, summary overriding provisional status, late live events unable to overwrite a final summary, contradictory `entry_result` unable to override the `talk_time` answer rule, non-inbound cleanup, concurrent delivery races, masked list/detail, filters and 50-row pages, aggregate metrics, audited reveal, destruction, and patient upsert backfilling all non-destroyed matching calls.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `bun run test:run -- src/lib/mango-call-records.test.js src/lib/patient-records.test.js`

Expected: FAIL because call storage/backfill are absent.

- [ ] **Step 3: Implement transactional persistence**

Use conditional SQL on `maxSeq`, unique primary keys, and write transactions so stale events cannot win races. Reuse `contact-identity.js` for caller encryption/fingerprint/mask. Add a narrowly scoped patient-upsert backfill statement instead of importing the MANGO repository into patient domain code.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `bun run test:run -- src/lib/mango-call-records.test.js src/lib/patient-records.test.js`

Expected: PASS including the concurrent race fixture.

- [ ] **Step 5: Commit call persistence**

Run: `git add src/lib/mango-call-records.js src/lib/mango-call-records.test.js src/lib/patient-records.js src/lib/patient-records.test.js && git commit -m "feat: persist sequenced MANGO calls"`

### Task 5: Expose health and webhook routes

**Files:**
- Create: `src/pages/api/integrations/mango/index.js`
- Create: `src/pages/api/integrations/mango/events/call.js`
- Create: `src/pages/api/integrations/mango/events/summary.js`
- Create: `src/test/mango-api.test.js`

- [ ] **Step 1: Write failing route-boundary tests**

Cover `prerender = false`, method rejection, health returning a minimal availability result without inspecting or exposing configuration, content type, size limits, 300 requests per minute per proxy-controlled source IP, invalid signature before JSON/domain/storage access, status mapping for malformed events, `200` for applied/duplicate/stale/ignored outcomes, `5xx` for transaction failure, no-cache headers, no reflected raw payload, and stage-only production logging.

- [ ] **Step 2: Run the route test and verify RED**

Run: `bun run test:run -- src/test/mango-api.test.js`

Expected: FAIL because the integration routes do not exist.

- [ ] **Step 3: Implement thin route factories**

Compose signature, event, repository, and rate-limit adapters through injectable endpoint factories for offline tests. Load real server secrets only in exported production handlers, apply the 300-per-minute limit using the trusted proxy IP helper, return compact stable JSON acknowledgements, and avoid admin auth/origin checks because authenticity is exclusively the verified MANGO signature plus Nginx allowlist.

- [ ] **Step 4: Run the route test and verify GREEN**

Run: `bun run test:run -- src/test/mango-api.test.js`

Expected: PASS.

- [ ] **Step 5: Commit webhook endpoints**

Run: `git add src/pages/api/integrations/mango src/test/mango-api.test.js && git commit -m "feat: receive authenticated MANGO events"`

### Task 6: Expose protected call admin APIs

**Files:**
- Create: `src/pages/api/admin/calls/index.js`
- Create: `src/pages/api/admin/calls/[entryId].js`
- Create: `src/pages/api/admin/calls/[entryId]/reveal.js`
- Create: `src/pages/api/admin/calls/[entryId]/caller.js`
- Create: `src/test/admin-calls-api.test.js`
- Modify: `src/pages/api/admin/patients/[id].js`
- Modify: `src/test/admin-patients-api.test.js`

- [ ] **Step 1: Write failing admin call API tests**

Cover auth and admin limits, strict time/status/line/operator/page filters, SQL wildcard safety, masked list/detail data, live summary metrics, exact audited reveal through the stricter PII guard, irreversible destruction, destroyed-call behavior, unknown call behavior, patient detail returning its paginated masked calls, not-found responses, body bounds, origin checks, and sanitized configuration/database failures.

- [ ] **Step 2: Run the route test and verify RED**

Run: `bun run test:run -- src/test/admin-calls-api.test.js`

Expected: FAIL because the routes do not exist.

- [ ] **Step 3: Implement thin call admin routes**

Reuse admin query and PII guards from the patient plan. Validate `entryId` and all query/body values before repository access, expose no leg internals beyond safe status/timing/operator fields, keep plaintext phone restricted to the audited reveal response, and compose masked call history into patient detail without introducing a repository cycle.

- [ ] **Step 4: Run the route test and verify GREEN**

Run: `bun run test:run -- src/test/admin-calls-api.test.js`

Expected: PASS.

- [ ] **Step 5: Commit call admin APIs**

Run: `git add src/pages/api/admin/calls src/pages/api/admin/patients/[id].js src/test/admin-calls-api.test.js src/test/admin-patients-api.test.js && git commit -m "feat: expose protected call admin APIs"`

### Task 7: Build the live call journal UI

**Files:**
- Create: `src/components/admin/Calls.jsx`
- Create: `src/components/admin/Calls.test.jsx`
- Create: `src/pages/admin/calls.astro`
- Modify: `src/layouts/AdminLayout.astro`
- Modify: `src/components/admin/Patients.jsx`
- Modify: `src/components/admin/Patients.test.jsx`
- Create: `e2e/admin-calls.spec.js`

- [ ] **Step 1: Write failing component and browser tests**

Cover active/today/answered/missed/answer-rate/average-wait/average-talk cards, filters and 50-row pagination, Russian state labels, patient link or unknown caller label, masked phone, explicit reveal with 30-second auto-hide, destruction confirmation, Moscow time rendering, polling every five seconds only while `document.visibilityState` is visible, cleanup on unmount, retained state during refresh, errors, keyboard/focus accessibility, admin navigation, and a patient's masked linked-call section.

- [ ] **Step 2: Run focused UI tests and verify RED**

Run: `bun run test:run -- src/components/admin/Calls.test.jsx`

Expected: FAIL because the Calls component does not exist.

- [ ] **Step 3: Implement the call journal island and page**

Use `useAdminFetch` and accessible native controls, isolate polling in a small effect with visibility listeners, re-hide and discard plaintext on timeout/navigation/unmount, and keep current results visible while a background refresh runs. Add `/admin/calls` to the sidebar and extend the existing patient detail without duplicating call rendering rules.

- [ ] **Step 4: Run component and browser tests**

Run: `bun run test:run -- src/components/admin/Calls.test.jsx`

Expected: PASS.

Run: `bun run test:e2e -- e2e/admin-calls.spec.js`

Expected: PASS with local mocked webhook/admin traffic.

- [ ] **Step 5: Commit the call UI**

Run: `git add src/components/admin/Calls.jsx src/components/admin/Calls.test.jsx src/components/admin/Patients.jsx src/components/admin/Patients.test.jsx src/pages/admin/calls.astro src/layouts/AdminLayout.astro e2e/admin-calls.spec.js && git commit -m "feat: add live MANGO call journal"`

### Task 8: Add call counters to the main dashboard

**Files:**
- Modify: `src/pages/api/admin/stats.js`
- Modify: `src/test/analytics-api.test.js`
- Modify: `src/components/admin/Dashboard.jsx`
- Modify: `src/components/admin/Dashboard.test.jsx`

- [ ] **Step 1: Write failing dashboard call tests**

Cover active inbound calls, incoming today, answered, missed, answer rate, average wait, average talk, Moscow-day boundaries, zero/empty results, and links to corresponding call filters while preserving website and appointment statistics.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `bun run test:run -- src/test/analytics-api.test.js src/components/admin/Dashboard.test.jsx`

Expected: FAIL because call counters are absent.

- [ ] **Step 3: Extend stats and dashboard presentation**

Add aggregate-only queries under a `calls` response key and render compact linked cards. Avoid decrypting any caller data for statistics.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `bun run test:run -- src/test/analytics-api.test.js src/components/admin/Dashboard.test.jsx`

Expected: PASS.

- [ ] **Step 5: Commit dashboard call statistics**

Run: `git add src/pages/api/admin/stats.js src/test/analytics-api.test.js src/components/admin/Dashboard.jsx src/components/admin/Dashboard.test.jsx && git commit -m "feat: show MANGO activity on admin dashboard"`

### Task 9: Configure Nginx delivery and document production setup

**Files:**
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `nginx.conf`
- Modify: `nginx.https.conf`
- Modify: `src/components/pages/PrivacyPolicy.jsx`
- Create: `src/components/pages/PrivacyPolicy.test.jsx`
- Create: `docs/mango-office-integration.md`
- Modify: `docs/superpowers/plans/2026-08-26-mango-call-integration.md`

- [ ] **Step 1: Verify actual deployment entry points**

Confirm that `docker-compose.yml` mounts `nginx.conf`, that production deployment copies `nginx.https.conf` into that path, and that the cleartext default must not proxy webhook traffic. Re-check the current Realtime API source addresses against official MANGO documentation before editing the HTTPS template. Keep application signature verification mandatory even behind the network allowlist.

- [ ] **Step 2: Add least-privilege proxy rules**

In `nginx.https.conf`, allow MANGO webhook paths only from the currently verified API Realtime addresses (expected baseline: `81.88.80.132`, `81.88.80.133`, `81.88.82.36`, `81.88.82.44`, and `81.88.82.45`), deny other source IPs, preserve original body and form content type, set a 64 KiB client-body limit, and use bounded proxy timeouts. In the cleartext `nginx.conf`, reject webhook POST paths instead of proxying them. Keep the health route data-free and do not expose configuration state.

- [ ] **Step 3: Document configuration and MANGO dashboard steps**

Document generation/storage of `MANGO_VPBX_API_KEY`, `MANGO_VPBX_API_SALT`, `MANGO_CALL_ENCRYPTION_KEY`, and `MANGO_INBOUND_LINES`, exact callback URLs, live/summary subscription configuration, 300-per-minute delivery limit, IP allowlist maintenance, a signed synthetic smoke-test procedure using non-real phone data, alert symptoms, backup/restore implications, secret rotation order, rollback, and explicit absence of recordings/history import. Add a factual privacy-policy section for appointment identity data and call-number metadata, with no unsupported compliance claim; require clinic-owner review before production activation. Add a manual activation checklist for one explicitly authorized paid Medflex booking/cancellation and controlled answered, missed, and repeat calls; do not perform those external mutations as part of automated execution.

- [ ] **Step 4: Validate Nginx and application quality gates**

Run: `docker compose config --quiet`

Expected: exit code 0.

Run the repository's available Nginx syntax check documented in `README.md`; if no local Nginx binary/image is available, validate through the production-equivalent Docker service and record the exact command in the README.

Run: `bun run lint`

Expected: PASS with no new warnings.

Run: `bun run build`

Expected: PASS.

Run: `bun run test:run`

Expected: PASS. Treat only the already-observed load-dependent migration-test timeout as a baseline harness issue if its focused run passes; do not increase timeouts to hide a deterministic regression.

Run: `bun run test:e2e`

Expected: PASS.

- [ ] **Step 5: Perform a final security and contract review**

Check every requirement in the approved design against a completed task; verify no raw webhook or PII logging, constant-time signatures, signature-before-parse, app verification despite Nginx allowlist, sequence race safety, summary truth rules, auth/origin/PII rate limiting, server-only secrets, anonymization behavior, and no real MANGO or paid Medflex mutation in automated tests.

- [ ] **Step 6: Mark completed checkboxes and commit operations docs**

Run: `git add .env.example README.md nginx.conf nginx.https.conf src/components/pages/PrivacyPolicy.jsx src/components/pages/PrivacyPolicy.test.jsx docs/mango-office-integration.md docs/superpowers/plans/2026-08-26-mango-call-integration.md && git commit -m "docs: describe MANGO production operations"`
