import { createClient } from '@libsql/client'

function enumCheck(column, values, { nullable = false } = {}) {
  const list = values.map((value) => `'${value}'`).join(', ')
  return nullable ? `CHECK (${column} IS NULL OR ${column} IN (${list}))` : `CHECK (${column} IN (${list}))`
}

function withConstraints(statement, constraints) {
  if (!statement.endsWith('\n  )')) throw new Error('[init-db] table statement must end with a closing parenthesis on its own line')
  return `${statement.slice(0, -'\n  )'.length)},\n    ${constraints.join(',\n    ')}\n  )`
}


const url = process.env.ASTRO_DB_REMOTE_URL ?? 'file:/data/db.sqlite'
const authToken = process.env.ASTRO_DB_APP_TOKEN

const db = createClient({ url, authToken })
const bookingIntentTableBase = `CREATE TABLE IF NOT EXISTS BookingIntent (
    id TEXT PRIMARY KEY,
    requestFingerprint TEXT NOT NULL,
    status TEXT NOT NULL,
    fencingToken TEXT,
    doctorSlug TEXT NOT NULL,
    appointmentType TEXT NOT NULL,
    doctorId INTEGER NOT NULL,
    lpuId INTEGER NOT NULL,
    specialityId INTEGER NOT NULL,
    startsAt TEXT NOT NULL,
    endsAt TEXT NOT NULL,
    price INTEGER NOT NULL,
    medflexClaimId TEXT,
    failureCode TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    pendingUntil TEXT NOT NULL
  )`
const bookingIntentTableStatement = withConstraints(bookingIntentTableBase, [enumCheck('status', ['pending', 'confirmed', 'uncertain', 'failed'])])
const patientTableStatement = `CREATE TABLE IF NOT EXISTS Patient (
    id TEXT PRIMARY KEY,
    profileCiphertext TEXT,
    phoneMask TEXT,
    phoneFingerprint TEXT,
    firstSeenAt TEXT,
    lastSeenAt TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    piiDestroyedAt TEXT
  )`
const previousPatientTableStatement = `CREATE TABLE Patient (
    id TEXT PRIMARY KEY,
    profileCiphertext TEXT,
    phoneMask TEXT,
    phoneFingerprint TEXT,
    firstSeenAt TEXT NOT NULL,
    lastSeenAt TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    piiDestroyedAt TEXT
  )`
const patientExternalIdentifierTableBase = `CREATE TABLE IF NOT EXISTS PatientExternalIdentifier (
    id TEXT PRIMARY KEY,
    patientId TEXT NOT NULL,
    system TEXT NOT NULL,
    ciphertext TEXT,
    fingerprint TEXT,
    globalFingerprint TEXT,
    identityKey TEXT NOT NULL,
    sourceName TEXT NOT NULL,
    sourceRow INTEGER NOT NULL,
    isPrimary INTEGER NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )`
const patientExternalIdentifierTableStatement = withConstraints(patientExternalIdentifierTableBase, ['FOREIGN KEY (patientId) REFERENCES Patient(id)'])
const patientContactTableBase = `CREATE TABLE IF NOT EXISTS PatientContact (
    id TEXT PRIMARY KEY,
    patientId TEXT NOT NULL,
    kind TEXT NOT NULL,
    ciphertext TEXT,
    fingerprint TEXT,
    mask TEXT,
    isPrimary INTEGER NOT NULL,
    sourceName TEXT NOT NULL,
    firstSeenAt TEXT,
    lastSeenAt TEXT,
    piiDestroyedAt TEXT
  )`
const patientContactTableStatement = withConstraints(patientContactTableBase, [enumCheck('kind', ['phone', 'email']), 'FOREIGN KEY (patientId) REFERENCES Patient(id)'])
const patientNameHistoryTableBase = `CREATE TABLE IF NOT EXISTS PatientNameHistory (
    id TEXT PRIMARY KEY,
    patientId TEXT NOT NULL,
    lastNameCiphertext TEXT,
    lastNameFingerprint TEXT,
    sourceName TEXT NOT NULL,
    sourceIdentifierCiphertext TEXT,
    observedAt TEXT,
    reason TEXT NOT NULL,
    piiDestroyedAt TEXT
  )`
const patientNameHistoryTableStatement = withConstraints(patientNameHistoryTableBase, [enumCheck('reason', ['surname_change', 'identity_alias', 'source_correction']), 'FOREIGN KEY (patientId) REFERENCES Patient(id)'])
const patientPrivateDataTableBase = `CREATE TABLE IF NOT EXISTS PatientPrivateData (
    id TEXT PRIMARY KEY,
    patientId TEXT NOT NULL,
    profileCiphertext TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    piiDestroyedAt TEXT
  )`
const patientPrivateDataTableStatement = withConstraints(patientPrivateDataTableBase, ['FOREIGN KEY (patientId) REFERENCES Patient(id)'])
const patientConsentTableBase = `CREATE TABLE IF NOT EXISTS PatientConsent (
    id TEXT PRIMARY KEY,
    patientId TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    sourceName TEXT NOT NULL,
    observedAt TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )`
const patientConsentTableStatement = withConstraints(patientConsentTableBase, [enumCheck('type', ['sms_notifications']), enumCheck('status', ['granted', 'not_granted', 'unknown']), 'FOREIGN KEY (patientId) REFERENCES Patient(id)'])
const patientAttachmentTableBase = `CREATE TABLE IF NOT EXISTS PatientAttachment (
    id TEXT PRIMARY KEY,
    patientId TEXT NOT NULL,
    kind TEXT NOT NULL,
    urlCiphertext TEXT,
    metadataCiphertext TEXT,
    sourceName TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    deletedAt TEXT,
    piiDestroyedAt TEXT
  )`
const patientAttachmentTableStatement = withConstraints(patientAttachmentTableBase, ['FOREIGN KEY (patientId) REFERENCES Patient(id)'])
const importBatchTableBase = `CREATE TABLE IF NOT EXISTS ImportBatch (
    id TEXT PRIMARY KEY,
    manifestHash TEXT NOT NULL,
    planHash TEXT NOT NULL,
    mode TEXT NOT NULL,
    status TEXT NOT NULL,
    controlTotals TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    completedAt TEXT
  )`
const importBatchTableStatement = withConstraints(importBatchTableBase, [enumCheck('mode', ['apply']), enumCheck('status', ['applying', 'completed'])])
const importSourceRowTableStatement = `CREATE TABLE IF NOT EXISTS ImportSourceRow (
    id TEXT PRIMARY KEY,
    batchId TEXT NOT NULL,
    sourceName TEXT NOT NULL,
    sourceRow INTEGER NOT NULL,
    patientId TEXT,
    historicalVisitId TEXT,
    payloadCiphertext TEXT,
    payloadHash TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    piiDestroyedAt TEXT
  )`
const importIssueTableBase = `CREATE TABLE IF NOT EXISTS ImportIssue (
    id TEXT PRIMARY KEY,
    batchId TEXT NOT NULL,
    sourceName TEXT NOT NULL,
    sourceRow INTEGER NOT NULL,
    code TEXT NOT NULL,
    patientId TEXT,
    historicalVisitId TEXT,
    candidatesCiphertext TEXT,
    detailsCiphertext TEXT,
    createdAt TEXT NOT NULL,
    resolvedAt TEXT
  )`
const importIssueTableStatement = withConstraints(importIssueTableBase, ['FOREIGN KEY (batchId) REFERENCES ImportBatch(id)', 'FOREIGN KEY (patientId) REFERENCES Patient(id)', 'FOREIGN KEY (historicalVisitId) REFERENCES HistoricalVisit(id)'])
const historicalVisitTableBase = `CREATE TABLE IF NOT EXISTS HistoricalVisit (
    id TEXT PRIMARY KEY,
    batchId TEXT NOT NULL,
    sourceName TEXT NOT NULL,
    sourceRow INTEGER NOT NULL,
    patientId TEXT,
    appointmentIdCiphertext TEXT,
    appointmentIdFingerprint TEXT,
    startsAt TEXT,
    endsAt TEXT,
    sourceStatus TEXT NOT NULL,
    doctorCiphertext TEXT,
    detailsCiphertext TEXT,
    linkStatus TEXT NOT NULL,
    linkMethod TEXT,
    evidenceLevel TEXT,
    createdAt TEXT NOT NULL,
    piiDestroyedAt TEXT
  )`
const historicalVisitTableStatement = withConstraints(historicalVisitTableBase, [enumCheck('linkStatus', ['linked', 'ambiguous', 'unmatched']), enumCheck('linkMethod', ['exact_ehr', 'exact_clinic_card', 'leading_zero_clinic_card', 'phone_compatible_name', 'exact_full_name', 'conflicting_comment_evidence'], { nullable: true }), enumCheck('evidenceLevel', ['exact', 'strong', 'moderate', 'none'], { nullable: true }), 'FOREIGN KEY (batchId) REFERENCES ImportBatch(id)', 'FOREIGN KEY (patientId) REFERENCES Patient(id)'])
const historicalVisitCandidateTableBase = `CREATE TABLE IF NOT EXISTS HistoricalVisitCandidate (
    id TEXT PRIMARY KEY,
    historicalVisitId TEXT NOT NULL,
    patientId TEXT NOT NULL,
    evidenceCode TEXT NOT NULL,
    score INTEGER NOT NULL,
    createdAt TEXT NOT NULL
  )`
const historicalVisitCandidateTableStatement = withConstraints(historicalVisitCandidateTableBase, ['FOREIGN KEY (historicalVisitId) REFERENCES HistoricalVisit(id)', 'FOREIGN KEY (patientId) REFERENCES Patient(id)'])
const historicalInvoiceTableBase = `CREATE TABLE IF NOT EXISTS HistoricalInvoice (
    id TEXT PRIMARY KEY,
    batchId TEXT NOT NULL,
    sourceName TEXT NOT NULL,
    sourceRow INTEGER NOT NULL,
    historicalVisitId TEXT,
    payloadCiphertext TEXT,
    sourceStatus TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    piiDestroyedAt TEXT
  )`
const historicalInvoiceTableStatement = withConstraints(historicalInvoiceTableBase, ['FOREIGN KEY (batchId) REFERENCES ImportBatch(id)'])
const patientAccessTableBase = `CREATE TABLE IF NOT EXISTS PatientAccess (
    id TEXT PRIMARY KEY,
    patientId TEXT NOT NULL,
    action TEXT NOT NULL,
    actor TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    reason TEXT
  )`
