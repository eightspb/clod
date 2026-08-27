# Clinic Patient History Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a protected, reproducible import of legacy clinic patients, previous surnames, contacts, private identity data, consents, visits, issues, and incomplete invoices into the existing CRM without importing medical documents or merging people by phone alone.

**Architecture:** Extend the existing `Patient` aggregate with normalized protected child tables, keep `HistoricalVisit` separate from operational `Appointment`, and run a strict local parser/resolver before a transactional apply. The command defaults to dry-run, stores every included source row or issue, and requires an explicit manifest plus backup for apply.

**Tech Stack:** Astro DB/SQLite, Bun and Node built-ins, Vitest, existing AES-256-GCM/HMAC keys, React 18 admin island.

---

## Scope and execution graph

The work is one import capability with sequential integration boundaries. The first three tasks are independent and may run in parallel. Tasks 5 and 6 may run in parallel after source normalization. Admin UI starts only after the storage and record contracts are green.

```text
Task 1 schema ───────────────────────────────┐
Task 2 protected payloads ───────┐           │
Task 3 CSV/XLSX readers ──> Task 4 sources   │
                               ├─> Task 5 identities ─┐
                               └─> Task 6 visits ─────┤
                                                      ├─> Task 7 bundle
Task 1 + Task 2 ─> Task 9 shared phones ──────────────┤
Task 1 + Task 7 ─> Task 8 persistence/CLI ────────────┤
                                                      └─> Task 10 API ─> Task 11 UI
All tasks ─> Task 12 docs, real dry-run, isolated apply, full verification
```

## File map

### New domain and infrastructure modules

- `src/lib/protected-patient-data.js`: domain-separated encrypted JSON envelopes and private-value HMAC fingerprints.
- `src/lib/tabular-csv.js`: strict quoted CSV/TSV reader.
- `src/lib/tabular-xlsx.js`: first-sheet XLSX reader through an injected safe archive adapter and existing Cheerio XML mode.
- `src/lib/clinic-import-normalization.js`: names, dates, contacts, identifiers, gender provenance, and safe source references.
- `src/lib/clinic-import-sources.js`: strict source manifest and row loaders.
- `src/lib/clinic-import-identities.js`: patient components, canonical profile, previous surnames, external IDs, and merge issues.
- `src/lib/clinic-import-visits.js`: visit candidates and deterministic link status.
- `src/lib/clinic-import-bundle.js`: full normalized bundle and control totals.
- `src/lib/clinic-import-stage.js`: encrypted out-of-repository dry-run artifact and plan-hash verification.
- `src/lib/clinic-import-store.js`: transactional persistence and idempotency.
- `src/lib/patient-history-records.js`: protected admin reads for child data, visits, and issues.
- `scripts/import-clinic-history.mjs`: dry-run/apply command.

### Existing files changed

- `db/config.ts`: child/import/history tables and nonunique patient phone index.
- `scripts/init-db.mjs`: idempotent production migration and strict schema verification.
- `src/lib/contact-identity.js`: active imported profiles may omit name components or phone.
- `src/lib/patient-records.js`: identity-aware shared-phone upsert and unambiguous MANGO linkage.
- `src/lib/admin-patient-api.js`: safe summaries and audited full reveal payload.
- `src/pages/api/admin/patients/[id].js`: imported-data record adapter.
- `src/pages/api/admin/patients/[id]/reveal.js`: expanded reveal adapter.
- `src/components/admin/Patients.jsx`: imported-data summaries and timed reveal sections.
- `README.md`, `.env.example` only if the implementation changes documented commands or key semantics.

### New and changed tests

