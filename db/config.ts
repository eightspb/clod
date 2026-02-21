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

// 2. Профили врачей
const Doctor = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text({ references: () => User.columns.id }),
    name: column.text(),
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

export default defineDb({
  tables: { User, Doctor, Patient, Service, Blog, Article, Media }
});
