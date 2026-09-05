import { customType, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/**
 * Dates are persisted as ISO-8601 text because the existing SQLite rows were written that way
 * by the retired Astro DB layer, and the analytics queries compare them lexicographically.
 */
const isoDate = customType({
  dataType() {
    return 'text'
  },
  toDriver(value) {
    return value.toISOString()
  },
  fromDriver(value) {
    return new Date(value)
  },
})

const flag = (name) => integer(name, { mode: 'boolean' })

export const Doctor = sqliteTable('Doctor', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug'),
  specialization: text('specialization').notNull(),
  experienceYears: integer('experienceYears').notNull(),
  bio: text('bio').notNull(),
  photoMediaId: text('photoMediaId'),
})

export const Media = sqliteTable('Media', {
  id: text('id').primaryKey(),
  filename: text('filename').notNull(),
  mimeType: text('mimeType').notNull(),
  url: text('url').notNull(),
  folder: text('folder').notNull(),
  createdAt: isoDate('createdAt').notNull().$defaultFn(() => new Date()),
})

export const DoctorCertificate = sqliteTable('DoctorCertificate', {
  id: text('id').primaryKey(),
  doctorId: text('doctorId').notNull(),
  mediaId: text('mediaId').notNull(),
  title: text('title'),
  sortOrder: integer('sortOrder').notNull().default(0),
  createdAt: isoDate('createdAt').notNull().$defaultFn(() => new Date()),
})

export const Service = sqliteTable('Service', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  direction: text('direction').notNull(),
  description: text('description').notNull(),
  price: integer('price').notNull(),
})

export const AnalyticsSession = sqliteTable('AnalyticsSession', {
  id: text('id').primaryKey(),
  visitorId: text('visitorId').notNull(),
  ip: text('ip'),
  userAgent: text('userAgent'),
  currentPage: text('currentPage'),
  referrer: text('referrer'),
  screenWidth: integer('screenWidth'),
  screenHeight: integer('screenHeight'),
  language: text('language'),
  startedAt: isoDate('startedAt').notNull().$defaultFn(() => new Date()),
  lastActiveAt: isoDate('lastActiveAt').notNull().$defaultFn(() => new Date()),
})

export const PageView = sqliteTable('PageView', {
  id: text('id').primaryKey(),
  sessionId: text('sessionId').notNull(),
  page: text('page').notNull(),
  enteredAt: isoDate('enteredAt').notNull().$defaultFn(() => new Date()),
  duration: integer('duration'),
})

export const EventLog = sqliteTable('EventLog', {
  id: text('id').primaryKey(),
  sessionId: text('sessionId').notNull(),
  eventType: text('eventType').notNull(),
  page: text('page').notNull(),
  target: text('target'),
  details: text('details'),
  createdAt: isoDate('createdAt').notNull().$defaultFn(() => new Date()),
})

export const Patient = sqliteTable('Patient', {
  id: text('id').primaryKey(),
  profileCiphertext: text('profileCiphertext'),
  phoneMask: text('phoneMask'),
  phoneFingerprint: text('phoneFingerprint'),
  firstSeenAt: text('firstSeenAt'),
  lastSeenAt: text('lastSeenAt'),
  createdAt: text('createdAt').notNull(),
  updatedAt: text('updatedAt').notNull(),
  piiDestroyedAt: text('piiDestroyedAt'),
})

export const Appointment = sqliteTable('Appointment', {
  id: text('id').primaryKey(),
  patientId: text('patientId').notNull(),
  source: text('source').notNull(),
  status: text('status').notNull(),
  medflexClaimId: text('medflexClaimId'),
  medflexLpuId: integer('medflexLpuId'),
  medflexDoctorId: integer('medflexDoctorId'),
  medflexSpecialityId: integer('medflexSpecialityId'),
  medflexServiceId: integer('medflexServiceId'),
  doctorName: text('doctorName').notNull(),
  specialityName: text('specialityName').notNull(),
  serviceName: text('serviceName'),
  startsAt: text('startsAt').notNull(),
  endsAt: text('endsAt').notNull(),
  priceKopecks: integer('priceKopecks'),
  bookingFingerprint: text('bookingFingerprint').notNull(),
  failureCode: text('failureCode'),
  createdAt: text('createdAt').notNull(),
  updatedAt: text('updatedAt').notNull(),
  cancelledAt: text('cancelledAt'),
})

export const MedflexDoctorLink = sqliteTable('MedflexDoctorLink', {
  medflexDoctorId: integer('medflexDoctorId').primaryKey(),
  externalName: text('externalName').notNull(),
  localDoctorId: text('localDoctorId'),
  active: flag('active').notNull(),
  syncedAt: text('syncedAt').notNull(),
})

export const MangoCall = sqliteTable('MangoCall', {
  entryId: text('entryId').primaryKey(),
  patientId: text('patientId'),
  status: text('status').notNull(),
  callerCiphertext: text('callerCiphertext'),
  callerMask: text('callerMask'),
  callerFingerprint: text('callerFingerprint'),
  repeatCaller: flag('repeatCaller'),
  lineNumber: text('lineNumber').notNull(),
  operatorExtension: text('operatorExtension'),
  startedAt: text('startedAt').notNull(),
  forwardedAt: text('forwardedAt'),
  answeredAt: text('answeredAt'),
  endedAt: text('endedAt'),
  waitSeconds: integer('waitSeconds'),
  talkSeconds: integer('talkSeconds'),
  disconnectReason: text('disconnectReason'),
  finalizedAt: text('finalizedAt'),
  createdAt: text('createdAt').notNull(),
  updatedAt: text('updatedAt').notNull(),
  piiDestroyedAt: text('piiDestroyedAt'),
})