- `src/test/clinic-history-database-migration.test.js`
- `src/lib/protected-patient-data.test.js`
- `src/lib/tabular-csv.test.js`
- `src/lib/tabular-xlsx.test.js`
- `src/lib/clinic-import-normalization.test.js`
- `src/lib/clinic-import-sources.test.js`
- `src/lib/clinic-import-identities.test.js`
- `src/lib/clinic-import-visits.test.js`
- `src/lib/clinic-import-bundle.test.js`
- `src/lib/clinic-import-stage.test.js`
- `src/lib/clinic-import-store.test.js`
- `src/test/clinic-import-cli.test.js`
- existing `contact-identity.test.js`, `patient-records.test.js`, `appointment-database-migration.test.js`
- existing `src/test/admin-patients-api.test.js`, `src/components/admin/Patients.test.jsx`

## Task 1: Add the normalized history/import schema and migration

**Files:**

- Modify: `db/config.ts`
- Modify: `scripts/init-db.mjs`
- Create: `src/test/clinic-history-database-migration.test.js`
- Modify: `src/test/appointment-database-migration.test.js`

- [ ] **Step 1: Write failing schema tests**

  Create a temporary populated legacy database through the existing migration helper. Assert one behavior per test: all new tables exist, `Patient_phoneFingerprint_unique` is absent, `Patient_phoneFingerprint_idx` is nonunique, source keys are unique, EHR `globalFingerprint` values are unique, clinic-card fingerprints are nonunique, and a second migration preserves existing rows. Add fail-closed cases for wrong legacy index columns, collation, order, partial flag, duplicate indexes, and rogue Patient indexes.

- [ ] **Step 2: Verify Red**

  Run: `bun run test:run -- src/test/clinic-history-database-migration.test.js`

  Expected: failure because the new tables and replacement phone index do not exist.

- [ ] **Step 3: Define the Astro DB tables**

  Add `PatientExternalIdentifier`, `PatientContact`, `PatientNameHistory`, `PatientPrivateData`, `PatientConsent`, `PatientAttachment`, `ImportBatch`, `ImportSourceRow`, `ImportIssue`, `HistoricalVisit`, `HistoricalVisitCandidate`, and `HistoricalInvoice`. Use UUID/text primary keys, encrypted payload columns, safe fingerprints, explicit status enums, and the index contracts from the approved design. Make every child ciphertext/mask/fingerprint cleared by destruction nullable. Give `ImportSourceRow` optional patient/visit associations plus `piiDestroyedAt`, and give `ImportIssue` optional patient/visit associations for safe counts and later cleanup.

  Use a nullable globally unique `globalFingerprint` only for identifiers such as `medesk_ehr`. Use a required per-patient `identityKey` for deduplication. Clinic-card lookup remains nonunique.

- [ ] **Step 4: Implement the idempotent production migration**

  Before changing anything, accept only three exact states: Patient table absent, exact legacy schema/index, or exact target schema/index. For the exact legacy state, drop only `Patient_phoneFingerprint_unique` and create `Patient_phoneFingerprint_idx` inside the existing write transaction. Reject every malformed intermediate state and preserve strict final column/index verification. Do not rebuild or delete `Patient`, `Appointment`, analytics, or MANGO tables.

- [ ] **Step 5: Verify Green and regression coverage**

  Run: `bun run test:run -- src/test/clinic-history-database-migration.test.js src/test/appointment-database-migration.test.js`

  Expected: all migration tests pass on empty, populated, and repeated-run databases.

- [ ] **Step 6: Commit**

  Commit message: `feat: add protected clinic history schema`

## Task 2: Add domain-separated protection for imported private data

**Files:**

- Create: `src/lib/protected-patient-data.js`
- Create: `src/lib/protected-patient-data.test.js`

- [ ] **Step 1: Write failing cryptography contract tests**

  Cover round trips for `private_profile`, `contact`, `external_identifier`, `name_history`, `visit_details`, `source_row`, `invoice`, and `attachment`. Assert that plaintext Cyrillic, phone, passport, address, comment, and URL fragments never occur in envelopes; fingerprints are stable only inside their domain; malformed envelopes, accessors, unsupported domains, weak HMAC keys, invalid AES keys, oversized JSON, and corrupted tags fail safely.