const patientAccessTableStatement = withConstraints(patientAccessTableBase, [enumCheck('action', ['reveal', 'reveal_full', 'search', 'destroy']), 'FOREIGN KEY (patientId) REFERENCES Patient(id)'])
const appointmentTableBase = `CREATE TABLE IF NOT EXISTS Appointment (
    id TEXT PRIMARY KEY,
    patientId TEXT NOT NULL,
    source TEXT NOT NULL,
    status TEXT NOT NULL,
    medflexClaimId TEXT,
    medflexLpuId INTEGER,
    medflexDoctorId INTEGER,
    medflexSpecialityId INTEGER,
    medflexServiceId INTEGER,
    doctorName TEXT NOT NULL,
    specialityName TEXT NOT NULL,
    serviceName TEXT,
    startsAt TEXT NOT NULL,
    endsAt TEXT NOT NULL,
    priceKopecks INTEGER,
    bookingFingerprint TEXT NOT NULL,
    failureCode TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    cancelledAt TEXT
  )`
const appointmentTableStatement = withConstraints(appointmentTableBase, [enumCheck('status', ['pending', 'confirmed', 'cancelled', 'failed', 'needs_review']), enumCheck('source', ['website', 'admin_medflex', 'admin_existing']), 'FOREIGN KEY (patientId) REFERENCES Patient(id)'])
const medflexDoctorLinkTableBase = `CREATE TABLE IF NOT EXISTS MedflexDoctorLink (
    medflexDoctorId INTEGER PRIMARY KEY,
    externalName TEXT NOT NULL,
    localDoctorId TEXT,
    active INTEGER NOT NULL,
    syncedAt TEXT NOT NULL
  )`
const medflexDoctorLinkTableStatement = withConstraints(medflexDoctorLinkTableBase, ['CHECK (active IN (0, 1))'])
const mangoCallTableBase = `CREATE TABLE IF NOT EXISTS MangoCall (
    entryId TEXT PRIMARY KEY,
    patientId TEXT,
    status TEXT NOT NULL,
    callerCiphertext TEXT,
    callerMask TEXT,
    callerFingerprint TEXT,
    repeatCaller INTEGER,
    lineNumber TEXT NOT NULL,
    operatorExtension TEXT,
    startedAt TEXT NOT NULL,
    forwardedAt TEXT,
    answeredAt TEXT,
    endedAt TEXT,
    waitSeconds INTEGER,
    talkSeconds INTEGER,
    disconnectReason TEXT,
    finalizedAt TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    piiDestroyedAt TEXT
  )`
const mangoCallTableStatement = withConstraints(mangoCallTableBase, [enumCheck('status', ['ringing', 'queued', 'connected', 'on_hold', 'finalizing', 'answered', 'missed']), 'FOREIGN KEY (patientId) REFERENCES Patient(id)'])
const mangoCallLegTableBase = `CREATE TABLE IF NOT EXISTS MangoCallLeg (
    callId TEXT PRIMARY KEY,
    entryId TEXT NOT NULL,
    maxSeq INTEGER NOT NULL,
    state TEXT NOT NULL,
    location TEXT,
    extension TEXT,
    eventAt TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )`
const mangoCallLegTableStatement = withConstraints(mangoCallLegTableBase, [enumCheck('state', ['ringing', 'queued', 'connected', 'on_hold', 'finalizing']), 'FOREIGN KEY (entryId) REFERENCES MangoCall(entryId)'])
const mangoCallAccessTableBase = `CREATE TABLE IF NOT EXISTS MangoCallAccess (
    id TEXT PRIMARY KEY,
    entryId TEXT NOT NULL,
    action TEXT NOT NULL,
    actor TEXT NOT NULL,
    createdAt TEXT NOT NULL
  )`
const mangoCallAccessTableStatement = withConstraints(mangoCallAccessTableBase, [enumCheck('action', ['reveal', 'destroy']), 'FOREIGN KEY (entryId) REFERENCES MangoCall(entryId)'])

const mangoCallIssueTableStatement = `CREATE TABLE IF NOT EXISTS MangoCallIssue (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    entryId TEXT,
    createdAt TEXT NOT NULL
  )`
const adminSessionTableBase = `CREATE TABLE IF NOT EXISTS AdminSession (
    id TEXT PRIMARY KEY,
    issuedAt TEXT NOT NULL,
    lastSeenAt TEXT NOT NULL,
    revokedAt TEXT,
    userId TEXT
  )`
const adminSessionTableStatement = withConstraints(adminSessionTableBase, ['FOREIGN KEY (userId) REFERENCES AdminUser(id)'])
const adminUserTableStatement = `CREATE TABLE IF NOT EXISTS AdminUser (
    id TEXT PRIMARY KEY,
    login TEXT NOT NULL,
    displayName TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'staff')),
    passwordHash TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    disabledAt TEXT,
    passwordChangedAt TEXT NOT NULL
  )`
const adminAuthEventTableBase = `CREATE TABLE IF NOT EXISTS AdminAuthEvent (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    actor TEXT,
    ip TEXT,
    userAgentHash TEXT,
    createdAt TEXT NOT NULL
  )`
const adminAuthEventTableStatement = withConstraints(adminAuthEventTableBase, [enumCheck('kind', ['login_success', 'login_failure', 'login_limited', 'logout', 'logout_all'])])


/** Legacy catalog and analytics tables: dates are ISO-8601 text, numbers are integers, as drizzle writes them. */
const doctorTableBase = `CREATE TABLE IF NOT EXISTS Doctor (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT,
    specialization TEXT NOT NULL,
    experienceYears INTEGER NOT NULL,
    bio TEXT NOT NULL,
    photoMediaId TEXT
  )`
const doctorTableStatement = withConstraints(doctorTableBase, ['FOREIGN KEY (photoMediaId) REFERENCES Media(id)'])
const mediaTableStatement = `CREATE TABLE IF NOT EXISTS Media (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    mimeType TEXT NOT NULL,
    url TEXT NOT NULL,
    folder TEXT NOT NULL,
    createdAt TEXT NOT NULL
  )`
const doctorCertificateTableBase = `CREATE TABLE IF NOT EXISTS DoctorCertificate (
    id TEXT PRIMARY KEY,
    doctorId TEXT NOT NULL,
    mediaId TEXT NOT NULL,
    title TEXT,
    sortOrder INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL
  )`
const doctorCertificateTableStatement = withConstraints(doctorCertificateTableBase, ['FOREIGN KEY (doctorId) REFERENCES Doctor(id)', 'FOREIGN KEY (mediaId) REFERENCES Media(id)'])
const serviceTableStatement = `CREATE TABLE IF NOT EXISTS Service (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    direction TEXT NOT NULL,
    description TEXT NOT NULL,
    price INTEGER NOT NULL
  )`
const analyticsSessionTableStatement = `CREATE TABLE IF NOT EXISTS AnalyticsSession (
    id TEXT PRIMARY KEY,
    visitorId TEXT NOT NULL,
    ip TEXT,
    userAgent TEXT,
    currentPage TEXT,
    referrer TEXT,
    screenWidth INTEGER,
    screenHeight INTEGER,
    language TEXT,
    startedAt TEXT NOT NULL,
    lastActiveAt TEXT NOT NULL
  )`
const pageViewTableBase = `CREATE TABLE IF NOT EXISTS PageView (
    id TEXT PRIMARY KEY,
    sessionId TEXT NOT NULL,
    page TEXT NOT NULL,
    enteredAt TEXT NOT NULL,
    duration INTEGER
  )`
const pageViewTableStatement = withConstraints(pageViewTableBase, ['FOREIGN KEY (sessionId) REFERENCES AnalyticsSession(id)'])
const eventLogTableBase = `CREATE TABLE IF NOT EXISTS EventLog (
    id TEXT PRIMARY KEY,
    sessionId TEXT NOT NULL,
    eventType TEXT NOT NULL,
    page TEXT NOT NULL,
    target TEXT,
    details TEXT,
    createdAt TEXT NOT NULL
  )`
const eventLogTableStatement = withConstraints(eventLogTableBase, ['FOREIGN KEY (sessionId) REFERENCES AnalyticsSession(id)'])
/** Shapes init-db and Astro DB produced before September 2026; a matching table is rebuilt into the canonical shape. */
const legacyTableShapes = Object.freeze({
  Doctor: [`CREATE TABLE IF NOT EXISTS Doctor (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT,
    specialization TEXT NOT NULL,
    experienceYears REAL NOT NULL,
    bio TEXT NOT NULL,
    photoMediaId TEXT
  )`, 'CREATE TABLE "Doctor" ("id" text PRIMARY KEY, "name" text NOT NULL, "slug" text, "specialization" text NOT NULL, "experienceYears" integer NOT NULL, "bio" text NOT NULL, "photoMediaId" text)'],
  Media: [`CREATE TABLE IF NOT EXISTS Media (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    mimeType TEXT NOT NULL,
    url TEXT NOT NULL,
    folder TEXT NOT NULL,
    createdAt INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
  )`, 'CREATE TABLE "Media" ("id" text PRIMARY KEY, "filename" text NOT NULL, "mimeType" text NOT NULL, "url" text NOT NULL, "folder" text NOT NULL, "createdAt" text NOT NULL DEFAULT \'<ISO>\')'],
  DoctorCertificate: [`CREATE TABLE IF NOT EXISTS DoctorCertificate (
    id TEXT PRIMARY KEY,
    doctorId TEXT NOT NULL,
    mediaId TEXT NOT NULL,
    title TEXT,
    sortOrder REAL NOT NULL DEFAULT 0,
    createdAt INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
  )`, 'CREATE TABLE "DoctorCertificate" ("id" text PRIMARY KEY, "doctorId" text NOT NULL, "mediaId" text NOT NULL, "title" text, "sortOrder" integer NOT NULL DEFAULT 0, "createdAt" text NOT NULL DEFAULT \'<ISO>\')'],
  Service: [`CREATE TABLE IF NOT EXISTS Service (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    direction TEXT NOT NULL,
    description TEXT NOT NULL,
    price REAL NOT NULL
  )`, 'CREATE TABLE "Service" ("id" text PRIMARY KEY, "title" text NOT NULL, "direction" text NOT NULL, "description" text NOT NULL, "price" integer NOT NULL)'],
  AnalyticsSession: [`CREATE TABLE IF NOT EXISTS AnalyticsSession (
    id TEXT PRIMARY KEY,
    visitorId TEXT NOT NULL,
    ip TEXT,
    userAgent TEXT,
    currentPage TEXT,
    referrer TEXT,
    screenWidth REAL,
    screenHeight REAL,
    language TEXT,
    startedAt INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    lastActiveAt INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
  )`, 'CREATE TABLE "AnalyticsSession" ("id" text PRIMARY KEY, "visitorId" text NOT NULL, "ip" text, "userAgent" text, "currentPage" text, "referrer" text, "screenWidth" integer, "screenHeight" integer, "language" text, "startedAt" text NOT NULL DEFAULT \'<ISO>\', "lastActiveAt" text NOT NULL DEFAULT \'<ISO>\')'],
  PageView: [`CREATE TABLE IF NOT EXISTS PageView (
    id TEXT PRIMARY KEY,
    sessionId TEXT NOT NULL,
    page TEXT NOT NULL,
    enteredAt INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    duration REAL
  )`, 'CREATE TABLE "PageView" ("id" text PRIMARY KEY, "sessionId" text NOT NULL, "page" text NOT NULL, "enteredAt" text NOT NULL DEFAULT \'<ISO>\', "duration" integer)'],
  EventLog: [`CREATE TABLE IF NOT EXISTS EventLog (
    id TEXT PRIMARY KEY,
    sessionId TEXT NOT NULL,
    eventType TEXT NOT NULL,
    page TEXT NOT NULL,
    target TEXT,
    details TEXT,
    createdAt INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
  )`, 'CREATE TABLE "EventLog" ("id" text PRIMARY KEY, "sessionId" text NOT NULL, "eventType" text NOT NULL, "page" text NOT NULL, "target" text, "details" text, "createdAt" text NOT NULL DEFAULT \'<ISO>\')'],
})

