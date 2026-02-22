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

export default defineDb({
  tables: { Doctor, Media, DoctorCertificate, Service, AnalyticsSession, PageView, EventLog }
});