- [ ] **Step 2: Verify Red**

  Run: `bun run test:run -- src/lib/protected-patient-data.test.js`

  Expected: failure because the module is missing.

- [ ] **Step 3: Implement the focused protection boundary**

  Reuse Node `crypto`, the existing canonical base64-key rules, fresh 12-byte IVs, AES-256-GCM, and explicit AAD domains. Accept only JSON-safe plain records and arrays with bounded UTF-8 size. Implement domain-separated HMAC fingerprints with `CONTACT_FINGERPRINT_KEY`; never log values or cryptographic errors containing input.

- [ ] **Step 4: Verify Green**

  Run: `bun run test:run -- src/lib/protected-patient-data.test.js src/lib/contact-identity.test.js`

  Expected: imported-data and existing contact encryption tests pass.

- [ ] **Step 5: Commit**

  Commit message: `feat: protect imported patient data`

## Task 3: Add strict dependency-free CSV and XLSX readers

**Files:**

- Create: `src/lib/tabular-csv.js`
- Create: `src/lib/tabular-csv.test.js`
- Create: `src/lib/tabular-xlsx.js`
- Create: `src/lib/tabular-xlsx.test.js`

- [ ] **Step 1: Write failing CSV tests**

  Cover UTF-8 BOM, tab and semicolon delimiters, CRLF, escaped quotes, embedded newlines, empty trailing cells, nonbreaking spaces preserved for later normalization, duplicate headers, row-width mismatch, and unterminated quotes. Tests must use synthetic non-ASCII patient-like values and no real PII.

- [ ] **Step 2: Verify CSV Red, implement, and verify Green**

  Run Red: `bun run test:run -- src/lib/tabular-csv.test.js`

  Implement a state-machine parser returning immutable header-keyed rows with one-based source row numbers. Reject duplicate or unexpected row widths.

  Run Green: `bun run test:run -- src/lib/tabular-csv.test.js`

- [ ] **Step 3: Write failing XLSX tests**

  Inject a fake archive adapter that returns synthetic workbook relationships, shared strings, styles, and worksheet XML. Cover shared strings, inline strings, numbers, ISO and serial dates, formula cells with cached values, empty cells, XML entities, sparse coordinates, duplicate headers, invalid relationships, missing worksheet, archive-tool failure, zip-integrity failure, and decompressed-output limits. No binary fixture or real workbook is committed.

- [ ] **Step 4: Verify XLSX Red, implement, and verify Green**

  Run Red: `bun run test:run -- src/lib/tabular-xlsx.test.js`

  Parse OOXML with the already-installed Cheerio XML mode and explicit worksheet relationships; do not add a spreadsheet package or handwritten general XML parser. Provide a production archive adapter using `execFile` with fixed `/usr/bin/unzip`, argument arrays, archive/member allowlists, integrity/list checks, input/output limits, and no shell. Fail before processing if the executable is unavailable.

  Run Green: `bun run test:run -- src/lib/tabular-xlsx.test.js`

- [ ] **Step 5: Commit**

  Commit message: `feat: read clinic tabular sources safely`

## Task 4: Normalize and load the approved source set

**Files:**

- Create: `src/lib/clinic-import-normalization.js`
- Create: `src/lib/clinic-import-normalization.test.js`
- Create: `src/lib/clinic-import-sources.js`
- Create: `src/lib/clinic-import-sources.test.js`

- [ ] **Step 1: Write failing normalization tests**

  Cover NFC/`ё`, whitespace, exact short-card punctuation, EHR hyphen removal, domestic/international phones, email casing, passport digits, source-safe row references, UTC date prefixes, the `2023-12-15` placeholder, years outside 1900–2013, the 20 shifted derivative dates, gender source priority, and patronymic inference provenance.

- [ ] **Step 2: Verify Red and implement normalization**

  Run Red: `bun run test:run -- src/lib/clinic-import-normalization.test.js`

  Implement small named functions; preserve short-card punctuation such as `64-2` and `546/1`. Never normalize those into `642` or `5461`. Return explicit empty values and provenance rather than placeholders.

  Run Green: `bun run test:run -- src/lib/clinic-import-normalization.test.js`