const statements = [
  doctorTableStatement,
  mediaTableStatement,
  doctorCertificateTableStatement,
  serviceTableStatement,
  analyticsSessionTableStatement,
  pageViewTableStatement,
  eventLogTableStatement,
  bookingIntentTableStatement,
  'CREATE UNIQUE INDEX IF NOT EXISTS BookingIntent_requestFingerprint_unique ON BookingIntent(requestFingerprint)',
  'CREATE UNIQUE INDEX IF NOT EXISTS BookingIntent_medflexClaimId_unique ON BookingIntent(medflexClaimId)',
  'CREATE UNIQUE INDEX IF NOT EXISTS BookingIntent_fencingToken_unique ON BookingIntent(fencingToken)',
  'CREATE INDEX IF NOT EXISTS BookingIntent_resumeScope_idx ON BookingIntent(doctorSlug, appointmentType, startsAt, endsAt)',
  'CREATE INDEX IF NOT EXISTS BookingIntent_status_pendingUntil_idx ON BookingIntent(status, pendingUntil)',
  patientTableStatement,
  'CREATE INDEX IF NOT EXISTS AnalyticsSession_startedAt_idx ON AnalyticsSession(startedAt)',
  'CREATE INDEX IF NOT EXISTS AnalyticsSession_lastActiveAt_idx ON AnalyticsSession(lastActiveAt)',
  'CREATE INDEX IF NOT EXISTS PageView_sessionId_idx ON PageView(sessionId)',
  'CREATE INDEX IF NOT EXISTS PageView_page_idx ON PageView(page)',
  'CREATE INDEX IF NOT EXISTS EventLog_createdAt_idx ON EventLog(createdAt)',
  'CREATE INDEX IF NOT EXISTS EventLog_eventType_createdAt_idx ON EventLog(eventType, createdAt)',
  'CREATE INDEX IF NOT EXISTS EventLog_sessionId_idx ON EventLog(sessionId)',
  'CREATE INDEX IF NOT EXISTS Patient_phoneFingerprint_idx ON Patient(phoneFingerprint)',
  'CREATE INDEX IF NOT EXISTS Patient_lastSeenAt_idx ON Patient(lastSeenAt)',
  patientExternalIdentifierTableStatement,
  'CREATE UNIQUE INDEX IF NOT EXISTS PatientExternalIdentifier_globalFingerprint_unique ON PatientExternalIdentifier(globalFingerprint)',
  'CREATE UNIQUE INDEX IF NOT EXISTS PatientExternalIdentifier_patientId_identityKey_unique ON PatientExternalIdentifier(patientId, identityKey)',
  'CREATE INDEX IF NOT EXISTS PatientExternalIdentifier_fingerprint_idx ON PatientExternalIdentifier(fingerprint)',
  'CREATE INDEX IF NOT EXISTS PatientExternalIdentifier_patientId_idx ON PatientExternalIdentifier(patientId)',
  patientContactTableStatement,
  'CREATE UNIQUE INDEX IF NOT EXISTS PatientContact_patientId_kind_fingerprint_unique ON PatientContact(patientId, kind, fingerprint)',
  'CREATE INDEX IF NOT EXISTS PatientContact_fingerprint_idx ON PatientContact(fingerprint)',
  'CREATE INDEX IF NOT EXISTS PatientContact_patientId_idx ON PatientContact(patientId)',
  patientNameHistoryTableStatement,
  'CREATE UNIQUE INDEX IF NOT EXISTS PatientNameHistory_patientId_lastNameFingerprint_unique ON PatientNameHistory(patientId, lastNameFingerprint)',
  'CREATE INDEX IF NOT EXISTS PatientNameHistory_patientId_idx ON PatientNameHistory(patientId)',
  patientPrivateDataTableStatement,
  'CREATE UNIQUE INDEX IF NOT EXISTS PatientPrivateData_patientId_unique ON PatientPrivateData(patientId)',
  patientConsentTableStatement,
  'CREATE UNIQUE INDEX IF NOT EXISTS PatientConsent_patientId_type_unique ON PatientConsent(patientId, type)',
  patientAttachmentTableStatement,
  'CREATE INDEX IF NOT EXISTS PatientAttachment_patientId_createdAt_idx ON PatientAttachment(patientId, createdAt)',
  importBatchTableStatement,
  'CREATE UNIQUE INDEX IF NOT EXISTS ImportBatch_manifestHash_unique ON ImportBatch(manifestHash)',
  'CREATE INDEX IF NOT EXISTS ImportBatch_status_createdAt_idx ON ImportBatch(status, createdAt)',
  importSourceRowTableStatement,
  'CREATE UNIQUE INDEX IF NOT EXISTS ImportSourceRow_batchId_sourceName_sourceRow_unique ON ImportSourceRow(batchId, sourceName, sourceRow)',
  'CREATE INDEX IF NOT EXISTS ImportSourceRow_patientId_idx ON ImportSourceRow(patientId)',
  'CREATE INDEX IF NOT EXISTS ImportSourceRow_historicalVisitId_idx ON ImportSourceRow(historicalVisitId)',
  importIssueTableStatement,
  'CREATE INDEX IF NOT EXISTS ImportIssue_batchId_code_idx ON ImportIssue(batchId, code)',
  'CREATE INDEX IF NOT EXISTS ImportIssue_patientId_idx ON ImportIssue(patientId)',
  'CREATE INDEX IF NOT EXISTS ImportIssue_historicalVisitId_idx ON ImportIssue(historicalVisitId)',
  historicalVisitTableStatement,
  'CREATE UNIQUE INDEX IF NOT EXISTS HistoricalVisit_batchId_sourceName_sourceRow_unique ON HistoricalVisit(batchId, sourceName, sourceRow)',
  'CREATE INDEX IF NOT EXISTS HistoricalVisit_appointmentIdFingerprint_idx ON HistoricalVisit(appointmentIdFingerprint)',
  'CREATE INDEX IF NOT EXISTS HistoricalVisit_patientId_startsAt_idx ON HistoricalVisit(patientId, startsAt)',
  'CREATE INDEX IF NOT EXISTS HistoricalVisit_linkStatus_startsAt_idx ON HistoricalVisit(linkStatus, startsAt)',
  historicalVisitCandidateTableStatement,
  'CREATE UNIQUE INDEX IF NOT EXISTS HistoricalVisitCandidate_visitId_patientId_unique ON HistoricalVisitCandidate(historicalVisitId, patientId)',
  'CREATE INDEX IF NOT EXISTS HistoricalVisitCandidate_patientId_idx ON HistoricalVisitCandidate(patientId)',
  historicalInvoiceTableStatement,
  'CREATE UNIQUE INDEX IF NOT EXISTS HistoricalInvoice_batchId_sourceName_sourceRow_unique ON HistoricalInvoice(batchId, sourceName, sourceRow)',
  'CREATE INDEX IF NOT EXISTS HistoricalInvoice_historicalVisitId_idx ON HistoricalInvoice(historicalVisitId)',
  patientAccessTableStatement,
  'CREATE INDEX IF NOT EXISTS PatientAccess_patientId_createdAt_idx ON PatientAccess(patientId, createdAt)',
  appointmentTableStatement,
  'CREATE UNIQUE INDEX IF NOT EXISTS Appointment_medflexClaimId_unique ON Appointment(medflexClaimId)',
  'DROP INDEX IF EXISTS Appointment_bookingFingerprint_unique',
  "CREATE UNIQUE INDEX IF NOT EXISTS Appointment_bookingFingerprint_active_unique ON Appointment(bookingFingerprint) WHERE status IN ('pending', 'confirmed', 'needs_review')",
  'CREATE INDEX IF NOT EXISTS Appointment_startsAt_idx ON Appointment(startsAt)',
  'CREATE INDEX IF NOT EXISTS Appointment_patientId_startsAt_idx ON Appointment(patientId, startsAt)',
  'CREATE INDEX IF NOT EXISTS Appointment_status_startsAt_idx ON Appointment(status, startsAt)',
  'CREATE INDEX IF NOT EXISTS Appointment_medflexDoctorId_startsAt_idx ON Appointment(medflexDoctorId, startsAt)',
  'CREATE INDEX IF NOT EXISTS Appointment_source_startsAt_idx ON Appointment(source, startsAt)',
  medflexDoctorLinkTableStatement,
  'CREATE INDEX IF NOT EXISTS MedflexDoctorLink_localDoctorId_idx ON MedflexDoctorLink(localDoctorId)',
  'CREATE INDEX IF NOT EXISTS MedflexDoctorLink_active_idx ON MedflexDoctorLink(active)',
  mangoCallTableStatement,
  'CREATE INDEX IF NOT EXISTS MangoCall_startedAt_idx ON MangoCall(startedAt)',
  'CREATE INDEX IF NOT EXISTS MangoCall_status_startedAt_idx ON MangoCall(status, startedAt)',
  'CREATE INDEX IF NOT EXISTS MangoCall_patientId_startedAt_idx ON MangoCall(patientId, startedAt)',
  'CREATE INDEX IF NOT EXISTS MangoCall_callerFingerprint_startedAt_idx ON MangoCall(callerFingerprint, startedAt)',
  'CREATE INDEX IF NOT EXISTS MangoCall_lineNumber_startedAt_idx ON MangoCall(lineNumber, startedAt)',
  'CREATE INDEX IF NOT EXISTS MangoCall_operatorExtension_startedAt_idx ON MangoCall(operatorExtension, startedAt)',
  mangoCallLegTableStatement,
  'CREATE INDEX IF NOT EXISTS MangoCallLeg_entryId_idx ON MangoCallLeg(entryId)',
  'CREATE INDEX IF NOT EXISTS MangoCallLeg_state_eventAt_idx ON MangoCallLeg(state, eventAt)',
  'CREATE INDEX IF NOT EXISTS MangoCallLeg_extension_eventAt_idx ON MangoCallLeg(extension, eventAt)',
  mangoCallAccessTableStatement,
  mangoCallIssueTableStatement,
  adminSessionTableStatement,
  adminUserTableStatement,
  adminAuthEventTableStatement,
  'CREATE INDEX IF NOT EXISTS MangoCallAccess_entryId_createdAt_idx ON MangoCallAccess(entryId, createdAt)',

  'CREATE INDEX IF NOT EXISTS MangoCallIssue_createdAt_idx ON MangoCallIssue(createdAt)',
  'CREATE INDEX IF NOT EXISTS AdminSession_lastSeenAt_idx ON AdminSession(lastSeenAt)',
  'CREATE UNIQUE INDEX IF NOT EXISTS AdminUser_login_unique ON AdminUser(login)',
  'CREATE INDEX IF NOT EXISTS AdminAuthEvent_ip_kind_createdAt_idx ON AdminAuthEvent(ip, kind, createdAt)',
  'CREATE INDEX IF NOT EXISTS AdminAuthEvent_createdAt_idx ON AdminAuthEvent(createdAt)',
]

