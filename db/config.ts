import { defineDb, defineTable, column } from 'astro:db';

// 1. Пользователи и роли (для будущих личных кабинетов)
const User = defineTable({
  columns: {
    id: column.text({ primaryKey: true }), // UUID
    email: column.text({ unique: true }),
    passwordHash: column.text(),
    role: column.text(), // 'admin' | 'doctor' | 'patient'
    createdAt: column.date({ default: new Date() }),
  }
});

// 2. Профили докторов
const Doctor = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text({ references: () => User.columns.id }),
    name: column.text(),
    slug: column.text({ optional: true }), // URL-slug для страницы доктора на odintsovclinic.ru
    specialization: column.text(),
    experienceYears: column.number(),
    bio: column.text(),
    photoMediaId: column.text({ optional: true }), // Ссылка на таблицу Media
  }
});

// 3. Профили пациентов
const Patient = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text({ references: () => User.columns.id }),
    name: column.text(),
    phone: column.text({ unique: true }),
  }
});

// 4. Услуги
const Service = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    title: column.text(),
    direction: column.text(), // Направление (например, "Терапия", "Хирургия")
    description: column.text(),
    price: column.number(),
  }
});

// 5. Блог и Статьи
const Blog = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    title: column.text(),
    content: column.text(),
    publishedAt: column.date({ default: new Date() }),
    mediaId: column.text({ optional: true }),
  }
});

const Article = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    title: column.text(),
    content: column.text(),
    authorId: column.text({ references: () => Doctor.columns.id }),
    publishedAt: column.date({ default: new Date() }),
    mediaId: column.text({ optional: true }),
  }
});

// 6. Медиафайлы (Изображения, видео и т.д.)
const Media = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    filename: column.text(),
    mimeType: column.text(), // 'image/jpeg', 'video/mp4'
    url: column.text(), // Ссылка на файл в public/uploads/...
    folder: column.text(), // Папка (например, 'doctors', 'blog', 'pages')
    createdAt: column.date({ default: new Date() }),
  }
});

// 7. Сертификаты докторов (набор изображений)
const DoctorCertificate = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    doctorId: column.text(), // без FK — упрощённая связь
    mediaId: column.text(), // ссылка на Media.id
    title: column.text({ optional: true }), // название сертификата
    sortOrder: column.number({ default: 0 }),
    createdAt: column.date({ default: new Date() }),
  }
});

// 8. Аналитика: сессии посетителей
const AnalyticsSession = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    visitorId: column.text(), // Постоянный анонимный ID (localStorage)
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

// 8. Аналитика: просмотры страниц
const PageView = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    sessionId: column.text(), // без FK — аналитика не требует строгой целостности
    page: column.text(),
    enteredAt: column.date({ default: new Date() }),
    duration: column.number({ optional: true }), // секунды
  }
});

// 9. Аналитика: лог событий (клики, навигация, формы и т.д.)
const EventLog = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    sessionId: column.text(), // без FK — аналитика не требует строгой целостности
    eventType: column.text(), // 'click' | 'navigation' | 'scroll' | 'form_submit' | 'page_enter' | 'page_leave'
    page: column.text(),
    target: column.text({ optional: true }), // текст кнопки/ссылки, ID элемента
    details: column.text({ optional: true }), // JSON-строка с доп. данными
    createdAt: column.date({ default: new Date() }),
  }
});

export default defineDb({
  tables: { User, Doctor, Patient, Service, Blog, Article, Media, DoctorCertificate, AnalyticsSession, PageView, EventLog }
});