- [ ] **Step 3: Write failing source-loader tests**

  Generate temporary synthetic files with the exact approved headers. Assert source priority, left joins, manifest SHA-256, counts, source row numbers, no reads under `_docs`, no `records.csv`, no duplicate `.txt` copies, and strict rejection of missing/renamed columns or changed files.

- [ ] **Step 4: Verify Red and implement source loading**

  Run Red: `bun run test:run -- src/lib/clinic-import-sources.test.js`

  Require explicit absolute CLI paths for the measured files `544663c3807aab090001bad8PD.csv`, `544663c3807aab090001bad8_patients.csv`, `544663c3807aab090001bad8_visits.csv`, `544663c3807aab090001bad8_invoices.csv`, `544663c3807aab090001bad8PD — копия.xlsx`, `medesk.csv`, and `Vse pacienty.xlsx`. Validate the already measured delimiters and exact headers before parsing rows. Keep source paths outside the returned safe manifest; expose only source roles, filenames, hashes, sizes, and counts.

  Run Green: `bun run test:run -- src/lib/clinic-import-sources.test.js`

- [ ] **Step 5: Commit**

  Commit message: `feat: normalize clinic import sources`

## Task 5: Resolve patient identities and previous surnames

**Files:**

- Create: `src/lib/clinic-import-identities.js`
- Create: `src/lib/clinic-import-identities.test.js`

- [ ] **Step 1: Write failing identity tests**

  Use only synthetic records. Test exact EHR preservation, same-FIO duplicate, confirmed surname change, surname change with one missing birthday plus shared phone, same given names/date with later source chronology, mixed three-row card, different people with shared short card, family-shared phone, conflicting INN/SNILS, incomplete FIO, and insufficient-evidence issue.

  Assert deterministic results: one component per identity, canonical current row, previous surname rows, all source EHR IDs retained, no merge by phone alone, and stable HMAC-derived UUIDs.

- [ ] **Step 2: Verify Red**

  Run: `bun run test:run -- src/lib/clinic-import-identities.test.js`

  Expected: failure because the resolver is missing.

- [ ] **Step 3: Implement evidence and component rules**

  Keep evidence evaluation separate from union-find/component construction. Return immutable `patients`, `externalIdentifiers`, `contacts`, `nameHistory`, `privateData`, `consents`, `sourceLinks`, `issues`, and aggregate evidence counts. Choose the current row by trusted chronology and field priority, never by arbitrary input order.

- [ ] **Step 4: Add supplemental medesk-only identity tests**

  Assert that an unknown visit EHR with one exact `medesk.csv` row creates one minimal patient, while name-only or multiple medesk matches remain issues. The two production supplemental EHR rows must emerge from the generic rule, not hard-coded IDs.

- [ ] **Step 5: Verify Green**

  Run: `bun run test:run -- src/lib/clinic-import-identities.test.js`

  Expected: all identity and supplemental-card tests pass.

- [ ] **Step 6: Commit**

  Commit message: `feat: resolve imported patient identities`

## Task 6: Resolve every historical visit without dropping rows

**Files:**

- Create: `src/lib/clinic-import-visits.js`
- Create: `src/lib/clinic-import-visits.test.js`

- [ ] **Step 1: Write failing visit-link tests**

  Cover exact EHR, exact unique clinic card, a clinic card collapsed to one identity, mixed-card ambiguity, the known leading-zero format defect only when uniquely corroborated, exact phone plus compatible name in comment, unique exact name in comment, multiple candidates, unknown card, empty card, missing date, six empty statuses, and two rows sharing one appointment ID.

  Assert each input row produces exactly one `HistoricalVisit`, zero or more candidates, and one of `linked`, `ambiguous`, or `unmatched`.