const bookingIntentColumns = [
  ['id', 'TEXT', 0, null, 1],
  ['requestFingerprint', 'TEXT', 1, null, 0],
  ['status', 'TEXT', 1, null, 0],
  ['fencingToken', 'TEXT', 0, null, 0],
  ['doctorSlug', 'TEXT', 1, null, 0],
  ['appointmentType', 'TEXT', 1, null, 0],
  ['doctorId', 'INTEGER', 1, null, 0],
  ['lpuId', 'INTEGER', 1, null, 0],
  ['specialityId', 'INTEGER', 1, null, 0],
  ['startsAt', 'TEXT', 1, null, 0],
  ['endsAt', 'TEXT', 1, null, 0],
  ['price', 'INTEGER', 1, null, 0],
  ['medflexClaimId', 'TEXT', 0, null, 0],
  ['failureCode', 'TEXT', 0, null, 0],
  ['createdAt', 'TEXT', 1, null, 0],
  ['updatedAt', 'TEXT', 1, null, 0],
  ['pendingUntil', 'TEXT', 1, null, 0],
]
const bookingIntentIndexes = [
  { name: 'BookingIntent_fencingToken_unique', unique: 1, origin: 'c', partial: 0, columns: ['fencingToken'], collations: ['BINARY'], descending: [0] },
  { name: 'BookingIntent_medflexClaimId_unique', unique: 1, origin: 'c', partial: 0, columns: ['medflexClaimId'], collations: ['BINARY'], descending: [0] },
  { name: 'BookingIntent_requestFingerprint_unique', unique: 1, origin: 'c', partial: 0, columns: ['requestFingerprint'], collations: ['BINARY'], descending: [0] },
  { name: 'BookingIntent_resumeScope_idx', unique: 0, origin: 'c', partial: 0, columns: ['doctorSlug', 'appointmentType', 'startsAt', 'endsAt'], collations: ['BINARY', 'BINARY', 'BINARY', 'BINARY'], descending: [0, 0, 0, 0] },
  { name: 'BookingIntent_status_pendingUntil_idx', unique: 0, origin: 'c', partial: 0, columns: ['status', 'pendingUntil'], collations: ['BINARY', 'BINARY'], descending: [0, 0] },
  { name: 'sqlite_autoindex_BookingIntent_1', unique: 1, origin: 'pk', partial: 0, columns: ['id'], collations: ['BINARY'], descending: [0] },
]
const patientColumns = [
  ['id', 'TEXT', 0, null, 1],
  ['profileCiphertext', 'TEXT', 0, null, 0],
  ['phoneMask', 'TEXT', 0, null, 0],
  ['phoneFingerprint', 'TEXT', 0, null, 0],
  ['firstSeenAt', 'TEXT', 0, null, 0],
  ['lastSeenAt', 'TEXT', 0, null, 0],
  ['createdAt', 'TEXT', 1, null, 0],
  ['updatedAt', 'TEXT', 1, null, 0],
  ['piiDestroyedAt', 'TEXT', 0, null, 0],
]
const previousPatientColumns = patientColumns.map((column) => ['firstSeenAt', 'lastSeenAt'].includes(column[0]) ? [column[0], column[1], 1, column[3], column[4]] : column)
const patientIndexes = [
  { name: 'Patient_lastSeenAt_idx', unique: 0, origin: 'c', partial: 0, columns: ['lastSeenAt'], collations: ['BINARY'], descending: [0] },
  { name: 'Patient_phoneFingerprint_idx', unique: 0, origin: 'c', partial: 0, columns: ['phoneFingerprint'], collations: ['BINARY'], descending: [0] },
  { name: 'sqlite_autoindex_Patient_1', unique: 1, origin: 'pk', partial: 0, columns: ['id'], collations: ['BINARY'], descending: [0] },
]
const legacyPatientIndexes = [
  { name: 'Patient_lastSeenAt_idx', unique: 0, origin: 'c', partial: 0, columns: ['lastSeenAt'], collations: ['BINARY'], descending: [0] },
  { name: 'Patient_phoneFingerprint_unique', unique: 1, origin: 'c', partial: 0, columns: ['phoneFingerprint'], collations: ['BINARY'], descending: [0] },
  { name: 'sqlite_autoindex_Patient_1', unique: 1, origin: 'pk', partial: 0, columns: ['id'], collations: ['BINARY'], descending: [0] },
]

function indexContract(name, columns, unique = 0) {
  return { name, unique, origin: 'c', partial: 0, columns, collations: columns.map(() => 'BINARY'), descending: columns.map(() => 0) }
}

function tableIndexes(tableName, indexes) {
  return [...indexes, { name: `sqlite_autoindex_${tableName}_1`, unique: 1, origin: 'pk', partial: 0, columns: ['id'], collations: ['BINARY'], descending: [0] }].sort((first, second) => first.name < second.name ? -1 : first.name > second.name ? 1 : 0)
}

