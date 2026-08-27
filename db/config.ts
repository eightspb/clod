import { defineDb, defineTable, column } from 'astro:db';

// Профили докторов (управление через админ-панель)
const Doctor = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    name: column.text(),
    slug: column.text({ optional: true }),
    specialization: column.text(),
    experienceYears: column.number(),
    bio: column.text(),
    photoMediaId: column.text({ optional: true }),
  }
});

// Медиафайлы (фото докторов, сертификаты)
const Media = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    filename: column.text(),
    mimeType: column.text(),
    url: column.text(),
    folder: column.text(),
    createdAt: column.date({ default: new Date() }),
  }
});

// Сертификаты докторов
const DoctorCertificate = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    doctorId: column.text(),
    mediaId: column.text(),
    title: column.text({ optional: true }),
    sortOrder: column.number({ default: 0 }),
    createdAt: column.date({ default: new Date() }),
  }
});

// Услуги (прайс-лист, страница гинекологии)
const Service = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    title: column.text(),
    direction: column.text(),
    description: column.text(),
    price: column.number(),
  }
});

// Аналитика: сессии посетителей
const AnalyticsSession = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    visitorId: column.text(),
    ip: column.text({ optional: true }),
    userAgent: column.text({ optional: true }),
    currentPage: column.text({ optional: true }),
    referrer: column.text({ optional: true }),
    screenWidth: column.number({ optional: true }),
    screenHeight: column.number({ optional: true }),
    language: column.text({ optional: true }),
    startedAt: column.date({ default: new Date() }),
    lastActiveAt: column.date({ default: new Date() }),
  }
});

// Аналитика: просмотры страниц
const PageView = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    sessionId: column.text(),
    page: column.text(),
    enteredAt: column.date({ default: new Date() }),
    duration: column.number({ optional: true }),
  }
});

// Аналитика: лог событий (клики, формы, навигация)
const EventLog = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    sessionId: column.text(),
    eventType: column.text(), // 'click' | 'navigation' | 'form_submit' | 'page_enter' | 'page_leave'
    page: column.text(),
    target: column.text({ optional: true }),
    details: column.text({ optional: true }), // JSON-строка
    createdAt: column.date({ default: new Date() }),
  }
});

const BookingIntent = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    requestFingerprint: column.text(),
    status: column.text({ enum: ['pending', 'confirmed', 'uncertain', 'failed'] }),
    fencingToken: column.text({ optional: true }),
    doctorSlug: column.text(),
    appointmentType: column.text(),
    doctorId: column.number(),
    lpuId: column.number(),
    specialityId: column.number(),
    startsAt: column.text(),
    endsAt: column.text(),
    price: column.number(),
    medflexClaimId: column.text({ optional: true }),
    failureCode: column.text({ optional: true, enum: ['SLOT_UNAVAILABLE', 'PATIENT_REJECTED', 'UPSTREAM_REJECTED', 'UPSTREAM_UNAVAILABLE_BEFORE_DISPATCH', 'UPSTREAM_NOT_ACCEPTED', 'LOCAL_PERSISTENCE_FAILED'] }),
    createdAt: column.text(),
    updatedAt: column.text(),
    pendingUntil: column.text(),
  },
  indexes: [
    { name: 'BookingIntent_requestFingerprint_unique', on: 'requestFingerprint', unique: true },
    { name: 'BookingIntent_medflexClaimId_unique', on: 'medflexClaimId', unique: true },
    { name: 'BookingIntent_fencingToken_unique', on: 'fencingToken', unique: true },
    { name: 'BookingIntent_resumeScope_idx', on: ['doctorSlug', 'appointmentType', 'startsAt', 'endsAt'] },
    { name: 'BookingIntent_status_pendingUntil_idx', on: ['status', 'pendingUntil'] },
  ],
});

const Patient = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    profileCiphertext: column.text({ optional: true }),
    phoneMask: column.text({ optional: true }),
    phoneFingerprint: column.text({ optional: true }),
    firstSeenAt: column.text({ optional: true }),
    lastSeenAt: column.text({ optional: true }),
    createdAt: column.text(),
    updatedAt: column.text(),
    piiDestroyedAt: column.text({ optional: true }),
  },
  indexes: [
    { name: 'Patient_phoneFingerprint_idx', on: 'phoneFingerprint' },
    { name: 'Patient_lastSeenAt_idx', on: 'lastSeenAt' },
  ],
});