- [ ] **Step 2: Verify Red**

  Run: `bun run test:run -- src/lib/clinic-import-visits.test.js`

  Expected: failure because the visit resolver is missing.

- [ ] **Step 3: Implement ordered evidence rules**

  Build immutable indexes once, apply rules in approved order, and retain evidence codes rather than raw matched text. Encryptable visit details remain separate from safe linkage metadata. Do not infer that an empty card means no visit.

- [ ] **Step 4: Verify Green**

  Run: `bun run test:run -- src/lib/clinic-import-visits.test.js`

  Expected: all rows and duplicate appointment IDs are preserved.

- [ ] **Step 5: Commit**

  Commit message: `feat: resolve historical visit links`

## Task 7: Build the complete bundle and encrypted dry-run stage

**Files:**

- Create: `src/lib/clinic-import-bundle.js`
- Create: `src/lib/clinic-import-bundle.test.js`
- Create: `src/lib/clinic-import-stage.js`
- Create: `src/lib/clinic-import-stage.test.js`

- [ ] **Step 1: Write failing bundle tests**

  Compose synthetic source loaders, identity resolution, visit resolution, source-row capture, 12 incomplete invoices, consents, issues, and empty attachments. Assert no included row disappears, every source payload is queued for encryption, totals reconcile, unsupported medical sources are absent, invoice records are marked incomplete, and report output contains no source values.

- [ ] **Step 2: Verify Red**

  Run: `bun run test:run -- src/lib/clinic-import-bundle.test.js`

  Expected: failure because the bundle composer is missing.

- [ ] **Step 3: Implement bundle composition and invariant checks**

  Return normalized entity arrays plus a safe report. Fail fast for duplicate EHR, source-count drift, missing patient components, status totals that do not reconcile, any attachment row in this import, or any included medical-document source.

- [ ] **Step 4: Verify Green**

  Run: `bun run test:run -- src/lib/clinic-import-bundle.test.js`

  Expected: bundle totals and redaction tests pass.

- [ ] **Step 5: Commit**

  Before commit, add stage tests that prove the target database remains byte-identical, every private field in the stage is ciphertext or a fingerprint, the manifest and canonical plan hashes are verified, tampering fails before persistence, the output path must be absolute and outside the repository, and the safe summary contains no source values. Implement an authenticated encrypted stage that apply can read without reopening the source files.

  Run: `bun run test:run -- src/lib/clinic-import-bundle.test.js src/lib/clinic-import-stage.test.js`

  Commit message: `feat: stage clinic history import securely`

## Task 8: Persist dry-run/apply safely and expose the CLI

**Files:**

- Create: `src/lib/clinic-import-store.js`
- Create: `src/lib/clinic-import-store.test.js`
- Create: `scripts/import-clinic-history.mjs`
- Create: `src/test/clinic-import-cli.test.js`
- Modify: `package.json`

- [ ] **Step 1: Write failing store tests**

  Use a temporary migrated SQLite database. Assert one transaction, deterministic IDs, manifest idempotency, rollback on a late constraint failure, encrypted columns without plaintext, nonunique appointment fingerprint, preserved candidates, and completed batch totals. Apply must consume and fully verify the encrypted stage before opening the target transaction; dry-run never invokes the target store.

- [ ] **Step 2: Verify store Red, implement, and verify Green**

  Run Red: `bun run test:run -- src/lib/clinic-import-store.test.js`

  Pre-encrypt and validate the bundle before opening the write transaction. Insert in dependency order and mark the batch complete only after control queries reconcile.

  Run Green: `bun run test:run -- src/lib/clinic-import-store.test.js`

- [ ] **Step 3: Write failing CLI tests**

  Cover default dry-run, unknown arguments, relative paths, missing files, changed manifest, `--apply` without backup, backup path equal to database path, remote DB URL, unsafe `/data/db.sqlite` apply without explicit confirmation, successful isolated apply, and safe aggregate stdout.

