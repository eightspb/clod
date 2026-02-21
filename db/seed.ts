import { db, User, Doctor, Patient, Service, Blog, Article, Media } from 'astro:db';

export default async function seed() {
  // 1. Создаем администратора и врачей-пользователей
  await db.insert(User).values([
    {
      id: 'admin-1',
      email: 'admin@odintsovclinic.ru',
      passwordHash: 'hashed_password_here',
      role: 'admin',
      createdAt: new Date(),
    },
    { id: 'doc-user-1', email: 'odintsov@odintsovclinic.ru', passwordHash: 'hashed_password_here', role: 'doctor', createdAt: new Date() },
    { id: 'doc-user-2', email: 'prikhodko@odintsovclinic.ru', passwordHash: 'hashed_password_here', role: 'doctor', createdAt: new Date() },
    { id: 'doc-user-3', email: 'macuchov@odintsovclinic.ru', passwordHash: 'hashed_password_here', role: 'doctor', createdAt: new Date() },
    { id: 'doc-user-4', email: 'skurihin@odintsovclinic.ru', passwordHash: 'hashed_password_here', role: 'doctor', createdAt: new Date() },
    { id: 'doc-user-5', email: 'egorova@odintsovclinic.ru', passwordHash: 'hashed_password_here', role: 'doctor', createdAt: new Date() },
    { id: 'doc-user-6', email: 'vlasenko@odintsovclinic.ru', passwordHash: 'hashed_password_here', role: 'doctor', createdAt: new Date() },
    { id: 'doc-user-7', email: 'zaharova@odintsovclinic.ru', passwordHash: 'hashed_password_here', role: 'doctor', createdAt: new Date() },
    { id: 'doc-user-8', email: 'nevzorova@odintsovclinic.ru', passwordHash: 'hashed_password_here', role: 'doctor', createdAt: new Date() },
    { id: 'doc-user-9', email: 'kalinina@odintsovclinic.ru', passwordHash: 'hashed_password_here', role: 'doctor', createdAt: new Date() },
  ]);

  // 2. Медиа-заглушки для врачей
  await db.insert(Media).values([
    { id: 'media-doc-1', filename: 'odintsov.jpg', mimeType: 'image/jpeg', url: '/uploads/doctors/odintsov.jpg', folder: 'doctors', createdAt: new Date() },
    { id: 'media-doc-2', filename: 'prikhodko.jpg', mimeType: 'image/jpeg', url: '/uploads/doctors/prikhodko.jpg', folder: 'doctors', createdAt: new Date() },
    { id: 'media-doc-3', filename: 'macuchov.jpg', mimeType: 'image/jpeg', url: '/uploads/doctors/macuchov.jpg', folder: 'doctors', createdAt: new Date() },
    { id: 'media-doc-4', filename: 'skurihin.jpg', mimeType: 'image/jpeg', url: '/uploads/doctors/skurihin.jpg', folder: 'doctors', createdAt: new Date() },
    { id: 'media-doc-5', filename: 'egorova.jpg', mimeType: 'image/jpeg', url: '/uploads/doctors/egorova.jpg', folder: 'doctors', createdAt: new Date() },
    { id: 'media-doc-6', filename: 'vlasenko.jpg', mimeType: 'image/jpeg', url: '/uploads/doctors/vlasenko.jpg', folder: 'doctors', createdAt: new Date() },
    { id: 'media-doc-7', filename: 'zaharova.jpg', mimeType: 'image/jpeg', url: '/uploads/doctors/zaharova.jpg', folder: 'doctors', createdAt: new Date() },
    { id: 'media-doc-8', filename: 'nevzorova.jpg', mimeType: 'image/jpeg', url: '/uploads/doctors/nevzorova.jpg', folder: 'doctors', createdAt: new Date() },
    { id: 'media-doc-9', filename: 'kalinina.jpg', mimeType: 'image/jpeg', url: '/uploads/doctors/kalinina.jpg', folder: 'doctors', createdAt: new Date() },
  ]);

  // 3. Реальные профили врачей (данные с odintsovclinic.ru)
  await db.insert(Doctor).values([
    {
      id: 'doctor-1',
      userId: 'doc-user-1',
      name: 'Одинцов Владислав Александрович',
      slug: 'odintsov',
      specialization: 'ДМН, онколог, хирург, врач УЗД',
      experienceYears: 30,
      bio: 'Главный врач клиники. Доктор медицинских наук. Область интересов: тиреоидология, маммология, телемедицина, цитология. 4 патента РФ, 68 печатных работ.',
      photoMediaId: 'media-doc-1',
    },
    {
      id: 'doctor-2',
      userId: 'doc-user-2',
      name: 'Приходько Кирилл Андреевич',
      slug: 'prikhodko',
      specialization: 'Онколог, хирург, врач УЗД',
      experienceYears: 14,
      bio: 'Хирург-онколог, специализируется на проблемах молочных желёз — полная диагностика и лечение. Владеет методом ВАБ.',
      photoMediaId: 'media-doc-2',
    },
    {
      id: 'doctor-3',
      userId: 'doc-user-3',
      name: 'Мацухов Алим Суфьянович',
      slug: 'macuchov',
      specialization: 'Онколог, хирург, врач УЗД',
      experienceYears: 8,
      bio: 'Хирург-онколог, специализируется на проблемах молочных желёз — полная диагностика и лечение. Сертифицирован по ВАБ.',
      photoMediaId: 'media-doc-3',
    },
    {
      id: 'doctor-4',
      userId: 'doc-user-4',
      name: 'Скурихин Семён Сергеевич',
      slug: 'skurihin',
      specialization: 'Онколог, хирург, врач УЗД',
      experienceYears: 16,
      bio: 'Хирург-онколог, специализируется на проблемах молочных желёз — полная диагностика и лечение.',
      photoMediaId: 'media-doc-4',
    },
    {
      id: 'doctor-5',
      userId: 'doc-user-5',
      name: 'Егорова Анастасия Александровна',
      slug: 'egorova',
      specialization: 'Онколог-маммолог, гинеколог, врач УЗД',
      experienceYears: 17,
      bio: 'Рассматривает молочную железу, щитовидную железу и половые органы в комплексе. Выполняет кольпоскопию, малые хирургические манипуляции.',
      photoMediaId: 'media-doc-5',
    },
    {
      id: 'doctor-6',
      userId: 'doc-user-6',
      name: 'Власенко Ольга Сергеевна',
      slug: 'vlasenko',
      specialization: 'Акушер-гинеколог, гинеколог-эндокринолог, врач УЗД',
      experienceYears: 16,
      bio: 'Врач высшей квалификационной категории, сексолог, перинатальный психолог. Специализируется на бесплодии, нарушениях цикла, менопаузальной гормональной терапии.',
      photoMediaId: 'media-doc-6',
    },
    {
      id: 'doctor-7',
      userId: 'doc-user-7',
      name: 'Захарова Татьяна Николаевна',
      slug: 'zaharova',
      specialization: 'Акушер-гинеколог, гинеколог-эндокринолог, врач УЗД',
      experienceYears: 35,
      bio: 'Опытный акушер-гинеколог с 35-летним стажем. Ведёт пациенток с нарушениями цикла, бесплодием, эндометриозом, миомой матки.',
      photoMediaId: 'media-doc-7',
    },
    {
      id: 'doctor-8',
      userId: 'doc-user-8',
      name: 'Невзорова Елена Александровна',
      slug: 'nevzorova',
      specialization: 'Акушер-гинеколог, нутрициолог, врач УЗД',
      experienceYears: 28,
      bio: 'Молекулярный нутрициолог, гинеколог-эндокринолог. Специализируется на нарушениях гормонального фона, бесплодии, подготовке к ЭКО.',
      photoMediaId: 'media-doc-8',
    },
    {
      id: 'doctor-9',
      userId: 'doc-user-9',
      name: 'Калинина Ирина Аркадьевна',
      slug: 'kalinina',
      specialization: 'Эндокринолог',
      experienceYears: 27,
      bio: 'Врач высшей квалификационной категории, член Российской ассоциации эндокринологов. Ведёт специализированный приём по эндокринной патологии, диабету, остеопорозу.',
      photoMediaId: 'media-doc-9',
    },
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