const patientExternalIdentifierColumns = [
  ['id', 'TEXT', 0, null, 1],
  ['patientId', 'TEXT', 1, null, 0],
  ['system', 'TEXT', 1, null, 0],
  ['ciphertext', 'TEXT', 0, null, 0],
  ['fingerprint', 'TEXT', 0, null, 0],
  ['globalFingerprint', 'TEXT', 0, null, 0],
  ['identityKey', 'TEXT', 1, null, 0],
  ['sourceName', 'TEXT', 1, null, 0],
  ['sourceRow', 'INTEGER', 1, null, 0],
  ['isPrimary', 'INTEGER', 1, null, 0],
  ['createdAt', 'TEXT', 1, null, 0],
  ['updatedAt', 'TEXT', 1, null, 0],
]
const patientExternalIdentifierIndexes = tableIndexes('PatientExternalIdentifier', [
  indexContract('PatientExternalIdentifier_globalFingerprint_unique', ['globalFingerprint'], 1),
  indexContract('PatientExternalIdentifier_patientId_identityKey_unique', ['patientId', 'identityKey'], 1),
  indexContract('PatientExternalIdentifier_fingerprint_idx', ['fingerprint']),
  indexContract('PatientExternalIdentifier_patientId_idx', ['patientId']),
])
const patientContactColumns = [
  ['id', 'TEXT', 0, null, 1],
  ['patientId', 'TEXT', 1, null, 0],
  ['kind', 'TEXT', 1, null, 0],
  ['ciphertext', 'TEXT', 0, null, 0],
  ['fingerprint', 'TEXT', 0, null, 0],
  ['mask', 'TEXT', 0, null, 0],
  ['isPrimary', 'INTEGER', 1, null, 0],
  ['sourceName', 'TEXT', 1, null, 0],
  ['firstSeenAt', 'TEXT', 0, null, 0],
  ['lastSeenAt', 'TEXT', 0, null, 0],
  ['piiDestroyedAt', 'TEXT', 0, null, 0],
]
const patientContactIndexes = tableIndexes('PatientContact', [
  indexContract('PatientContact_patientId_kind_fingerprint_unique', ['patientId', 'kind', 'fingerprint'], 1),
  indexContract('PatientContact_fingerprint_idx', ['fingerprint']),
  indexContract('PatientContact_patientId_idx', ['patientId']),
])
const patientNameHistoryColumns = [
  ['id', 'TEXT', 0, null, 1],
  ['patientId', 'TEXT', 1, null, 0],
  ['lastNameCiphertext', 'TEXT', 0, null, 0],
  ['lastNameFingerprint', 'TEXT', 0, null, 0],
  ['sourceName', 'TEXT', 1, null, 0],
  ['sourceIdentifierCiphertext', 'TEXT', 0, null, 0],
  ['observedAt', 'TEXT', 0, null, 0],
  ['reason', 'TEXT', 1, null, 0],
  ['piiDestroyedAt', 'TEXT', 0, null, 0],
]
const patientNameHistoryIndexes = tableIndexes('PatientNameHistory', [
  indexContract('PatientNameHistory_patientId_lastNameFingerprint_unique', ['patientId', 'lastNameFingerprint'], 1),
  indexContract('PatientNameHistory_patientId_idx', ['patientId']),
])
const patientPrivateDataColumns = [
  ['id', 'TEXT', 0, null, 1],
  ['patientId', 'TEXT', 1, null, 0],
  ['profileCiphertext', 'TEXT', 0, null, 0],
  ['createdAt', 'TEXT', 1, null, 0],
  ['updatedAt', 'TEXT', 1, null, 0],
  ['piiDestroyedAt', 'TEXT', 0, null, 0],
]
const patientPrivateDataIndexes = tableIndexes('PatientPrivateData', [
  indexContract('PatientPrivateData_patientId_unique', ['patientId'], 1),
])
const patientConsentColumns = [
  ['id', 'TEXT', 0, null, 1],
  ['patientId', 'TEXT', 1, null, 0],
  ['type', 'TEXT', 1, null, 0],
  ['status', 'TEXT', 1, null, 0],
  ['sourceName', 'TEXT', 1, null, 0],
  ['observedAt', 'TEXT', 0, null, 0],
  ['createdAt', 'TEXT', 1, null, 0],
  ['updatedAt', 'TEXT', 1, null, 0],
]
const patientConsentIndexes = tableIndexes('PatientConsent', [
  indexContract('PatientConsent_patientId_type_unique', ['patientId', 'type'], 1),
])
const patientAttachmentColumns = [
  ['id', 'TEXT', 0, null, 1],
  ['patientId', 'TEXT', 1, null, 0],
  ['kind', 'TEXT', 1, null, 0],
  ['urlCiphertext', 'TEXT', 0, null, 0],
  ['metadataCiphertext', 'TEXT', 0, null, 0],
  ['sourceName', 'TEXT', 1, null, 0],
  ['createdAt', 'TEXT', 1, null, 0],
  ['deletedAt', 'TEXT', 0, null, 0],
  ['piiDestroyedAt', 'TEXT', 0, null, 0],
]
const patientAttachmentIndexes = tableIndexes('PatientAttachment', [
  indexContract('PatientAttachment_patientId_createdAt_idx', ['patientId', 'createdAt']),
])
const importBatchColumns = [
  ['id', 'TEXT', 0, null, 1],
  ['manifestHash', 'TEXT', 1, null, 0],
  ['planHash', 'TEXT', 1, null, 0],
  ['mode', 'TEXT', 1, null, 0],
  ['status', 'TEXT', 1, null, 0],
  ['controlTotals', 'TEXT', 1, null, 0],
  ['createdAt', 'TEXT', 1, null, 0],
  ['completedAt', 'TEXT', 0, null, 0],
]
const importBatchIndexes = tableIndexes('ImportBatch', [
  indexContract('ImportBatch_manifestHash_unique', ['manifestHash'], 1),
  indexContract('ImportBatch_status_createdAt_idx', ['status', 'createdAt']),
])
const importSourceRowColumns = [
  ['id', 'TEXT', 0, null, 1],
  ['batchId', 'TEXT', 1, null, 0],
  ['sourceName', 'TEXT', 1, null, 0],
  ['sourceRow', 'INTEGER', 1, null, 0],
  ['patientId', 'TEXT', 0, null, 0],
  ['historicalVisitId', 'TEXT', 0, null, 0],
  ['payloadCiphertext', 'TEXT', 0, null, 0],
  ['payloadHash', 'TEXT', 1, null, 0],
  ['createdAt', 'TEXT', 1, null, 0],
  ['piiDestroyedAt', 'TEXT', 0, null, 0],
]
const importSourceRowIndexes = tableIndexes('ImportSourceRow', [
  indexContract('ImportSourceRow_batchId_sourceName_sourceRow_unique', ['batchId', 'sourceName', 'sourceRow'], 1),
  indexContract('ImportSourceRow_patientId_idx', ['patientId']),
  indexContract('ImportSourceRow_historicalVisitId_idx', ['historicalVisitId']),
])
const importIssueColumns = [
  ['id', 'TEXT', 0, null, 1],
  ['batchId', 'TEXT', 1, null, 0],
  ['sourceName', 'TEXT', 1, null, 0],
  ['sourceRow', 'INTEGER', 1, null, 0],
  ['code', 'TEXT', 1, null, 0],
  ['patientId', 'TEXT', 0, null, 0],
  ['historicalVisitId', 'TEXT', 0, null, 0],
  ['candidatesCiphertext', 'TEXT', 0, null, 0],
  ['detailsCiphertext', 'TEXT', 0, null, 0],
  ['createdAt', 'TEXT', 1, null, 0],
  ['resolvedAt', 'TEXT', 0, null, 0],
]
const importIssueIndexes = tableIndexes('ImportIssue', [
  indexContract('ImportIssue_batchId_code_idx', ['batchId', 'code']),
  indexContract('ImportIssue_patientId_idx', ['patientId']),
  indexContract('ImportIssue_historicalVisitId_idx', ['historicalVisitId']),
])
const historicalVisitColumns = [
  ['id', 'TEXT', 0, null, 1],
  ['batchId', 'TEXT', 1, null, 0],
  ['sourceName', 'TEXT', 1, null, 0],
  ['sourceRow', 'INTEGER', 1, null, 0],
  ['patientId', 'TEXT', 0, null, 0],
  ['appointmentIdCiphertext', 'TEXT', 0, null, 0],
  ['appointmentIdFingerprint', 'TEXT', 0, null, 0],
  ['startsAt', 'TEXT', 0, null, 0],
  ['endsAt', 'TEXT', 0, null, 0],
  ['sourceStatus', 'TEXT', 1, null, 0],
  ['doctorCiphertext', 'TEXT', 0, null, 0],
  ['detailsCiphertext', 'TEXT', 0, null, 0],
  ['linkStatus', 'TEXT', 1, null, 0],
  ['linkMethod', 'TEXT', 0, null, 0],
  ['evidenceLevel', 'TEXT', 0, null, 0],
  ['createdAt', 'TEXT', 1, null, 0],
  ['piiDestroyedAt', 'TEXT', 0, null, 0],
]
const historicalVisitIndexes = tableIndexes('HistoricalVisit', [
  indexContract('HistoricalVisit_batchId_sourceName_sourceRow_unique', ['batchId', 'sourceName', 'sourceRow'], 1),
  indexContract('HistoricalVisit_appointmentIdFingerprint_idx', ['appointmentIdFingerprint']),
  indexContract('HistoricalVisit_patientId_startsAt_idx', ['patientId', 'startsAt']),
  indexContract('HistoricalVisit_linkStatus_startsAt_idx', ['linkStatus', 'startsAt']),
])
const historicalVisitCandidateColumns = [
  ['id', 'TEXT', 0, null, 1],
  ['historicalVisitId', 'TEXT', 1, null, 0],
  ['patientId', 'TEXT', 1, null, 0],
  ['evidenceCode', 'TEXT', 1, null, 0],
  ['score', 'INTEGER', 1, null, 0],
  ['createdAt', 'TEXT', 1, null, 0],
]
const historicalVisitCandidateIndexes = tableIndexes('HistoricalVisitCandidate', [
  indexContract('HistoricalVisitCandidate_visitId_patientId_unique', ['historicalVisitId', 'patientId'], 1),
  indexContract('HistoricalVisitCandidate_patientId_idx', ['patientId']),
])
const historicalInvoiceColumns = [
  ['id', 'TEXT', 0, null, 1],
  ['batchId', 'TEXT', 1, null, 0],
  ['sourceName', 'TEXT', 1, null, 0],
  ['sourceRow', 'INTEGER', 1, null, 0],
  ['historicalVisitId', 'TEXT', 0, null, 0],
  ['payloadCiphertext', 'TEXT', 0, null, 0],
  ['sourceStatus', 'TEXT', 1, null, 0],
  ['createdAt', 'TEXT', 1, null, 0],
  ['piiDestroyedAt', 'TEXT', 0, null, 0],
]
const historicalInvoiceIndexes = tableIndexes('HistoricalInvoice', [
  indexContract('HistoricalInvoice_batchId_sourceName_sourceRow_unique', ['batchId', 'sourceName', 'sourceRow'], 1),
  indexContract('HistoricalInvoice_historicalVisitId_idx', ['historicalVisitId']),
])
const patientAccessColumns = [
  ['id', 'TEXT', 0, null, 1],
  ['patientId', 'TEXT', 1, null, 0],
  ['action', 'TEXT', 1, null, 0],
  ['actor', 'TEXT', 1, null, 0],
  ['createdAt', 'TEXT', 1, null, 0],
  ['reason', 'TEXT', 0, null, 0],
]
const patientAccessIndexes = [
  { name: 'PatientAccess_patientId_createdAt_idx', unique: 0, origin: 'c', partial: 0, columns: ['patientId', 'createdAt'], collations: ['BINARY', 'BINARY'], descending: [0, 0] },
  { name: 'sqlite_autoindex_PatientAccess_1', unique: 1, origin: 'pk', partial: 0, columns: ['id'], collations: ['BINARY'], descending: [0] },
]
const appointmentColumns = [
  ['id', 'TEXT', 0, null, 1],
  ['patientId', 'TEXT', 1, null, 0],
  ['source', 'TEXT', 1, null, 0],
  ['status', 'TEXT', 1, null, 0],
  ['medflexClaimId', 'TEXT', 0, null, 0],
  ['medflexLpuId', 'INTEGER', 0, null, 0],
  ['medflexDoctorId', 'INTEGER', 0, null, 0],
  ['medflexSpecialityId', 'INTEGER', 0, null, 0],
  ['medflexServiceId', 'INTEGER', 0, null, 0],
  ['doctorName', 'TEXT', 1, null, 0],
  ['specialityName', 'TEXT', 1, null, 0],
  ['serviceName', 'TEXT', 0, null, 0],
  ['startsAt', 'TEXT', 1, null, 0],
  ['endsAt', 'TEXT', 1, null, 0],
  ['priceKopecks', 'INTEGER', 0, null, 0],
  ['bookingFingerprint', 'TEXT', 1, null, 0],
  ['failureCode', 'TEXT', 0, null, 0],
  ['createdAt', 'TEXT', 1, null, 0],
  ['updatedAt', 'TEXT', 1, null, 0],
  ['cancelledAt', 'TEXT', 0, null, 0],
]
const appointmentIndexes = [
  { name: 'Appointment_bookingFingerprint_active_unique', unique: 1, origin: 'c', partial: 1, columns: ['bookingFingerprint'], collations: ['BINARY'], descending: [0] },
  { name: 'Appointment_medflexClaimId_unique', unique: 1, origin: 'c', partial: 0, columns: ['medflexClaimId'], collations: ['BINARY'], descending: [0] },
  { name: 'Appointment_medflexDoctorId_startsAt_idx', unique: 0, origin: 'c', partial: 0, columns: ['medflexDoctorId', 'startsAt'], collations: ['BINARY', 'BINARY'], descending: [0, 0] },
  { name: 'Appointment_patientId_startsAt_idx', unique: 0, origin: 'c', partial: 0, columns: ['patientId', 'startsAt'], collations: ['BINARY', 'BINARY'], descending: [0, 0] },
  { name: 'Appointment_source_startsAt_idx', unique: 0, origin: 'c', partial: 0, columns: ['source', 'startsAt'], collations: ['BINARY', 'BINARY'], descending: [0, 0] },
  { name: 'Appointment_startsAt_idx', unique: 0, origin: 'c', partial: 0, columns: ['startsAt'], collations: ['BINARY'], descending: [0] },
  { name: 'Appointment_status_startsAt_idx', unique: 0, origin: 'c', partial: 0, columns: ['status', 'startsAt'], collations: ['BINARY', 'BINARY'], descending: [0, 0] },
  { name: 'sqlite_autoindex_Appointment_1', unique: 1, origin: 'pk', partial: 0, columns: ['id'], collations: ['BINARY'], descending: [0] },
]
const medflexDoctorLinkColumns = [
  ['medflexDoctorId', 'INTEGER', 0, null, 1],
  ['externalName', 'TEXT', 1, null, 0],
  ['localDoctorId', 'TEXT', 0, null, 0],
  ['active', 'INTEGER', 1, null, 0],
  ['syncedAt', 'TEXT', 1, null, 0],
]
const medflexDoctorLinkIndexes = [
  { name: 'MedflexDoctorLink_active_idx', unique: 0, origin: 'c', partial: 0, columns: ['active'], collations: ['BINARY'], descending: [0] },
  { name: 'MedflexDoctorLink_localDoctorId_idx', unique: 0, origin: 'c', partial: 0, columns: ['localDoctorId'], collations: ['BINARY'], descending: [0] },
]
const mangoCallColumns = [
  ['entryId', 'TEXT', 0, null, 1],
  ['patientId', 'TEXT', 0, null, 0],
  ['status', 'TEXT', 1, null, 0],
  ['callerCiphertext', 'TEXT', 0, null, 0],
  ['callerMask', 'TEXT', 0, null, 0],
  ['callerFingerprint', 'TEXT', 0, null, 0],
  ['repeatCaller', 'INTEGER', 0, null, 0],
  ['lineNumber', 'TEXT', 1, null, 0],
  ['operatorExtension', 'TEXT', 0, null, 0],
  ['startedAt', 'TEXT', 1, null, 0],
  ['forwardedAt', 'TEXT', 0, null, 0],
  ['answeredAt', 'TEXT', 0, null, 0],
  ['endedAt', 'TEXT', 0, null, 0],
  ['waitSeconds', 'INTEGER', 0, null, 0],
  ['talkSeconds', 'INTEGER', 0, null, 0],
  ['disconnectReason', 'TEXT', 0, null, 0],
  ['finalizedAt', 'TEXT', 0, null, 0],
  ['createdAt', 'TEXT', 1, null, 0],
  ['updatedAt', 'TEXT', 1, null, 0],
  ['piiDestroyedAt', 'TEXT', 0, null, 0],
]
const mangoCallIndexes = [
  { name: 'MangoCall_callerFingerprint_startedAt_idx', unique: 0, origin: 'c', partial: 0, columns: ['callerFingerprint', 'startedAt'], collations: ['BINARY', 'BINARY'], descending: [0, 0] },
  { name: 'MangoCall_lineNumber_startedAt_idx', unique: 0, origin: 'c', partial: 0, columns: ['lineNumber', 'startedAt'], collations: ['BINARY', 'BINARY'], descending: [0, 0] },
  { name: 'MangoCall_operatorExtension_startedAt_idx', unique: 0, origin: 'c', partial: 0, columns: ['operatorExtension', 'startedAt'], collations: ['BINARY', 'BINARY'], descending: [0, 0] },
  { name: 'MangoCall_patientId_startedAt_idx', unique: 0, origin: 'c', partial: 0, columns: ['patientId', 'startedAt'], collations: ['BINARY', 'BINARY'], descending: [0, 0] },
  { name: 'MangoCall_startedAt_idx', unique: 0, origin: 'c', partial: 0, columns: ['startedAt'], collations: ['BINARY'], descending: [0] },
  { name: 'MangoCall_status_startedAt_idx', unique: 0, origin: 'c', partial: 0, columns: ['status', 'startedAt'], collations: ['BINARY', 'BINARY'], descending: [0, 0] },
  { name: 'sqlite_autoindex_MangoCall_1', unique: 1, origin: 'pk', partial: 0, columns: ['entryId'], collations: ['BINARY'], descending: [0] },
]
const mangoCallLegColumns = [
  ['callId', 'TEXT', 0, null, 1],
  ['entryId', 'TEXT', 1, null, 0],
  ['maxSeq', 'INTEGER', 1, null, 0],
  ['state', 'TEXT', 1, null, 0],
  ['location', 'TEXT', 0, null, 0],
  ['extension', 'TEXT', 0, null, 0],
  ['eventAt', 'TEXT', 1, null, 0],
  ['createdAt', 'TEXT', 1, null, 0],
  ['updatedAt', 'TEXT', 1, null, 0],
]
const mangoCallLegIndexes = [
  { name: 'MangoCallLeg_entryId_idx', unique: 0, origin: 'c', partial: 0, columns: ['entryId'], collations: ['BINARY'], descending: [0] },
  { name: 'MangoCallLeg_extension_eventAt_idx', unique: 0, origin: 'c', partial: 0, columns: ['extension', 'eventAt'], collations: ['BINARY', 'BINARY'], descending: [0, 0] },
  { name: 'MangoCallLeg_state_eventAt_idx', unique: 0, origin: 'c', partial: 0, columns: ['state', 'eventAt'], collations: ['BINARY', 'BINARY'], descending: [0, 0] },
  { name: 'sqlite_autoindex_MangoCallLeg_1', unique: 1, origin: 'pk', partial: 0, columns: ['callId'], collations: ['BINARY'], descending: [0] },
]
const mangoCallAccessColumns = [
  ['id', 'TEXT', 0, null, 1],
  ['entryId', 'TEXT', 1, null, 0],
  ['action', 'TEXT', 1, null, 0],
  ['actor', 'TEXT', 1, null, 0],
  ['createdAt', 'TEXT', 1, null, 0],
]
const mangoCallAccessIndexes = [
  { name: 'MangoCallAccess_entryId_createdAt_idx', unique: 0, origin: 'c', partial: 0, columns: ['entryId', 'createdAt'], collations: ['BINARY', 'BINARY'], descending: [0, 0] },
  { name: 'sqlite_autoindex_MangoCallAccess_1', unique: 1, origin: 'pk', partial: 0, columns: ['id'], collations: ['BINARY'], descending: [0] },
]