const PatientExternalIdentifier = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    patientId: column.text(),
    system: column.text({ enum: ['medesk_ehr', 'clinic_card', 'legacy_system'] }),
    ciphertext: column.text({ optional: true }),
    fingerprint: column.text({ optional: true }),
    globalFingerprint: column.text({ optional: true }),
    identityKey: column.text(),
    sourceName: column.text(),
    sourceRow: column.number(),
    isPrimary: column.boolean(),
    createdAt: column.text(),
    updatedAt: column.text(),
  },
  indexes: [
    { name: 'PatientExternalIdentifier_globalFingerprint_unique', on: 'globalFingerprint', unique: true },
    { name: 'PatientExternalIdentifier_patientId_identityKey_unique', on: ['patientId', 'identityKey'], unique: true },
    { name: 'PatientExternalIdentifier_fingerprint_idx', on: 'fingerprint' },
    { name: 'PatientExternalIdentifier_patientId_idx', on: 'patientId' },
  ],
});

const PatientContact = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    patientId: column.text(),
    kind: column.text({ enum: ['phone', 'email'] }),
    ciphertext: column.text({ optional: true }),
    fingerprint: column.text({ optional: true }),
    mask: column.text({ optional: true }),
    isPrimary: column.boolean(),
    sourceName: column.text(),
    firstSeenAt: column.text({ optional: true }),
    lastSeenAt: column.text({ optional: true }),
    piiDestroyedAt: column.text({ optional: true }),
  },
  indexes: [
    { name: 'PatientContact_patientId_kind_fingerprint_unique', on: ['patientId', 'kind', 'fingerprint'], unique: true },
    { name: 'PatientContact_fingerprint_idx', on: 'fingerprint' },
    { name: 'PatientContact_patientId_idx', on: 'patientId' },
  ],
});

const PatientNameHistory = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    patientId: column.text(),
    lastNameCiphertext: column.text({ optional: true }),
    lastNameFingerprint: column.text({ optional: true }),
    sourceName: column.text(),
    sourceIdentifierCiphertext: column.text({ optional: true }),
    observedAt: column.text({ optional: true }),
    reason: column.text({ enum: ['surname_change', 'source_correction'] }),
    piiDestroyedAt: column.text({ optional: true }),
  },
  indexes: [
    { name: 'PatientNameHistory_patientId_lastNameFingerprint_unique', on: ['patientId', 'lastNameFingerprint'], unique: true },
    { name: 'PatientNameHistory_patientId_idx', on: 'patientId' },
  ],
});

const PatientPrivateData = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    patientId: column.text(),
    profileCiphertext: column.text({ optional: true }),
    createdAt: column.text(),
    updatedAt: column.text(),
    piiDestroyedAt: column.text({ optional: true }),
  },
  indexes: [
    { name: 'PatientPrivateData_patientId_unique', on: 'patientId', unique: true },
  ],
});

const PatientConsent = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    patientId: column.text(),
    type: column.text({ enum: ['sms_notifications'] }),
    status: column.text({ enum: ['granted', 'not_granted'] }),
    sourceName: column.text(),
    observedAt: column.text({ optional: true }),
    createdAt: column.text(),
    updatedAt: column.text(),
  },
  indexes: [
    { name: 'PatientConsent_patientId_type_unique', on: ['patientId', 'type'], unique: true },
  ],
});

const PatientAttachment = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    patientId: column.text(),
    kind: column.text(),
    urlCiphertext: column.text({ optional: true }),
    metadataCiphertext: column.text({ optional: true }),
    sourceName: column.text(),
    createdAt: column.text(),
    deletedAt: column.text({ optional: true }),
    piiDestroyedAt: column.text({ optional: true }),
  },
  indexes: [
    { name: 'PatientAttachment_patientId_createdAt_idx', on: ['patientId', 'createdAt'] },
  ],
});

const ImportBatch = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    manifestHash: column.text(),
    planHash: column.text(),
    mode: column.text({ enum: ['dry_run', 'apply'] }),
    status: column.text({ enum: ['applying', 'completed', 'failed'] }),
    controlTotals: column.text(),
    createdAt: column.text(),
    completedAt: column.text({ optional: true }),
  },
  indexes: [
    { name: 'ImportBatch_manifestHash_unique', on: 'manifestHash', unique: true },
    { name: 'ImportBatch_status_createdAt_idx', on: ['status', 'createdAt'] },
  ],
});

const ImportSourceRow = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    batchId: column.text(),
    sourceName: column.text(),
    sourceRow: column.number(),
    patientId: column.text({ optional: true }),
    historicalVisitId: column.text({ optional: true }),
    payloadCiphertext: column.text({ optional: true }),
    payloadHash: column.text(),
    createdAt: column.text(),
    piiDestroyedAt: column.text({ optional: true }),
  },
  indexes: [
    { name: 'ImportSourceRow_batchId_sourceName_sourceRow_unique', on: ['batchId', 'sourceName', 'sourceRow'], unique: true },
    { name: 'ImportSourceRow_patientId_idx', on: 'patientId' },
    { name: 'ImportSourceRow_historicalVisitId_idx', on: 'historicalVisitId' },
  ],
});