- [ ] **Step 4: Verify CLI Red, implement, and verify Green**

  Run Red: `bun run test:run -- src/test/clinic-import-cli.test.js`

  Add `clinic:import` to `package.json`. Require absolute source/database/stage paths. Dry-run is the default and creates the encrypted stage outside the repository. Apply requires `--apply`, `--stage`, `--manifest`, and `--backup`. The backup must already exist, be readable, be distinct from the target, pass SQLite integrity checks, and represent a WAL-consistent snapshot; do not copy a live DB naïvely. Do not offer a production default path.

  Run Green: `bun run test:run -- src/test/clinic-import-cli.test.js src/lib/clinic-import-store.test.js`

- [ ] **Step 5: Commit**

  Commit message: `feat: add transactional clinic history import`

## Task 9: Stop merging operational patients by phone alone

**Files:**

- Modify: `src/lib/contact-identity.js`
- Modify: `src/lib/contact-identity.test.js`
- Modify: `src/lib/patient-records.js`
- Modify: `src/lib/patient-records.test.js`
- Modify: `src/lib/appointment-records.js`
- Modify: `src/lib/appointment-records.test.js`
- Modify: `src/lib/mango-call-records.js`
- Modify: `src/lib/mango-call-records.test.js`

- [ ] **Step 1: Write failing profile-absence tests**

  Assert imported profiles may omit a phone or an incomplete name without placeholder values, while public booking validation still supplies required fields at its own boundary. Existing encrypted profiles must continue to decrypt.

- [ ] **Step 2: Verify Red and implement optional imported profile fields**

  Run Red: `bun run test:run -- src/lib/contact-identity.test.js`

  Export/reuse canonical patient-profile normalization instead of duplicating name/date comparison. Update only the protected profile contract; do not weaken appointment input validation.

  Run Green: `bun run test:run -- src/lib/contact-identity.test.js src/lib/appointment-validation.test.js`

- [ ] **Step 3: Write failing shared-phone repository tests**

  Assert two different names/dates with the same phone create two patients, an exact compatible identity updates one patient, multiple compatible candidates fail closed, primary and secondary contacts are written to `PatientContact`, exact phone search through `PatientContact` returns every matching card, appointment persistence remains transactional, a unique fingerprint links MANGO calls, a second active patient clears automatic MANGO linkage, future ambiguous calls remain unlinked, destroyed patients do not count, and no decrypted PII appears in errors.

- [ ] **Step 4: Verify Red and implement identity-aware upsert**

  Run Red: `bun run test:run -- src/lib/patient-records.test.js`

  Replace `ON CONFLICT(phoneFingerprint)` with candidate lookup plus profile compatibility. Insert distinct patients on ambiguity, maintain the primary-phone projection and normalized `PatientContact` rows in the same transaction, and search contacts through the child table. Update MANGO only after counting active patient identities for the fingerprint.

  Run Green: `bun run test:run -- src/lib/patient-records.test.js src/lib/appointment-records.test.js src/lib/mango-call-records.test.js`

- [ ] **Step 5: Commit**

  Commit message: `fix: preserve patients sharing one phone`

## Task 10: Add protected admin records and API contracts

**Files:**

- Create: `src/lib/patient-history-records.js`
- Create: `src/lib/patient-history-records.test.js`
- Modify: `src/lib/patient-records.js`
- Modify: `src/lib/patient-records.test.js`
- Modify: `src/lib/admin-patient-api.js`
- Modify: `src/lib/admin-clinic-query.js`
- Modify: `src/lib/admin-clinic-query.test.js`
- Create: `src/lib/admin-patient-history-api.js`
- Create: `src/test/admin-patient-history-api.test.js`
- Create: `src/pages/api/admin/patient-history/issues.js`
- Modify: `src/test/admin-patients-api.test.js`
- Modify: `src/pages/api/admin/patients/index.js`
- Modify: `src/pages/api/admin/patients/[id].js`
- Modify: `src/pages/api/admin/patients/[id]/reveal.js`
- Modify: `src/pages/api/admin/patients/[id]/personal-data.js`

