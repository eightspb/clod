import { db, User, Doctor, Patient, Service, Blog, Article, Media } from 'astro:db';

export default async function seed() {
  // 1. Создаем администратора и врачей-пользователей
  await db.insert(User).values([
    {
      id: 'admin-1',
      email: 'admin@klinika-odincova.ru',
      passwordHash: 'hashed_password_here',
      role: 'admin',
      createdAt: new Date(),
    },
    {
      id: 'doc-user-1',
      email: 'odintsova@klinika-odincova.ru',
      passwordHash: 'hashed_password_here',
      role: 'doctor',
      createdAt: new Date(),
    },
    {
      id: 'doc-user-2',
      email: 'smirnova@klinika-odincova.ru',
      passwordHash: 'hashed_password_here',
      role: 'doctor',
      createdAt: new Date(),
    },
    {
      id: 'doc-user-3',
      email: 'kozlov@klinika-odincova.ru',
      passwordHash: 'hashed_password_here',
      role: 'doctor',
      createdAt: new Date(),
    },
    {
      id: 'doc-user-4',
      email: 'volkova@klinika-odincova.ru',
      passwordHash: 'hashed_password_here',
      role: 'doctor',
      createdAt: new Date(),
    }
  ]);

  // 2. Демо-медиа для врачей (заглушки)
  await db.insert(Media).values([
    { id: 'media-doc-1', filename: 'odintsova.jpg', mimeType: 'image/jpeg', url: '/uploads/doctors/odintsova.jpg', folder: 'doctors', createdAt: new Date() },
    { id: 'media-doc-2', filename: 'smirnova.jpg', mimeType: 'image/jpeg', url: '/uploads/doctors/smirnova.jpg', folder: 'doctors', createdAt: new Date() },
    { id: 'media-doc-3', filename: 'kozlov.jpg', mimeType: 'image/jpeg', url: '/uploads/doctors/kozlov.jpg', folder: 'doctors', createdAt: new Date() },
    { id: 'media-doc-4', filename: 'volkova.jpg', mimeType: 'image/jpeg', url: '/uploads/doctors/volkova.jpg', folder: 'doctors', createdAt: new Date() },
  ]);

  // 3. Создаем профили врачей
  await db.insert(Doctor).values([
    {
      id: 'doctor-1',
      userId: 'doc-user-1',
      name: 'Одинцова Елена Петровна',
      specialization: 'Маммолог-онколог',
      experienceYears: 18,
      bio: 'Ведущий специалист по удалению образований в груди с помощью технологии ВАБ.',
      photoMediaId: 'media-doc-1',
    },
    {
      id: 'doctor-2',
      userId: 'doc-user-2',
      name: 'Смирнова Ирина Вадимовна',
      specialization: 'Гинеколог',
      experienceYears: 14,
      bio: 'Бережный осмотр без боли. 0% гипердиагностики — лечим только то, что требует лечения.',
      photoMediaId: 'media-doc-2',
    },
    {
      id: 'doctor-3',
      userId: 'doc-user-3',
      name: 'Козлов Андрей Михайлович',
      specialization: 'Эндокринолог',
      experienceYears: 16,
      bio: 'Точная настройка метаболизма по данным анализов. Возвращаем энергию и контроль над весом.',
      photoMediaId: 'media-doc-3',
    },
    {
      id: 'doctor-4',
      userId: 'doc-user-4',
      name: 'Волкова Наталья Сергеевна',
      specialization: 'Невролог',
      experienceYears: 12,
      bio: 'Жизнь без мигреней и боли в спине. Устраняем причину за 1–3 визита.',
      photoMediaId: 'media-doc-4',
    }
  ]);

  // 4. Добавляем услуги (с направлениями и ценами)
  await db.insert(Service).values([
    // Маммология
    { id: 'srv-1', title: 'Консультация онколога-маммолога', direction: 'Маммология', description: 'Первичный прием, осмотр, сбор анамнеза.', price: 3500 },
    { id: 'srv-2', title: 'УЗИ молочных желёз', direction: 'Маммология', description: 'Ультразвуковое исследование', price: 2500 },
    { id: 'srv-3', title: 'ВАБ (вакуумная аспирационная биопсия)', direction: 'Маммология', description: 'Удаление образований без скальпеля', price: 25000 },
    { id: 'srv-4', title: 'ВАБ + гистология (всё включено)', direction: 'Маммология', description: 'Удаление с последующим анализом', price: 35000 },
    { id: 'srv-5', title: 'Второе мнение по снимкам', direction: 'Маммология', description: 'Пересмотр диагноза других клиник', price: 0 },
    // Гинекология
    { id: 'srv-6', title: 'Консультация гинеколога', direction: 'Гинекология', description: 'Первичный осмотр и консультация', price: 3000 },
    { id: 'srv-7', title: 'УЗИ органов малого таза', direction: 'Гинекология', description: 'Ультразвуковое исследование', price: 2500 },
    { id: 'srv-8', title: 'Кольпоскопия', direction: 'Гинекология', description: 'Исследование шейки матки', price: 3500 },
    { id: 'srv-9', title: 'ПЦР-диагностика ИППП (12 инфекций)', direction: 'Гинекология', description: 'Комплексный анализ', price: 4800 },
    { id: 'srv-10', title: 'Комплекс «Полный скрининг»', direction: 'Гинекология', description: 'Все необходимые анализы и осмотр', price: 8900 },
    // Эндокринология
    { id: 'srv-11', title: 'Консультация эндокринолога', direction: 'Эндокринология', description: 'Прием врача', price: 3500 },
    { id: 'srv-12', title: 'Анализ на ТТГ, Т3, Т4 свободный', direction: 'Эндокринология', description: 'Базовый анализ щитовидной железы', price: 2200 },
    { id: 'srv-13', title: 'Расширенный гормональный профиль', direction: 'Эндокринология', description: 'Комплексный гормональный анализ', price: 7400 },
    { id: 'srv-14', title: 'Комплекс «Энергия и метаболизм»', direction: 'Эндокринология', description: 'Диагностика причин усталости', price: 12900 },
    { id: 'srv-15', title: 'Повторная консультация + план', direction: 'Эндокринология', description: 'Назначение лечения', price: 2500 },
    // Неврология
    { id: 'srv-16', title: 'Консультация невролога', direction: 'Неврология', description: 'Диагностика болей', price: 3500 },
    { id: 'srv-17', title: 'Лечебная блокада (1 зона)', direction: 'Неврология', description: 'Снятие острого болевого синдрома', price: 5500 },
    { id: 'srv-18', title: 'Блокада под УЗИ-навигацией', direction: 'Неврология', description: 'Точное введение препарата', price: 7900 },
    { id: 'srv-19', title: 'Курс лечебных блокад (3 процедуры)', direction: 'Неврология', description: 'Курсовое лечение', price: 18000 },
    { id: 'srv-20', title: 'МРТ позвоночника (1 отдел)', direction: 'Неврология', description: 'Направление на МРТ', price: 4200 },
  ]);

  // 5. Блог
  await db.insert(Blog).values([
    {
      id: 'blog-1',
      title: 'Открытие нового хирургического отделения',
      content: 'Рады сообщить, что в нашей клинике открылось новое, современно оборудованное хирургическое отделение...',
      publishedAt: new Date(),
    }
  ]);

  console.log('БД успешно заполнена демо-данными (врачи, услуги по направлениям, блог)!');
}