const ImportIssue = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    batchId: column.text(),
    sourceName: column.text(),
    sourceRow: column.number(),
    code: column.text(),
    patientId: column.text({ optional: true }),
    historicalVisitId: column.text({ optional: true }),
    candidatesCiphertext: column.text({ optional: true }),
    detailsCiphertext: column.text({ optional: true }),
    createdAt: column.text(),
    resolvedAt: column.text({ optional: true }),
  },
  indexes: [
    { name: 'ImportIssue_batchId_code_idx', on: ['batchId', 'code'] },
    { name: 'ImportIssue_patientId_idx', on: 'patientId' },
    { name: 'ImportIssue_historicalVisitId_idx', on: 'historicalVisitId' },
  ],
});

const HistoricalVisit = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    batchId: column.text(),
    sourceName: column.text(),
    sourceRow: column.number(),
    patientId: column.text({ optional: true }),
    appointmentIdCiphertext: column.text({ optional: true }),
    appointmentIdFingerprint: column.text({ optional: true }),
    startsAt: column.text({ optional: true }),
    endsAt: column.text({ optional: true }),
    sourceStatus: column.text(),
    doctorCiphertext: column.text({ optional: true }),
    detailsCiphertext: column.text({ optional: true }),
    linkStatus: column.text({ enum: ['linked', 'ambiguous', 'unmatched'] }),
    linkMethod: column.text({ optional: true }),
    evidenceLevel: column.text({ optional: true }),
    createdAt: column.text(),
    piiDestroyedAt: column.text({ optional: true }),
  },
  indexes: [
    { name: 'HistoricalVisit_batchId_sourceName_sourceRow_unique', on: ['batchId', 'sourceName', 'sourceRow'], unique: true },
    { name: 'HistoricalVisit_appointmentIdFingerprint_idx', on: 'appointmentIdFingerprint' },
    { name: 'HistoricalVisit_patientId_startsAt_idx', on: ['patientId', 'startsAt'] },
    { name: 'HistoricalVisit_linkStatus_startsAt_idx', on: ['linkStatus', 'startsAt'] },
  ],
});

const HistoricalVisitCandidate = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    historicalVisitId: column.text(),
    patientId: column.text(),
    evidenceCode: column.text(),
    score: column.number(),
    createdAt: column.text(),
  },
  indexes: [
    { name: 'HistoricalVisitCandidate_visitId_patientId_unique', on: ['historicalVisitId', 'patientId'], unique: true },
    { name: 'HistoricalVisitCandidate_patientId_idx', on: 'patientId' },
  ],
});

const HistoricalInvoice = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    batchId: column.text(),
    sourceName: column.text(),
    sourceRow: column.number(),
    historicalVisitId: column.text({ optional: true }),
    payloadCiphertext: column.text({ optional: true }),
    sourceStatus: column.text({ enum: ['incomplete_source'] }),
    createdAt: column.text(),
    piiDestroyedAt: column.text({ optional: true }),
  },
  indexes: [
    { name: 'HistoricalInvoice_batchId_sourceName_sourceRow_unique', on: ['batchId', 'sourceName', 'sourceRow'], unique: true },
    { name: 'HistoricalInvoice_historicalVisitId_idx', on: 'historicalVisitId' },
  ],
});

const PatientAccess = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    patientId: column.text(),
    action: column.text({ enum: ['reveal', 'destroy'] }),
    actor: column.text(),
    createdAt: column.text(),
  },
  indexes: [
    { name: 'PatientAccess_patientId_createdAt_idx', on: ['patientId', 'createdAt'] },
  ],
});

const Appointment = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    patientId: column.text(),
    source: column.text({ enum: ['website', 'admin_medflex', 'admin_existing'] }),
    status: column.text({ enum: ['pending', 'confirmed', 'cancelled', 'failed', 'needs_review'] }),
    medflexClaimId: column.text({ optional: true }),
    medflexLpuId: column.number({ optional: true }),
    medflexDoctorId: column.number({ optional: true }),
    medflexSpecialityId: column.number({ optional: true }),
    medflexServiceId: column.number({ optional: true }),
    doctorName: column.text(),
    specialityName: column.text(),
    serviceName: column.text({ optional: true }),
    startsAt: column.text(),
    endsAt: column.text(),
    priceKopecks: column.number({ optional: true }),
    bookingFingerprint: column.text(),
    failureCode: column.text({ optional: true }),
    createdAt: column.text(),
    updatedAt: column.text(),
    cancelledAt: column.text({ optional: true }),
  },
  indexes: [
    { name: 'Appointment_medflexClaimId_unique', on: 'medflexClaimId', unique: true },
    { name: 'Appointment_bookingFingerprint_unique', on: 'bookingFingerprint', unique: true },
    { name: 'Appointment_startsAt_idx', on: 'startsAt' },
    { name: 'Appointment_patientId_startsAt_idx', on: ['patientId', 'startsAt'] },
    { name: 'Appointment_status_startsAt_idx', on: ['status', 'startsAt'] },
    { name: 'Appointment_medflexDoctorId_startsAt_idx', on: ['medflexDoctorId', 'startsAt'] },
    { name: 'Appointment_source_startsAt_idx', on: ['source', 'startsAt'] },
  ],
});