- [ ] **Step 1: Write failing imported-record tests**

  Assert safe summary counts, historical visit pagination/filtering, issue reasons, empty attachment arrays, audited reveal of contacts/previous surnames/passport/address/consents/notes, corrupted child ciphertext failure, and destruction clearing every child ciphertext/fingerprint in the existing patient-destruction transaction while retaining anonymized visits and issues.

- [ ] **Step 2: Verify Red and implement repository boundary**

  Run Red: `bun run test:run -- src/lib/patient-history-records.test.js`

  Keep general detail reads masked. Join and decrypt only inside the existing separately limited reveal transaction. Return immutable arrays and safe enums.

  Run Green: `bun run test:run -- src/lib/patient-history-records.test.js src/lib/patient-records.test.js`

- [ ] **Step 3: Write failing API tests**

  Assert admin auth, origin validation for reveal/destroy, PII rate limit, `Cache-Control: no-store`, safe list/detail payloads, multiple phone matches, expanded reveal shape, bounded visits/issues pagination, a read-only `ambiguous`/`unmatched` issue endpoint, no ciphertext or exact external IDs in normal responses, and controlled `503` for storage corruption.

- [ ] **Step 4: Verify API Red and implement thin adapters**

  Run Red: `bun run test:run -- src/test/admin-patients-api.test.js src/test/admin-patient-history-api.test.js src/lib/admin-clinic-query.test.js`

  Extend the existing endpoint factories and routes without duplicating guards. Do not create state-changing endpoints for manual visit resolution in this phase.

  Run Green: `bun run test:run -- src/test/admin-patients-api.test.js src/test/admin-patient-history-api.test.js src/lib/admin-clinic-query.test.js src/lib/admin-api.test.js`

- [ ] **Step 5: Commit**

  Commit message: `feat: expose imported patient history securely`

## Task 11: Display imported data and timed reveal in the admin UI

**Files:**

- Modify: `src/components/admin/Patients.jsx`
- Modify: `src/components/admin/Patients.test.jsx`
- Create: `src/components/admin/PatientDetails.jsx`
- Create: `src/components/admin/PatientDetails.test.jsx`
- Create: `src/components/admin/PatientHistoryIssues.jsx`
- Create: `src/components/admin/PatientHistoryIssues.test.jsx`
- Create: `e2e/admin-patients-history.spec.js`
- Modify: `e2e/admin-calls.spec.js`
- Read before editing: `.cursor/rules/react-patterns.mdc`, `.cursor/rules/error-handling.mdc`

- [ ] **Step 1: Write failing component tests**

  Cover safe summary badges, multiple external-card count, previous-surname count without plaintext before reveal, `?patient=<uuid>` deep linking from Calls, visit status/date including missing date, issues filter, reveal sections, 30-second automatic hiding, cleanup on hide/unmount/tab or page change, destroy confirmation, focus restoration, keyboard operation, and API failures. Use synthetic Cyrillic data.

- [ ] **Step 2: Verify Red**

  Run: `bun run test:run -- src/components/admin/Patients.test.jsx src/components/admin/PatientDetails.test.jsx src/components/admin/PatientHistoryIssues.test.jsx`

  Expected: failure because imported sections are absent.

- [ ] **Step 3: Implement the minimum accessible UI**

  Keep `Patients.jsx` as orchestration and extract focused detail and issue components. Do not introduce routing, dependencies, charts, or manual merge controls. Keep passport/address/contacts behind reveal and remove them from state after the timer, selection change, hide, unmount, or browser page/tab change.

- [ ] **Step 4: Verify Green**

  Run unit: `bun run test:run -- src/components/admin/Patients.test.jsx src/components/admin/PatientDetails.test.jsx src/components/admin/PatientHistoryIssues.test.jsx src/test/admin-patients-api.test.js src/test/admin-patient-history-api.test.js`

  Run browser: `bun run test:e2e -- e2e/admin-patients-history.spec.js e2e/admin-calls.spec.js --project=chromium --workers=1`

  Expected: component and API tests pass.