function canonicalSchemaSql(value) {
  if (typeof value !== 'string') return ''
  return value.replaceAll('"', '').replaceAll('`', '').replaceAll('[', '').replaceAll(']', '').replace(/\bIF\s+NOT\s+EXISTS\b/gi, '').replace(/\s+/g, ' ').replace(/\s*([(),])\s*/g, '$1').trim().toUpperCase()
}

const mangoCallIssueColumns = [
  ['id', 'TEXT', 0, null, 1],
  ['code', 'TEXT', 1, null, 0],
  ['entryId', 'TEXT', 0, null, 0],
  ['createdAt', 'TEXT', 1, null, 0],
]
const mangoCallIssueIndexes = [
  { name: 'MangoCallIssue_createdAt_idx', unique: 0, origin: 'c', partial: 0, columns: ['createdAt'], collations: ['BINARY'], descending: [0] },
  { name: 'sqlite_autoindex_MangoCallIssue_1', unique: 1, origin: 'pk', partial: 0, columns: ['id'], collations: ['BINARY'], descending: [0] },
]
const adminSessionColumns = [
  ['id', 'TEXT', 0, null, 1],
  ['issuedAt', 'TEXT', 1, null, 0],
  ['lastSeenAt', 'TEXT', 1, null, 0],
  ['revokedAt', 'TEXT', 0, null, 0],
  ['userId', 'TEXT', 0, null, 0],
]
const adminSessionIndexes = [
  { name: 'AdminSession_lastSeenAt_idx', unique: 0, origin: 'c', partial: 0, columns: ['lastSeenAt'], collations: ['BINARY'], descending: [0] },
  { name: 'AdminSession_userId_idx', unique: 0, origin: 'c', partial: 0, columns: ['userId'], collations: ['BINARY'], descending: [0] },
  { name: 'sqlite_autoindex_AdminSession_1', unique: 1, origin: 'pk', partial: 0, columns: ['id'], collations: ['BINARY'], descending: [0] },
]
const adminUserColumns = [
  ['id', 'TEXT', 0, null, 1],
  ['login', 'TEXT', 1, null, 0],
  ['displayName', 'TEXT', 1, null, 0],
  ['role', 'TEXT', 1, null, 0],
  ['passwordHash', 'TEXT', 1, null, 0],
  ['createdAt', 'TEXT', 1, null, 0],
  ['disabledAt', 'TEXT', 0, null, 0],
  ['passwordChangedAt', 'TEXT', 1, null, 0],
]
const adminUserIndexes = [
  { name: 'AdminUser_login_unique', unique: 1, origin: 'c', partial: 0, columns: ['login'], collations: ['BINARY'], descending: [0] },
  { name: 'sqlite_autoindex_AdminUser_1', unique: 1, origin: 'pk', partial: 0, columns: ['id'], collations: ['BINARY'], descending: [0] },
]
const adminAuthEventColumns = [
  ['id', 'TEXT', 0, null, 1],
  ['kind', 'TEXT', 1, null, 0],
  ['actor', 'TEXT', 0, null, 0],
  ['ip', 'TEXT', 0, null, 0],
  ['userAgentHash', 'TEXT', 0, null, 0],
  ['createdAt', 'TEXT', 1, null, 0],
]
const adminAuthEventIndexes = [
  { name: 'AdminAuthEvent_createdAt_idx', unique: 0, origin: 'c', partial: 0, columns: ['createdAt'], collations: ['BINARY'], descending: [0] },
  { name: 'AdminAuthEvent_ip_kind_createdAt_idx', unique: 0, origin: 'c', partial: 0, columns: ['ip', 'kind', 'createdAt'], collations: ['BINARY', 'BINARY', 'BINARY'], descending: [0, 0, 0] },
  { name: 'sqlite_autoindex_AdminAuthEvent_1', unique: 1, origin: 'pk', partial: 0, columns: ['id'], collations: ['BINARY'], descending: [0] },
]

const doctorColumns = [
  ['id', 'TEXT', 0, null, 1],
  ['name', 'TEXT', 1, null, 0],
  ['slug', 'TEXT', 0, null, 0],
  ['specialization', 'TEXT', 1, null, 0],
  ['experienceYears', 'INTEGER', 1, null, 0],
  ['bio', 'TEXT', 1, null, 0],
  ['photoMediaId', 'TEXT', 0, null, 0],
]
const mediaColumns = [
  ['id', 'TEXT', 0, null, 1],
  ['filename', 'TEXT', 1, null, 0],
  ['mimeType', 'TEXT', 1, null, 0],
  ['url', 'TEXT', 1, null, 0],
  ['folder', 'TEXT', 1, null, 0],
  ['createdAt', 'TEXT', 1, null, 0],
]
const doctorCertificateColumns = [
  ['id', 'TEXT', 0, null, 1],
  ['doctorId', 'TEXT', 1, null, 0],
  ['mediaId', 'TEXT', 1, null, 0],
  ['title', 'TEXT', 0, null, 0],
  ['sortOrder', 'INTEGER', 1, '0', 0],
  ['createdAt', 'TEXT', 1, null, 0],
]
const serviceColumns = [
  ['id', 'TEXT', 0, null, 1],
  ['title', 'TEXT', 1, null, 0],
  ['direction', 'TEXT', 1, null, 0],
  ['description', 'TEXT', 1, null, 0],
  ['price', 'INTEGER', 1, null, 0],
]
const analyticsSessionColumns = [
  ['id', 'TEXT', 0, null, 1],
  ['visitorId', 'TEXT', 1, null, 0],
  ['ip', 'TEXT', 0, null, 0],
  ['userAgent', 'TEXT', 0, null, 0],
  ['currentPage', 'TEXT', 0, null, 0],
  ['referrer', 'TEXT', 0, null, 0],
  ['screenWidth', 'INTEGER', 0, null, 0],
  ['screenHeight', 'INTEGER', 0, null, 0],
  ['language', 'TEXT', 0, null, 0],
  ['startedAt', 'TEXT', 1, null, 0],
  ['lastActiveAt', 'TEXT', 1, null, 0],
]
const analyticsSessionIndexes = [
  { name: 'AnalyticsSession_lastActiveAt_idx', unique: 0, origin: 'c', partial: 0, columns: ['lastActiveAt'], collations: ['BINARY'], descending: [0] },
  { name: 'AnalyticsSession_startedAt_idx', unique: 0, origin: 'c', partial: 0, columns: ['startedAt'], collations: ['BINARY'], descending: [0] },
  { name: 'sqlite_autoindex_AnalyticsSession_1', unique: 1, origin: 'pk', partial: 0, columns: ['id'], collations: ['BINARY'], descending: [0] },
]
const pageViewColumns = [
  ['id', 'TEXT', 0, null, 1],
  ['sessionId', 'TEXT', 1, null, 0],
  ['page', 'TEXT', 1, null, 0],
  ['enteredAt', 'TEXT', 1, null, 0],
  ['duration', 'INTEGER', 0, null, 0],
]
const pageViewIndexes = [
  { name: 'PageView_page_idx', unique: 0, origin: 'c', partial: 0, columns: ['page'], collations: ['BINARY'], descending: [0] },
  { name: 'PageView_sessionId_idx', unique: 0, origin: 'c', partial: 0, columns: ['sessionId'], collations: ['BINARY'], descending: [0] },
  { name: 'sqlite_autoindex_PageView_1', unique: 1, origin: 'pk', partial: 0, columns: ['id'], collations: ['BINARY'], descending: [0] },
]
const eventLogColumns = [
  ['id', 'TEXT', 0, null, 1],
  ['sessionId', 'TEXT', 1, null, 0],
  ['eventType', 'TEXT', 1, null, 0],
  ['page', 'TEXT', 1, null, 0],
  ['target', 'TEXT', 0, null, 0],
  ['details', 'TEXT', 0, null, 0],
  ['createdAt', 'TEXT', 1, null, 0],
]
const eventLogIndexes = [
  { name: 'EventLog_createdAt_idx', unique: 0, origin: 'c', partial: 0, columns: ['createdAt'], collations: ['BINARY'], descending: [0] },
  { name: 'EventLog_eventType_createdAt_idx', unique: 0, origin: 'c', partial: 0, columns: ['eventType', 'createdAt'], collations: ['BINARY', 'BINARY'], descending: [0, 0] },
  { name: 'EventLog_sessionId_idx', unique: 0, origin: 'c', partial: 0, columns: ['sessionId'], collations: ['BINARY'], descending: [0] },
  { name: 'sqlite_autoindex_EventLog_1', unique: 1, origin: 'pk', partial: 0, columns: ['id'], collations: ['BINARY'], descending: [0] },
]
const primaryKeyOnly = (table) => [{ name: `sqlite_autoindex_${table}_1`, unique: 1, origin: 'pk', partial: 0, columns: ['id'], collations: ['BINARY'], descending: [0] }]
/** Column conversions applied while a legacy shape is copied into the canonical table. */
const ISO_DATE = 'date'
const WHOLE_NUMBER = 'integer'

