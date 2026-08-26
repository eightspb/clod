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
    failureCode: column.text({ optional: true, enum: ['SLOT_UNAVAILABLE', 'PATIENT_REJECTED', 'UPSTREAM_REJECTED', 'UPSTREAM_UNAVAILABLE_BEFORE_DISPATCH'] }),
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

export default defineDb({
  tables: { Doctor, Media, DoctorCertificate, Service, AnalyticsSession, PageView, EventLog, BookingIntent }
});