- [ ] **Step 5: Commit**

  Commit message: `feat: show imported patient history in admin`

## Task 12: Document, run the real dry-run, apply to an isolated copy, and verify

**Files:**

- Modify: `README.md`
- Modify: `.env.example` only if key semantics or variables changed
- Modify: `docs/superpowers/specs/2026-08-27-clinic-patient-history-import-design.md` for the corrected two supplemental identities
- Create outside Git: protected dry-run report and isolated SQLite copy

- [ ] **Step 1: Update documentation**

  Document the new tables, `bun run clinic:import`, source arguments, dry-run default, backup/apply gate, expected control totals, shared-phone semantics, PII reveal/destruction, exclusion of medical documents, and rollback procedure. State that incomplete invoices cannot support revenue analytics.

- [ ] **Step 2: Run targeted tests**

  Run: `bun run test:run -- src/lib/protected-patient-data.test.js src/lib/tabular-csv.test.js src/lib/tabular-xlsx.test.js src/lib/clinic-import-normalization.test.js src/lib/clinic-import-sources.test.js src/lib/clinic-import-identities.test.js src/lib/clinic-import-visits.test.js src/lib/clinic-import-bundle.test.js src/lib/clinic-import-stage.test.js src/lib/clinic-import-store.test.js src/test/clinic-import-cli.test.js src/test/clinic-history-database-migration.test.js src/lib/patient-records.test.js src/lib/appointment-records.test.js src/lib/mango-call-records.test.js src/lib/patient-history-records.test.js src/test/admin-patients-api.test.js src/test/admin-patient-history-api.test.js src/components/admin/Patients.test.jsx src/components/admin/PatientDetails.test.jsx src/components/admin/PatientHistoryIssues.test.jsx`

  Expected: all targeted tests pass with no unexpected stderr or PII.

- [ ] **Step 3: Run the real dry-run locally**

  Invoke `bun run clinic:import` with the confirmed absolute source paths and an explicit isolated database path, without `--apply`. Capture only the protected report outside Git.

  Expected control totals:

  - 16 187 primary patient source rows;
  - 16 189 external MEDESK EHR IDs including two supplemental identities;
  - 16 173 local patient identities;
  - 49 768 historical visits across link statuses;
  - 2 105 visits without dates;
  - 14 097 valid birth dates;
  - 74 exact short-card collision groups;
  - 12 duplicate pairs and 4 surname-change pairs merged;
  - one mixed triple and one possible duplicate handled without unsafe merge;
  - 12 incomplete invoices;
  - zero attachments and zero medical-document rows.

- [ ] **Step 4: Apply to an isolated database copy**

  Create a temporary SQLite database and a separate consistent backup through SQLite backup semantics, run `scripts/init-db.mjs`, then run the importer with `--apply`, the verified stage, exact dry-run manifest, and backup path. Run it a second time to prove idempotency. Query all control totals and scan protected columns for known synthetic/source plaintext only through a local verification process that does not print values.

- [ ] **Step 5: Run broad verification**

  Run in order:

  - `bun run test:run`
  - `bun run lint`
  - `bun run build`

  Expected: 0 failed tests, 0 lint errors, successful Astro build.

- [ ] **Step 6: Perform security review**

  Verify every state-changing admin call retains origin/CSRF handling, reveal remains separately rate-limited and audited, no route logs PII, exact phone search can return multiple patients, destruction clears child data, and the import command refuses production apply without backup and manifest.

- [ ] **Step 7: Commit documentation and verified control totals**

  Commit message: `docs: document clinic history import`

- [ ] **Step 8: Final review and branch handoff**

  Run a spec-compliance review followed by a code-quality review over the entire branch. Resolve every finding, rerun the relevant validation, and then use the branch-finishing workflow. Do not apply to the actual production database in this task.