const clinicSchemas = [
  { name: 'BookingIntent', statement: bookingIntentTableStatement, columns: bookingIntentColumns, indexes: bookingIntentIndexes, previous: [bookingIntentTableBase] },
  { name: 'Doctor', statement: doctorTableStatement, columns: doctorColumns, indexes: primaryKeyOnly('Doctor'), previous: [doctorTableBase, ...legacyTableShapes.Doctor], convert: { experienceYears: WHOLE_NUMBER } },
  { name: 'Media', statement: mediaTableStatement, columns: mediaColumns, indexes: primaryKeyOnly('Media'), previous: legacyTableShapes.Media, convert: { createdAt: ISO_DATE } },
  { name: 'DoctorCertificate', statement: doctorCertificateTableStatement, columns: doctorCertificateColumns, indexes: primaryKeyOnly('DoctorCertificate'), previous: [doctorCertificateTableBase, ...legacyTableShapes.DoctorCertificate], convert: { sortOrder: WHOLE_NUMBER, createdAt: ISO_DATE } },
  { name: 'Service', statement: serviceTableStatement, columns: serviceColumns, indexes: primaryKeyOnly('Service'), previous: legacyTableShapes.Service, convert: { price: WHOLE_NUMBER } },
  { name: 'AnalyticsSession', statement: analyticsSessionTableStatement, columns: analyticsSessionColumns, indexes: analyticsSessionIndexes, previous: legacyTableShapes.AnalyticsSession, convert: { screenWidth: WHOLE_NUMBER, screenHeight: WHOLE_NUMBER, startedAt: ISO_DATE, lastActiveAt: ISO_DATE } },
  { name: 'PageView', statement: pageViewTableStatement, columns: pageViewColumns, indexes: pageViewIndexes, previous: [pageViewTableBase, ...legacyTableShapes.PageView], convert: { enteredAt: ISO_DATE, duration: WHOLE_NUMBER } },
  { name: 'EventLog', statement: eventLogTableStatement, columns: eventLogColumns, indexes: eventLogIndexes, previous: [eventLogTableBase, ...legacyTableShapes.EventLog], convert: { createdAt: ISO_DATE } },
  { name: 'Patient', statement: patientTableStatement, columns: patientColumns, indexes: patientIndexes },
  { name: 'PatientExternalIdentifier', statement: patientExternalIdentifierTableStatement, columns: patientExternalIdentifierColumns, indexes: patientExternalIdentifierIndexes , previous: [patientExternalIdentifierTableBase] },
  { name: 'PatientContact', statement: patientContactTableStatement, columns: patientContactColumns, indexes: patientContactIndexes , previous: [patientContactTableBase] },
  { name: 'PatientNameHistory', statement: patientNameHistoryTableStatement, columns: patientNameHistoryColumns, indexes: patientNameHistoryIndexes , previous: [patientNameHistoryTableBase] },
  { name: 'PatientPrivateData', statement: patientPrivateDataTableStatement, columns: patientPrivateDataColumns, indexes: patientPrivateDataIndexes , previous: [patientPrivateDataTableBase] },
  { name: 'PatientConsent', statement: patientConsentTableStatement, columns: patientConsentColumns, indexes: patientConsentIndexes , previous: [patientConsentTableBase] },
  { name: 'PatientAttachment', statement: patientAttachmentTableStatement, columns: patientAttachmentColumns, indexes: patientAttachmentIndexes , previous: [patientAttachmentTableBase] },
  { name: 'ImportBatch', statement: importBatchTableStatement, columns: importBatchColumns, indexes: importBatchIndexes , previous: [importBatchTableBase] },
  { name: 'ImportSourceRow', statement: importSourceRowTableStatement, columns: importSourceRowColumns, indexes: importSourceRowIndexes },
  { name: 'ImportIssue', statement: importIssueTableStatement, columns: importIssueColumns, indexes: importIssueIndexes , previous: [importIssueTableBase] },
  { name: 'HistoricalVisit', statement: historicalVisitTableStatement, columns: historicalVisitColumns, indexes: historicalVisitIndexes , previous: [historicalVisitTableBase] },
  { name: 'HistoricalVisitCandidate', statement: historicalVisitCandidateTableStatement, columns: historicalVisitCandidateColumns, indexes: historicalVisitCandidateIndexes , previous: [historicalVisitCandidateTableBase] },
  { name: 'HistoricalInvoice', statement: historicalInvoiceTableStatement, columns: historicalInvoiceColumns, indexes: historicalInvoiceIndexes , previous: [historicalInvoiceTableBase] },
  { name: 'PatientAccess', statement: patientAccessTableStatement, columns: patientAccessColumns, indexes: patientAccessIndexes , previous: [patientAccessTableBase] },
  { name: 'Appointment', statement: appointmentTableStatement, columns: appointmentColumns, indexes: appointmentIndexes , previous: [appointmentTableBase] },
  { name: 'MedflexDoctorLink', statement: medflexDoctorLinkTableStatement, columns: medflexDoctorLinkColumns, indexes: medflexDoctorLinkIndexes , previous: [medflexDoctorLinkTableBase] },
  { name: 'MangoCall', statement: mangoCallTableStatement, columns: mangoCallColumns, indexes: mangoCallIndexes , previous: [mangoCallTableBase] },
  { name: 'MangoCallLeg', statement: mangoCallLegTableStatement, columns: mangoCallLegColumns, indexes: mangoCallLegIndexes , previous: [mangoCallLegTableBase] },
  { name: 'MangoCallAccess', statement: mangoCallAccessTableStatement, columns: mangoCallAccessColumns, indexes: mangoCallAccessIndexes , previous: [mangoCallAccessTableBase] },
  { name: 'MangoCallIssue', statement: mangoCallIssueTableStatement, columns: mangoCallIssueColumns, indexes: mangoCallIssueIndexes },
  { name: 'AdminSession', statement: adminSessionTableStatement, columns: adminSessionColumns, indexes: adminSessionIndexes , previous: [adminSessionTableBase] },
  { name: 'AdminUser', statement: adminUserTableStatement, columns: adminUserColumns, indexes: adminUserIndexes },
  { name: 'AdminAuthEvent', statement: adminAuthEventTableStatement, columns: adminAuthEventColumns, indexes: adminAuthEventIndexes , previous: [adminAuthEventTableBase] },
]

async function schemaIndexes(database, tableName) {
  const indexes = await database.execute({ sql: 'SELECT name, "unique", origin, partial FROM pragma_index_list(?)', args: [tableName] })
  const actualIndexes = []
  for (const index of indexes.rows) {
    const details = await database.execute({ sql: 'SELECT name, coll, desc, key FROM pragma_index_xinfo(?) ORDER BY seqno', args: [index.name] })
    const keys = details.rows.filter(({ key }) => key === 1)
    actualIndexes.push({ name: index.name, unique: index.unique, origin: index.origin, partial: index.partial, columns: keys.map(({ name }) => name), collations: keys.map(({ coll }) => coll), descending: keys.map(({ desc }) => desc) })
  }
  return actualIndexes.sort((first, second) => first.name < second.name ? -1 : first.name > second.name ? 1 : 0)
}

async function patientMigrationState(database) {
  const migrationTable = await database.execute("SELECT name FROM sqlite_master WHERE name = 'Patient_nullable_migration'")
  if (migrationTable.rows.length !== 0) throw new Error('[init-db] Patient migration artifact invariant failed')
  const objects = await database.execute("SELECT type, name, sql FROM sqlite_master WHERE name = 'Patient' OR tbl_name = 'Patient'")
  if (objects.rows.length === 0) return 'absent'
  const tables = objects.rows.filter(({ type, name }) => type === 'table' && name === 'Patient')
  const unsupported = objects.rows.filter(({ type }) => type !== 'table' && type !== 'index')
  if (tables.length !== 1 || unsupported.length !== 0) throw new Error('[init-db] Patient preflight table invariant failed')
  const tableSql = canonicalSchemaSql(tables[0].sql)
  const targetTable = tableSql === canonicalSchemaSql(patientTableStatement)
  const previousTable = tableSql === canonicalSchemaSql(previousPatientTableStatement)
  if (!targetTable && !previousTable) throw new Error('[init-db] Patient preflight table invariant failed')
  if (previousTable) {
    const dependencies = await database.execute("SELECT type, name, sql FROM sqlite_master WHERE type IN ('view', 'trigger') ORDER BY type, name")
    if (dependencies.rows.some(({ sql }) => typeof sql !== 'string' || /\bPatient\b/i.test(sql))) throw new Error('[init-db] Patient dependency invariant failed')
  }
  const columns = await database.execute({ sql: 'SELECT name, type, "notnull" AS required, dflt_value, pk FROM pragma_table_info(?)', args: ['Patient'] })
  const actualColumns = columns.rows.map(({ name, type, required, dflt_value: defaultValue, pk }) => [name, type, required, defaultValue, pk])
  const expectedColumns = targetTable ? patientColumns : previousPatientColumns
  if (JSON.stringify(actualColumns) !== JSON.stringify(expectedColumns)) throw new Error('[init-db] Patient preflight column invariant failed')
  const actualIndexes = await schemaIndexes(database, 'Patient')
  const legacyIndexes = JSON.stringify(actualIndexes) === JSON.stringify(legacyPatientIndexes)
  const targetIndexes = JSON.stringify(actualIndexes) === JSON.stringify(patientIndexes)
  if (!legacyIndexes && !targetIndexes) throw new Error('[init-db] Patient preflight index invariant failed')
  if (previousTable) return 'previous'
  if (targetIndexes) return 'target'
  throw new Error('[init-db] Patient preflight index invariant failed')
}