const MedflexDoctorLink = defineTable({
  columns: {
    medflexDoctorId: column.number({ primaryKey: true }),
    externalName: column.text(),
    localDoctorId: column.text({ optional: true }),
    active: column.boolean(),
    syncedAt: column.text(),
  },
  indexes: [
    { name: 'MedflexDoctorLink_localDoctorId_idx', on: 'localDoctorId' },
    { name: 'MedflexDoctorLink_active_idx', on: 'active' },
  ],
});

const MangoCall = defineTable({
  columns: {
    entryId: column.text({ primaryKey: true }),
    patientId: column.text({ optional: true }),
    status: column.text({ enum: ['ringing', 'queued', 'connected', 'on_hold', 'finalizing', 'answered', 'missed'] }),
    callerCiphertext: column.text({ optional: true }),
    callerMask: column.text({ optional: true }),
    callerFingerprint: column.text({ optional: true }),
    repeatCaller: column.boolean({ optional: true }),
    lineNumber: column.text(),
    operatorExtension: column.text({ optional: true }),
    startedAt: column.text(),
    forwardedAt: column.text({ optional: true }),
    answeredAt: column.text({ optional: true }),
    endedAt: column.text({ optional: true }),
    waitSeconds: column.number({ optional: true }),
    talkSeconds: column.number({ optional: true }),
    disconnectReason: column.text({ optional: true }),
    finalizedAt: column.text({ optional: true }),
    createdAt: column.text(),
    updatedAt: column.text(),
    piiDestroyedAt: column.text({ optional: true }),
  },
  indexes: [
    { name: 'MangoCall_startedAt_idx', on: 'startedAt' },
    { name: 'MangoCall_status_startedAt_idx', on: ['status', 'startedAt'] },
    { name: 'MangoCall_patientId_startedAt_idx', on: ['patientId', 'startedAt'] },
    { name: 'MangoCall_callerFingerprint_startedAt_idx', on: ['callerFingerprint', 'startedAt'] },
    { name: 'MangoCall_lineNumber_startedAt_idx', on: ['lineNumber', 'startedAt'] },
    { name: 'MangoCall_operatorExtension_startedAt_idx', on: ['operatorExtension', 'startedAt'] },
  ],
});

const MangoCallLeg = defineTable({
  columns: {
    callId: column.text({ primaryKey: true }),
    entryId: column.text(),
    maxSeq: column.number(),
    state: column.text({ enum: ['ringing', 'queued', 'connected', 'on_hold', 'finalizing'] }),
    location: column.text({ optional: true }),
    extension: column.text({ optional: true }),
    eventAt: column.text(),
    createdAt: column.text(),
    updatedAt: column.text(),
  },
  indexes: [
    { name: 'MangoCallLeg_entryId_idx', on: 'entryId' },
    { name: 'MangoCallLeg_state_eventAt_idx', on: ['state', 'eventAt'] },
    { name: 'MangoCallLeg_extension_eventAt_idx', on: ['extension', 'eventAt'] },
  ],
});

const MangoCallAccess = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    entryId: column.text(),
    action: column.text({ enum: ['reveal', 'destroy'] }),
    actor: column.text(),
    createdAt: column.text(),
  },
  indexes: [
    { name: 'MangoCallAccess_entryId_createdAt_idx', on: ['entryId', 'createdAt'] },
  ],
});

export default defineDb({
  tables: { Doctor, Media, DoctorCertificate, Service, AnalyticsSession, PageView, EventLog, BookingIntent, Patient, PatientExternalIdentifier, PatientContact, PatientNameHistory, PatientPrivateData, PatientConsent, PatientAttachment, ImportBatch, ImportSourceRow, ImportIssue, HistoricalVisit, HistoricalVisitCandidate, HistoricalInvoice, PatientAccess, Appointment, MedflexDoctorLink, MangoCall, MangoCallLeg, MangoCallAccess }
});