async function rebuildPatientTable(database) {
  await database.execute('ALTER TABLE Patient RENAME TO Patient_nullable_migration')
  await database.execute(patientTableStatement)
  await database.execute('INSERT INTO Patient (id, profileCiphertext, phoneMask, phoneFingerprint, firstSeenAt, lastSeenAt, createdAt, updatedAt, piiDestroyedAt) SELECT id, profileCiphertext, phoneMask, phoneFingerprint, firstSeenAt, lastSeenAt, createdAt, updatedAt, piiDestroyedAt FROM Patient_nullable_migration')
  await database.execute('DROP TABLE Patient_nullable_migration')
}

/**
 * Additive column migration: SQLite rewrites the stored CREATE TABLE text on ALTER, so the
 * schema verification below still matches the canonical statement.
 */
async function addColumnIfMissing(database, table, column, definition) {
  const columns = await database.execute({ sql: 'SELECT name FROM pragma_table_info(?)', args: [table] })
  if (columns.rows.some(({ name }) => name === column)) return
  await database.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
}

function describeColumns(columns) {
  return columns.map(([name, type, required, defaultValue]) => `${name} ${type}${required ? ' NOT NULL' : ''}${defaultValue === null ? '' : ` DEFAULT ${defaultValue}`}`).join(', ')
}

async function verifySchema(database, schema) {
  const table = await database.execute({ sql: "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?", args: [schema.name] })
  if (table.rows.length !== 1) throw new Error(`[init-db] ${schema.name} table definition invariant failed: table is missing`)
  if (canonicalSchemaSql(table.rows[0].sql) !== canonicalSchemaSql(schema.statement)) throw new Error(`[init-db] ${schema.name} table definition invariant failed: expected ${canonicalSchemaSql(schema.statement)} but found ${canonicalSchemaSql(table.rows[0].sql)}`)
  const columns = await database.execute({ sql: 'SELECT name, type, "notnull" AS required, dflt_value, pk FROM pragma_table_info(?)', args: [schema.name] })
  const actualColumns = columns.rows.map(({ name, type, required, dflt_value: defaultValue, pk }) => [name, type, required, defaultValue, pk])
  if (JSON.stringify(actualColumns) !== JSON.stringify(schema.columns)) throw new Error(`[init-db] ${schema.name} column invariant failed: expected [${describeColumns(schema.columns)}] but found [${describeColumns(actualColumns)}]`)
  const unexpectedObjects = await database.execute({ sql: "SELECT type, name FROM sqlite_master WHERE tbl_name = ? AND type NOT IN ('table', 'index')", args: [schema.name] })
  if (unexpectedObjects.rows.length !== 0) throw new Error(`[init-db] ${schema.name} schema object invariant failed: unexpected ${unexpectedObjects.rows.map(({ type, name }) => `${type} ${name}`).join(', ')}`)
  const actualIndexes = await schemaIndexes(database, schema.name)
  if (JSON.stringify(actualIndexes) !== JSON.stringify(schema.indexes)) throw new Error(`[init-db] ${schema.name} index invariant failed: expected [${schema.indexes.map(({ name }) => name).join(', ')}] but found [${actualIndexes.map(({ name }) => name).join(', ')}]`)
}

/** Astro DB stamped the build timestamp into date DEFAULT literals; the value is irrelevant to the shape. */
function legacyCanonicalSql(value) {
  return canonicalSchemaSql(value).replace(/DEFAULT '\d{4}-\d{2}-\d{2}T[^']*'/g, "DEFAULT '<ISO>'")
}

function conversionExpression(column, kind) {
  if (kind === ISO_DATE) return `CASE WHEN typeof(${column}) IN ('integer', 'real') THEN strftime('%Y-%m-%dT%H:%M:%fZ', ${column} / 1000.0, 'unixepoch') WHEN typeof(${column}) = 'text' AND ${column} GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]' THEN strftime('%Y-%m-%dT%H:%M:%fZ', CAST(${column} AS INTEGER) / 1000.0, 'unixepoch') ELSE ${column} END`
  if (kind === WHOLE_NUMBER) return `CASE WHEN ${column} IS NULL THEN NULL ELSE CAST(${column} AS INTEGER) END`
  throw new Error(`[init-db] unknown column conversion ${kind}`)
}

/**
 * Rebuilds one table whose stored definition is a known previous shape into the canonical
 * shape: rename, create, copy with conversions, drop. Any other definition fails closed so a
 * hand-edited or foreign table is never silently rewritten. Returns true when a rebuild ran.
 */
async function reconcileSchema(database, schema) {
  const table = await database.execute({ sql: "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?", args: [schema.name] })
  if (table.rows.length !== 1) return false
  const actual = canonicalSchemaSql(table.rows[0].sql)
  if (actual === canonicalSchemaSql(schema.statement)) return false
  const previous = (schema.previous ?? []).map(legacyCanonicalSql)
  if (!previous.includes(legacyCanonicalSql(table.rows[0].sql))) throw new Error(`[init-db] ${schema.name} table definition drift: expected ${canonicalSchemaSql(schema.statement)} but found ${actual}`)
  const dependencies = await database.execute("SELECT sql FROM sqlite_master WHERE type IN ('view', 'trigger')")
  if (dependencies.rows.some(({ sql }) => typeof sql !== 'string' || new RegExp(`\\b${schema.name}\\b`, 'i').test(sql))) throw new Error(`[init-db] ${schema.name} rebuild is blocked by a view or trigger`)
  const actualIndexes = await schemaIndexes(database, schema.name)
  if (JSON.stringify(actualIndexes) !== JSON.stringify(schema.indexes)) throw new Error(`[init-db] ${schema.name} index invariant failed before rebuild: expected [${schema.indexes.map(({ name }) => name).join(', ')}] but found [${actualIndexes.map(({ name }) => name).join(', ')}]`)
  const staging = `${schema.name}_schema_migration`
  const stagingExists = await database.execute({ sql: "SELECT name FROM sqlite_master WHERE name = ?", args: [staging] })
  if (stagingExists.rows.length !== 0) throw new Error(`[init-db] ${schema.name} rebuild artifact ${staging} already exists`)
  const existing = await database.execute({ sql: 'SELECT name FROM pragma_table_info(?)', args: [schema.name] })
  const oldColumns = existing.rows.map(({ name }) => name)
  const targetColumns = schema.columns.map(([name]) => name)
  const dropped = oldColumns.filter((name) => !targetColumns.includes(name))
  if (dropped.length !== 0) throw new Error(`[init-db] ${schema.name} rebuild would drop columns ${dropped.join(', ')}`)
  const missingRequired = schema.columns.filter(([name, , required, defaultValue]) => required === 1 && defaultValue === null && !oldColumns.includes(name)).map(([name]) => name)
  if (missingRequired.length !== 0) throw new Error(`[init-db] ${schema.name} rebuild cannot fill required columns ${missingRequired.join(', ')}`)
  const copied = targetColumns.filter((name) => oldColumns.includes(name))
  const conversions = schema.convert ?? {}
  const selected = copied.map((name) => (conversions[name] ? conversionExpression(name, conversions[name]) : name))
  await database.execute(`ALTER TABLE ${schema.name} RENAME TO ${staging}`)
  await database.execute(schema.statement)
  await database.execute(`INSERT INTO ${schema.name} (${copied.join(', ')}) SELECT ${selected.join(', ')} FROM ${staging}`)
  await database.execute(`DROP TABLE ${staging}`)
  console.log(`[init-db] ${schema.name} rebuilt into the canonical shape`)
  return true
}

/** Foreign keys are declared for tooling and diagnostics; libsql connections do not enforce them. */
async function reportForeignKeyViolations(database) {
  const violations = await database.execute('PRAGMA foreign_key_check')
  if (violations.rows.length === 0) return
  const counts = new Map()
  for (const row of violations.rows) counts.set(`${row.table}→${row.parent}`, (counts.get(`${row.table}→${row.parent}`) ?? 0) + 1)
  console.warn(`[init-db] foreign key violations: ${[...counts].map(([key, total]) => `${key} ${total}`).join(', ')}`)
}

async function enableWriteAheadLog(database) {
  await database.execute('PRAGMA busy_timeout = 5000')
  if (!url.startsWith('file:')) return
  const result = await database.execute('PRAGMA journal_mode = WAL')
  const mode = String(result.rows[0]?.journal_mode ?? '').toLowerCase()
  if (mode !== 'wal' && mode !== 'memory') throw new Error(`[init-db] journal_mode must be wal but SQLite reported ${mode}`)
}

let transaction
try {
  await enableWriteAheadLog(db)
  await db.execute('PRAGMA foreign_keys = OFF')
  await db.execute('PRAGMA legacy_alter_table = ON')
  transaction = await db.transaction('write')
  try {
    const patientState = await patientMigrationState(transaction)
    if (patientState === 'previous') await rebuildPatientTable(transaction)
    for (const statement of statements) await transaction.execute(statement)
    await addColumnIfMissing(transaction, 'PatientAccess', 'reason', 'TEXT')
    await addColumnIfMissing(transaction, 'AdminSession', 'userId', 'TEXT')
    await transaction.execute('CREATE INDEX IF NOT EXISTS AdminSession_userId_idx ON AdminSession(userId)')
    let rebuilt = false
    for (const schema of clinicSchemas) if (await reconcileSchema(transaction, schema)) rebuilt = true
    if (rebuilt) for (const statement of statements) await transaction.execute(statement)
    if (rebuilt) await transaction.execute('CREATE INDEX IF NOT EXISTS AdminSession_userId_idx ON AdminSession(userId)')
    for (const schema of clinicSchemas) await verifySchema(transaction, schema)
    await reportForeignKeyViolations(transaction)
    await transaction.commit()
  } catch (error) {
    await transaction.rollback()
    throw error
  } finally {
    transaction.close()
  }
  console.log('[init-db] Database schema is ready.')
} finally {
  db.close()
}
