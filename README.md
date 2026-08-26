# Клиника Одинцова - Project README

> Сайт клиники экспертной медицины. Быстрый контекст для AI-агентов и разработчиков.

---

## Инженерные правила

В репозитории теперь есть отдельный набор project rules и coding rules для людей и AI-агентов:

- `AGENTS.md` — порядок чтения контекста, обязательный workflow, карта rule-файлов
- `CLAUDE.md` — корневой entrypoint для AI-инструкций
- `.cursor/rules/core-stack.mdc` — контекст проекта и архитектурные ограничения
- `.cursor/rules/coding-principles.mdc` — coding rules: DDD-lite, fail fast, модульные границы, именование
- `.cursor/rules/tdd-testing.mdc` — test-driven design: Red → Green → Refactor для поведенческих изменений
- `.cursor/rules/astro-pages-and-react-islands.mdc` — правила для Astro pages, React islands и SEO-safe изменений
- `.cursor/rules/api-and-security.mdc` — правила для API, валидации, auth, upload и security-sensitive кода
- `.cursor/rules/react-patterns.mdc` и `.cursor/rules/error-handling.mdc` — UI-паттерны, accessibility, ошибки и валидация
- `.cursor/rules/documentation-and-delivery.mdc` — обязательное обновление документации и валидации перед завершением задачи

Базовые инженерные принципы проекта:

- **Astro server-first** для публичных и SEO-критичных страниц
- **React islands только там, где нужна интерактивность**
- **DDD-lite**: разделение presentation / domain / infrastructure даже в небольшом кодбейсе
- **TDD для изменения поведения** в `src/lib/**`, `src/components/**` и `src/pages/api/**`
- **Fail fast** для некорректного ввода, конфигурации и security-critical сценариев
- После значимых изменений нужно синхронизировать `README.md`, а при новых env-переменных ещё и `.env.example`

---

## Стек технологий

| Слой | Технология |
|---|---|
| Runtime | **Bun** (не npm/yarn) |
| Фреймворк | **Astro 4** + React 18 (island architecture) |
| База данных | **@astrojs/db** (SQLite) |
| Стилизация | **Tailwind CSS 3** + CSS-переменные дизайн-системы в `src/styles/global.css` |
| Иконки | **Lucide React** |
| Тема | Skinnable CSS-архитектура (~87 CSS-переменных в `:root`), `ThemeSwitcher.jsx` (20 цветовых пресетов, 3 шрифтовых селектора) |
| Язык | JavaScript (`.jsx` файлы), контент на русском |
| Роутинг | File-based routing Astro (не React Router) |

> Нет TypeScript в компонентах. `.jsx` файлы - чистый JS.

---

## Запуск проекта

```bash
bun run dev      # dev-сервер на localhost:4321
bun run build    # production-сборка в dist/
bun run preview  # превью собранного билда
```

`bun run dev` и `bun run deploy` вызывают shell-скрипты в `scripts/` (macOS/Linux). Dev-launcher явно загружает корневой `.env` до старта Astro, поэтому после изменения server-only переменных окружения dev-сервер нужно полностью перезапустить.

---

## Тестирование и CI/CD

### Команды

| Команда | Описание |
|---------|----------|
| `bun run test` | Запуск юнит-тестов в watch-режиме |
| `bun run test:run` | Однократный прогон юнит-тестов |
| `bun run test:coverage` | Тесты с отчётом покрытия |
| `bun run test:e2e` | E2E-тесты (Playwright) |
| `bun run test:e2e -- e2e/booking.spec.js --project=chromium --workers=1` | Изолированный booking E2E с локальными route mocks и без реального Medflex POST |
| `bun run lint` | Проверка кода ESLint |
| `bun run lint:fix` | Автоисправление ESLint |

### Покрытие тестами

- **Юнит-тесты (Vitest)**: auth/session hardening, analytics API hardening, upload-validation, second-opinion, tax-form, booking domain/API и ключевые React-компоненты
- **E2E-тесты (Playwright)**: главная, навигация, blog detail, базовая security-проверка админки и полностью замокированный first-party booking flow, включая девять doctor contexts, mobile, keyboard и recovery states

### GitHub Actions CI

При push/PR в `main` или `develop` выполняются:

1. **Lint** - ESLint
2. **Unit tests** - Vitest
3. **Build** - `astro build`
4. **E2E** - Playwright (Chromium)

### Конфигурация

| Файл | Назначение |
|------|------------|
| `vitest.config.mjs` | Vitest + Astro getViteConfig, jsdom |
| `eslint.config.js` | ESLint 9 flat config + Astro, React |
| `playwright.config.js` | Playwright, webServer: dev/preview |
| `.github/workflows/ci.yml` | GitHub Actions pipeline |

---

## Архитектура

Проект использует **Astro hybrid mode** (SSG + SSR):

- Публичные страницы - статически пре-рендерятся (SSG)
- Админ-панель и API - серверный рендеринг (SSR) через `@astrojs/node`
- Интерактивные части - React `.jsx`-острова с минимально необходимой директивой `client:*`: `client:idle` для отложенной публичной интерактивности и `client:load`, когда она нужна сразу
- Лейаут оборачивает все страницы через `<slot />`

```
Публичный запрос → src/pages/*.astro (prerendered) → Layout.astro → components/pages/*.jsx
Админ запрос     → src/pages/admin/*.astro (SSR) → AdminLayout.astro → components/admin/*.jsx
API запрос       → src/pages/api/**/*.js (SSR)
```

Клиентские React islands используются для интерактивных публичных компонентов и админ-панели. `Layout.astro` монтирует ровно один глобальный `BookingFlow` с `client:load`; все кнопки записи открывают этот общий first-party диалог через публичные атрибуты-триггеры.

### Адаптивное представление врачей

`ResponsiveDoctorHero` и `ResponsiveDoctorCollection` задают единый responsive-контракт для hero-блоков и секций врачей. На мобильных экранах коллекция из двух и более врачей использует `MobileDoctorCarousel`; коллекция из одного врача остаётся обычной `DoctorCard`, а single-doctor hero сохраняет прежнее неинтерактивное представление без карусельных контролов. На desktop сохраняются существующие `HeroDoctorCard` и сетки `DoctorCard`.

Контракт действует на профильных страницах маммологии, гинекологии, эндокринологии, нутрициологии, второго мнения и ВАБ, а также на страницах аденомиоза, эндометриоза, эрозии шейки матки, фиброаденомы, гипотиреоза, кисты молочной железы, мастопатии и тиреоидита Хашимото. Каждая карусель получает контекстную accessibility-метку; кнопка записи и ссылка на профиль всегда относятся к активному врачу.

В соответствии с Astro-first подходом `client:idle` добавлен только на ранее статические multi-doctor routes `/mammology`, `/gynecology`, `/nutrition` и `/vab`. `/second-opinion` уже был интерактивным, `/endocrinology` остаётся статическим из-за одного врача, а disease routes уже использовали hydration, поэтому их Astro-файлы не менялись.

### Аналитика и трекинг

Клиентский трекер (`public/tracker.js`) автоматически подключается на всех публичных страницах и собирает:
- Сессии посетителей (IP, UA, экран, язык, referrer)
- Просмотры страниц с длительностью
- Клики на кнопки и ссылки
- Отправки форм
- Переходы между страницами

Данные хранятся в трёх таблицах БД: `AnalyticsSession`, `PageView`, `EventLog`.
Клиент отправляет события на `POST /api/analytics/event` и heartbeat на `POST /api/analytics/heartbeat`.

### Безопасность

- **Security headers** - добавлены через `src/middleware.js` (X-Frame-Options, X-Content-Type-Options, HSTS в production и т.д.)
- **Rate limiting** - login: 5 попыток / 15 мин; аналитика: 100 req/min (event), 120 req/min (heartbeat)
- **CSRF-защита** - проверка заголовка `Origin`/`Referer` на всех state-changing API
- **Санитизация** - валидация и trim всех текстовых полей в admin API; защита от path traversal при загрузке файлов (doctorId, extension)
- **Разделение секретов** - `TOKEN_SECRET` обязателен для HMAC-подписи админ-сессий и больше не падает обратно на `ADMIN_PASSWORD`; в production для cookies выставляется `Secure`
- **Analytics ingestion** - `event` и `heartbeat` используют одинаковую модель origin-check, rate limit и machine-readable ошибок
- **Публичная форма “Второе мнение”** - endpoint работает fail-fast по SMTP-конфигу, валидирует origin/files и не использует placeholder credentials

### Переменные окружения (`.env`)

| Переменная | Описание |
|---|---|
| `ADMIN_PASSWORD` | Пароль для входа в админ-панель |
| `TOKEN_SECRET` | Обязательный секрет для HMAC-подписи токенов админ-сессии |
| `MEDFLEX_CLINIC_TOKEN` | Серверный токен клиники для официального Medflex API; значение не должно иметь префикс `PUBLIC_` |
| `BOOKING_INTENT_SECRET` | Отдельный сильный случайный HMAC-секрет для идентичности и дедупликации попыток онлайн-записи |
| `SMTP_HOST` | SMTP-хост для отправки заявок формы “Второе мнение” |
| `SMTP_PORT` | SMTP-порт (по умолчанию ожидается `465`, если явно задан) |
| `SMTP_USER` | SMTP-пользователь для исходящих писем |
| `SMTP_PASS` | SMTP-пароль |
| `SMTP_SECURE` | Флаг secure-подключения к SMTP (`true`/`false`) |
| `FROM_EMAIL` | Необязательный адрес отправителя для писем формы “Второе мнение” |
| `TO_EMAIL` | Обязательный адрес клиники для получения заявок |

### Инфраструктура безопасной онлайн-записи

Серверный слой онлайн-записи использует отдельные `MEDFLEX_CLINIC_TOKEN` и `BOOKING_INTENT_SECRET`. Они задаются только в untracked `.env` среды исполнения и не передаются в клиентский JavaScript. `BOOKING_INTENT_SECRET` не является токеном Medflex или `TOKEN_SECRET`: он должен оставаться отдельным и неизменным между перезапусками и деплоями, иначе существующие попытки нельзя будет безопасно сопоставить. Таблица `BookingIntent` хранит только HMAC-идентичность запроса, доверенный слот и минимальное состояние согласования; ФИО, телефон, дата рождения, комментарий, IP, User-Agent и сырые ответы Medflex в ней не сохраняются.

Контейнер при каждом запуске выполняет `scripts/init-db.mjs`. Миграция аддитивна и идемпотентна: существующие данные SQLite сохраняются, таблица и индексы `BookingIntent` добавляются при отсутствии, а несовместимая схема останавливает запуск. Публичный first-party интерфейс уже подключён: один `BookingFlow` в `Layout.astro` обслуживает CTA в шапке, футере, sticky-панели, общих секциях и карточках врачей. Внешний iframe/widget runtime `booking.medflex.ru`, его preconnect и idle-загрузчик не используются.

Общие CTA без контекста сначала показывают выбор врача. CTA на карточке или странице врача передаёт только публичный slug и сразу загружает расписание этого врача; внутренние Medflex ID, токен и секреты не входят в props или HTML. Allowlist охватывает ровно девять профилей: `odintsov`, `prikhodko`, `macuchov`, `skurihin`, `egorova`, `vlasenko`, `zaharova`, `nevzorova` и `kalinina`.

Диалог поддерживает выбор врача и типа приёма, загрузку расписания, пустое расписание, выбор даты и времени, данные пациента, согласие, проверку, подтверждение, конфликт занятого слота, rate limit, временную недоступность и защищённые `pending`/`uncertain` исходы. При пустом расписании, `429`, `503`, неясном результате или недоступной онлайн-записи всегда остаётся телефон клиники [`+7 (812) 748-22-10`](tel:+78127482210); неясный результат нельзя обходить повторным созданием новой заявки. Клиентский analytics-трекер не читает значения полей формы, а E2E отдельно проверяет отсутствие ФИО, телефона, даты рождения и комментария в analytics payload.

Серверный API записи работает через два same-origin маршрута и всегда отвечает с `Cache-Control: no-store`:

- `GET /api/appointments/slots` принимает публичный slug врача и окно дат, запрашивает только разрешённые идентификаторы Medflex и возвращает браузеру нормализованные типы приёма, цены, возрастные ограничения и свободное время без внутренних doctor/LPU/speciality ID. Лимит — 30 запросов на доверенный IP за 60 секунд.
- `POST /api/appointments/book` принимает только JSON размером до 16 КиБ, проверяет Origin, согласие, поля пациента и актуальность слота. Лимит — 5 запросов на доверенный IP за 15 минут. Операция создания записи защищена durable intent и fencing-токеном; после неясного ответа повторная отправка сначала сверяется с историей Medflex и никогда не выполняется вслепую.

Reconciliation использует официальный history API с ограниченным окном даты и LPU, без телефона, ФИО или других пациентских данных в query string и access logs. Точное сопоставление выполняется только в памяти; если безопасная выборка превышает 200 записей, результат остаётся `uncertain` без повторного создания записи. Контракт history endpoint опубликован в [портале Medflex Clinic Token API](https://developer.medflex.ru/clinic-token/).

Явное сопоставление врачей и типов приёма поддерживается в `src/lib/medflex-doctors.js`. Для контролируемого обновления discovery используется `bun run medflex:discover`: команда читает токен из локального untracked `.env`, а токен нельзя передавать аргументом командной строки или копировать в вывод, историю shell и отчёты. Результат discovery нужно проверить вручную до изменения allowlist.

По [официальной справке Medflex](https://help.medflex.me/integraciya-cherez-api-so-storonnimi-servisami/) открытый токен клиники предоставляет группы Models, Schedule, Online booking и Services и действует для всех филиалов клиники. Успешное создание записи через Online booking тарифицируется, поэтому перед production нужно проверить условия и баланс, а тестовый smoke ограничить чтением расписания без `POST` создания записи.

Ошибки API не содержат токен, персональные данные, внутренние идентификаторы, stack trace или сырой ответ Medflex. Серверный журнал получает только безопасный код этапа без содержимого запроса. Токен, опубликованный в чате, логе или истории команд, считается скомпрометированным: перед production его нужно отозвать, выпустить заново и поместить только в серверный `.env`. Ротация токена Medflex не должна попутно менять стабильный `BOOKING_INTENT_SECRET`; плановую ротацию intent-секрета выполняют отдельно после завершения или контролируемого сброса незакрытых попыток.

### Админ-панель

Доступна по адресу `/admin/login`. Для входа нужен `ADMIN_PASSWORD`, а для выпуска и проверки сессий обязателен отдельный `TOKEN_SECRET`.

| Раздел | URL | Описание |
|---|---|---|
| Дашборд | `/admin` | Статистика, графики, лента событий |
| Сессии | `/admin/sessions` | Активные сессии с авто-обновлением |
| Логи | `/admin/logs` | Все события с фильтрами и пагинацией |
| Доктора | `/admin/doctors` | Редактирование данных докторов |

---

## Структура файлов

```
clod/
├── .github/workflows/
│   └── ci.yml                    # GitHub Actions: lint, test, build, e2e
├── e2e/                          # E2E-тесты (Playwright)
│   ├── booking.spec.js           # First-party запись с полностью перехваченными GET/POST без Medflex network
│   ├── home.spec.js              # Главная страница
│   └── navigation.spec.js        # Навигация
├── public/                        # Статические ассеты
│   ├── tracker.js                 # Клиентский трекер аналитики
│   ├── robots.txt                 # Директивы для поисковых роботов
│   ├── sitemap.xml                # Карта сайта для SEO
│   └── uploads/                   # Медиафайлы (разбиты по папкам: doctors и т.д.)
├── src/
│   ├── middleware.js              # Security headers (X-Frame-Options, HSTS и т.д.)
│   ├── components/
│   │   ├── home/                  # Модули главной страницы (извлечены из Home.jsx)
│   │   │   ├── HeroSlider.jsx     # Карусель героя (3 слайда, autoplay, карточки врачей)
│   │   │   ├── ServicesSection.jsx # Грид направлений
│   │   │   ├── DoctorsSection.jsx # Фильтры + mobile-карусель / desktop-карточки врачей
│   │   │   ├── WhyUsSection.jsx   # «Почему выбирают» + статистика
│   │   │   ├── SecondOpinionSection.jsx  # Баннер второго мнения
│   │   │   ├── VabSection.jsx     # Блок ВАБ
│   │   │   ├── DirectContactSection.jsx  # Прямая связь
│   │   │   ├── ReviewsSection.jsx # Отзывы пациентов
│   │   │   └── AppointmentFormSection.jsx # CTA входа в общий first-party BookingFlow
│   │   ├── booking/               # Диалог записи: врачи, тип приёма, расписание, пациент, результат
│   │   ├── pages/                 # React-компоненты страниц
│   │   │   ├── Home.jsx           # Главная: композиция 9 модулей из home/
│   │   │   ├── About.jsx          # Страница "О клинике": миссия, руководство, маршрут пациента, принципы
│   │   │   ├── Mammology.jsx      # Маммология + секция "Заболевания" с condition-ссылками
│   │   │   ├── Gynecology.jsx     # Гинекология + секция "Заболевания"
│   │   │   ├── Endocrinology.jsx  # Эндокринология + секция "Заболевания"
│   │   │   ├── Nutrition.jsx
│   │   │   ├── Fibroadenoma.jsx   # Condition: Фиброаденома
│   │   │   ├── Mastopatiya.jsx    # Condition: Мастопатия
│   │   │   ├── KistaMolochnoyZhelezy.jsx  # Condition: Киста молочной железы
│   │   │   ├── EroziyaSheykyMatki.jsx     # Condition: Эрозия шейки матки
│   │   │   ├── Gipotireoz.jsx     # Condition: Гипотиреоз
│   │   │   ├── Adenomioz.jsx      # Condition: Аденомиоз
│   │   │   ├── Endometrioz.jsx    # Condition: Эндометриоз
│   │   │   ├── TireoiditKhashimoto.jsx # Condition: Тиреоидит Хашимото
│   │   │   ├── Vab.jsx            # Страница ВАБ-процедуры (с визуальным timeline)
│   │   │   ├── DlyaInogorodnikh.jsx  # Для иногородних пациентов
│   │   │   ├── NashiRezultaty.jsx # Наши результаты (count-up анимации)
│   │   │   ├── Media.jsx          # Медиа / СМИ
│   │   │   ├── Contacts.jsx       # Страница контактов с картой
│   │   │   ├── SecondOpinion.jsx
│   │   │   ├── Prices.jsx
│   │   │   ├── Doctors.jsx        # Листинг всех докторов с фильтрами
│   │   │   ├── DoctorPage.jsx     # Страница отдельного доктора
│   │   │   └── PrivacyPolicy.jsx  # Политика конфиденциальности
│   │   ├── admin/                 # Компоненты админ-панели
│   │   │   ├── LoginForm.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── DoctorList.jsx     # Контейнер списка докторов
│   │   │   ├── DoctorEditForm.jsx # Форма редактирования (модалка)
│   │   │   ├── DoctorPhotoUpload.jsx # Загрузка фото доктора
│   │   │   ├── DoctorCertificates.jsx # Управление сертификатами
│   │   │   ├── SessionsViewer.jsx
│   │   │   └── LogsViewer.jsx
│   │   ├── Header.jsx             # Навигация (client:load, mega-menu, поиск Pagefind)
│   │   ├── Footer.jsx             # Подвал сайта (4 колонки)
│   │   ├── SearchModal.jsx        # Модалка поиска Pagefind
│   │   ├── FadeInSection.jsx      # Scroll fade-in анимация (Intersection Observer)
│   │   ├── StarRating.jsx         # Звёздный рейтинг ПроДокторов
│   │   ├── RelatedArticles.jsx    # Блок "Читайте также" для блога
│   │   ├── StickyCTA.jsx          # Фиксированная панель внизу экрана (только mobile, md:hidden)
│   │   ├── ClayContactBanner.jsx  # Баннер с контактами
│   │   ├── DoctorCard.jsx         # Переиспользуемая карточка доктора (с ПроДокторов рейтингом)
│   │   ├── MobileDoctorCarousel.jsx # Круговой flat-coverflow прозрачных портретов с общей mobile-плашкой
│   │   ├── ResponsiveDoctorHero.jsx # Mobile-карусель нескольких врачей + сохранённый desktop HeroDoctorCard
│   │   ├── ResponsiveDoctorCollection.jsx # Mobile-карусель/одна карточка + сохранённая desktop-сетка
│   │   ├── CtaSection.jsx         # Переиспользуемый CTA-блок
│   │   ├── ThemeSwitcher.jsx       # Переключатель темы (20 цветов, 3 шрифтовых селектора, client:idle)
│   │   ├── ErrorBoundary.jsx      # React Error Boundary для page-level компонентов
│   │   └── PageWrapper.jsx        # Обёртка страницы с ErrorBoundary
│   ├── layouts/
│   │   ├── Layout.astro           # Главный лейаут (OG-теги, canonical, JSON-LD)
│   │   └── AdminLayout.astro      # Лейаут админ-панели (с проверкой авторизации)
│   ├── lib/
│   │   ├── auth.js                # HMAC-авторизация (токены, cookie, CSRF validateOrigin)
│   │   ├── admin-api.js           # guardAdminRead/guardAdminWrite (auth + rate limit)
│   │   ├── rate-limit.js          # In-memory rate limiter с namespace-изоляцией
│   │   ├── file-constraints.js    # Shared upload-константы (MAX_FILES, ALLOWED_MIME_TYPES)
│   │   ├── theme-config.js        # Цветовые пресеты, шрифты, buildFullPalette
│   │   ├── useAdminFetch.js       # React hook: loading/error/fetchData для admin-панели
│   │   ├── useHeroFit.js          # React hook: auto-fit font size для hero-блоков
│   │   ├── constants.js           # UI-константы: ICON_SIZES, RING_COLOR_MAP
│   │   ├── contacts.js            # Контактные данные: телефоны, адрес, часы, мессенджеры
│   │   ├── nav.js                 # Навигация: DIRECTIONS, NAV_ITEMS, FOOTER_LINKS
│   │   ├── filters.js             # Фильтры докторов: FILTER_TABS, FILTER_BG, matchesFilter
│   │   ├── clinic-info.js         # Данные клиники: CLINIC_FACTS, SERVICES, WHY_ITEMS
│   │   ├── price-list.js          # Официальный и короткий прайс-лист клиники
│   │   └── doctors-data.js        # Статические данные 9 докторов клиники
│   ├── content/                   # Astro Content Collections
│   │   ├── config.ts              # Схема коллекций (blog: title, description, author, tags…)
│   │   └── blog/                  # Markdown-статьи блога
│   │       ├── vab-ili-operatsiya.md
│   │       ├── chto-takoe-fibroadenoma.md
│   │       ├── kak-izbezhat-operatsii-na-grudi.md
│   │       ├── mammografiya-ili-uzi.md
│   │       ├── gipotireoz-simptomy-lechenie.md
│   │       └── ... (всего 40 статей)
│   ├── pages/                     # Astro-роуты (file-based routing)
│   │   ├── index.astro            # /
│   │   ├── about.astro            # /about - О клинике (миссия, руководство, документы, преимущества, оборудование)
│   │   ├── mammology.astro        # /mammology
│   │   ├── gynecology.astro       # /gynecology
│   │   ├── endocrinology.astro    # /endocrinology
│   │   ├── nutrition.astro        # /nutrition
│   │   ├── fibroadenoma.astro      # /fibroadenoma - Фиброаденома (MedicalCondition JSON-LD)
│   │   ├── mastopatiya.astro      # /mastopatiya - Мастопатия
│   │   ├── kista-molochnoy-zhelezy.astro  # /kista-molochnoy-zhelezy - Киста молочной железы
│   │   ├── eroziya-sheyki-matki.astro  # /eroziya-sheyki-matki - Эрозия шейки матки
│   │   ├── gipotireoz.astro       # /gipotireoz - Гипотиреоз
│   │   ├── adenomioz.astro        # /adenomioz - Аденомиоз (MedicalCondition JSON-LD)
│   │   ├── endometrioz.astro      # /endometrioz - Эндометриоз (MedicalCondition JSON-LD)
│   │   ├── tireoidit-khashimoto.astro # /tireoidit-khashimoto - Тиреоидит Хашимото (MedicalCondition JSON-LD)
│   │   ├── dlya-inogorodnikh.astro # /dlya-inogorodnikh - Для иногородних
│   │   ├── nashi-rezultaty.astro  # /nashi-rezultaty - Наши результаты
│   │   ├── media.astro            # /media - Медиа / СМИ
│   │   ├── second-opinion.astro   # /second-opinion
│   │   ├── tax-form.astro         # /tax-form - форма запроса справки для налогового вычета
│   │   ├── prices.astro           # /prices
│   │   ├── prices/
│   │   │   └── full.astro         # /prices/full - полный официальный прайс-лист
│   │   ├── vab.astro              # /vab - ВАБ-процедура (MedicalProcedure + FAQPage JSON-LD)
│   │   ├── contacts.astro         # /contacts - контакты с картой
│   │   ├── blog/
│   │   │   ├── index.astro        # /blog - список статей (ItemList JSON-LD)
│   │   │   └── [slug].astro       # /blog/vab-ili-operatsiya и т.д. (MedicalWebPage + Article JSON-LD)
│   │   ├── doctors.astro          # /doctors - листинг докторов
│   │   ├── doctors/
│   │   │   └── [slug].astro       # /doctors/odintsov, /doctors/egorova и т.д. (+ Physician JSON-LD)
│   │   ├── privacy-policy.astro   # /privacy-policy
│   │   ├── licenses.astro         # /licenses - лицензии и сертификаты клиники
│   │   ├── 404.astro              # Кастомная страница 404
│   │   ├── blog-images.astro      # /blog-images - внутренний генератор постеров для блога (SSR)
│   │   ├── admin/                 # Админ-панель (SSR)
│   │   │   ├── index.astro        # /admin - дашборд
│   │   │   ├── login.astro        # /admin/login
│   │   │   ├── doctors.astro      # /admin/doctors
│   │   │   ├── sessions.astro     # /admin/sessions
│   │   │   └── logs.astro         # /admin/logs
│   │   └── api/                   # API-эндпоинты (SSR)
│   │       ├── analytics/
│   │       │   ├── event.js       # POST - приём событий трекера
│   │       │   └── heartbeat.js   # POST - heartbeat сессий
│   │       ├── appointments/
│   │       │   ├── slots.js       # GET - безопасное нормализованное расписание Medflex
│   │       │   └── book.js        # POST - защищённое создание и согласование записи
│   │       ├── tax-form.js        # POST - заявка на справку для налогового вычета
│   │       ├── auth/
│   │       │   ├── login.js       # POST - вход (rate limiting: 5 попыток / 15 мин)
│   │       │   └── logout.js      # POST - выход
│   │       └── admin/
│   │           ├── stats.js       # GET - агрегированная статистика
│   │           ├── sessions.js    # GET - список сессий
│   │           ├── logs.js        # GET - логи событий
│   │           ├── doctors.js     # GET - список докторов
│   │           ├── doctors/[id].js # PUT - обновление доктора (с санитизацией)
│   │           ├── doctors/[id]/certificates.js # DELETE - удаление сертификата
│   │           └── upload/
│   │               ├── photo.js   # POST - загрузка фото доктора
│   │               └── certificates.js # POST - загрузка сертификатов
│   ├── test/
│   │   └── setup.js              # Vitest setup (jest-dom, cleanup)
│   ├── styles/
│   │   └── global.css             # Tailwind + ~87 CSS-переменных дизайн-системы + theme-switcher стили + prose-clay (блог)
│   └── env.d.ts                   # Astro type references
├── db/                            # Astro DB
│   ├── config.ts                  # Схема базы данных
│   └── seed.ts                    # Скрипт наполнения (демо-данные)
├── Dockerfile                     # Multi-stage Docker-сборка (builder + runner)
├── docker-compose.yml             # Docker Compose: app + nginx + certbot
├── nginx.conf                     # Nginx: по умолчанию HTTP (IP / до SSL)
├── nginx.https.conf               # Nginx: HTTPS после Let's Encrypt
├── nginx.bootstrap.conf           # Nginx: HTTP для первичного ACME (Certbot)
├── .env                           # Переменные окружения (ADMIN_PASSWORD, TOKEN_SECRET, ASTRO_DB_REMOTE_URL)
├── .env.example                   # Шаблон переменных окружения
├── astro.config.mjs               # Astro конфиг (hybrid mode, node adapter, react + tailwind)
├── vitest.config.mjs              # Vitest (Astro getViteConfig, jsdom)
├── playwright.config.js           # Playwright E2E
├── eslint.config.js               # ESLint 9 flat config (Astro, React)
├── tailwind.config.js             # Tailwind тема (цвета, тени, радиусы)
├── postcss.config.js
├── package.json
├── bun.lock
└── .cursor/rules/                 # Правила для AI-агентов
    ├── core-stack.mdc             # Стек и принципы (alwaysApply: true)
    ├── react-patterns.mdc         # Паттерны React-компонентов
    └── error-handling.mdc         # Обработка ошибок
```

---

## Роутинг

Astro file-based routing - каждый `.astro`-файл в `src/pages/` = отдельный маршрут.

### Публичные страницы (SSG - статические)

| Маршрут | Astro-файл | React-компонент |
|---|---|---|
| `/` | `index.astro` | `Home.jsx` |
| `/about` | `about.astro` | `About.jsx` |
| `/mammology` | `mammology.astro` | `Mammology.jsx` |
| `/gynecology` | `gynecology.astro` | `Gynecology.jsx` |
| `/endocrinology` | `endocrinology.astro` | `Endocrinology.jsx` |
| `/nutrition` | `nutrition.astro` | `Nutrition.jsx` |
| `/fibroadenoma` | `fibroadenoma.astro` | `Fibroadenoma.jsx` |
| `/mastopatiya` | `mastopatiya.astro` | `Mastopatiya.jsx` |
| `/kista-molochnoy-zhelezy` | `kista-molochnoy-zhelezy.astro` | `KistaMolochnoyZhelezy.jsx` |
| `/eroziya-sheyki-matki` | `eroziya-sheyki-matki.astro` | `EroziyaSheykyMatki.jsx` |
| `/gipotireoz` | `gipotireoz.astro` | `Gipotireoz.jsx` |
| `/adenomioz` | `adenomioz.astro` | `Adenomioz.jsx` |
| `/endometrioz` | `endometrioz.astro` | `Endometrioz.jsx` |
| `/tireoidit-khashimoto` | `tireoidit-khashimoto.astro` | `TireoiditKhashimoto.jsx` |
| `/vab` | `vab.astro` | `Vab.jsx` |
| `/dlya-inogorodnikh` | `dlya-inogorodnikh.astro` | `DlyaInogorodnikh.jsx` |
| `/nashi-rezultaty` | `nashi-rezultaty.astro` | `NashiRezultaty.jsx` |
| `/media` | `media.astro` | `Media.jsx` |
| `/contacts` | `contacts.astro` | `Contacts.jsx` |
| `/second-opinion` | `second-opinion.astro` | `SecondOpinion.jsx` |
| `/tax-form` | `tax-form.astro` | `TaxFormRequestForm.jsx` (island) |
| `/prices` | `prices.astro` | `Prices.jsx` |
| `/prices/full` | `prices/full.astro` | - (Astro) |
| `/doctors` | `doctors.astro` | `Doctors.jsx` |
| `/doctors/[slug]` | `doctors/[slug].astro` | `DoctorPage.jsx` |
| `/blog` | `blog/index.astro` | - (Astro) |
| `/blog/[slug]` | `blog/[slug].astro` | - (Astro + Content Collections) |
| `/privacy-policy` | `privacy-policy.astro` | `PrivacyPolicy.jsx` |
| `/licenses` | `licenses.astro` | `Licenses.jsx` |
| `/404` | `404.astro` | - (Astro) |

На `/doctors` обе адаптивные версии следуют одному смысловому порядку: `h1` «Ваши доктора», фильтры только по специальностям, коллекция врачей, затем редакционный блок `h2` «Врачи клиники Одинцова». Отдельной видимой кнопки «Все доктора» нет: по умолчанию показаны все специалисты, а повторное нажатие активной специальности снимает фильтр. На mobile коллекция отображается круговой каруселью, на desktop — сеткой карточек.

Данные докторов хранятся в `src/lib/doctors-data.js` (статический массив `DOCTORS` с 9 докторами). Каждый доктор имеет поля:

| Поле | Тип | Описание |
|---|---|---|
| `slug` | string | URL-идентификатор (`/doctors/odintsov`) |
| `name` | string | Полное имя |
| `photo` | string | Сжатое фото для обычных карточек |
| `photoFull` | string | Исходный PNG-портрет с прозрачным фоном |
| `photoMobile` | string | Оптимизированный прозрачный WebP-портрет для мобильного coverflow |
| `photoMobileFit` | `'square'` \| `'compact'` | Необязательная настройка масштаба мобильного портрета: усиленная для квадратного исходника или промежуточная для компактного, всегда без обрезки |
| `degree` | string? | Учёная степень (напр. `д.м.н.`) - используется в `honorificSuffix` Physician JSON-LD |
| `specialization` | string | Специализация |
| `experienceYears` | number | Стаж в годах |
| `ringColor` | string | Цвет кольца аватара (`mint`, `peach`, `blue`, `lavender`) |
| `tagline` | string | Краткое описание для карточки |
| `bio` | string | Слово доктора (от первого лица) |
| `aboutDoctor` | string | Описание от третьего лица |
| `helpsWith[]` | string[] | Список направлений помощи |
| `education[]` | `{year, description}[]` | Образование и повышение квалификации |
| `reviews[]` | `{text, author?}[]` | Отзывы пациентов |
| `proDoctorovUrl` | string? | Ссылка на профиль на ПроДокторов (E-E-A-T + `sameAs` в JSON-LD) |
| `publications[]` | `{title, year, type, note?}[]` | Научные публикации и диссертации (только у Одинцова) |
| `tvLinks[]` | `{title, channel, url, year}[]` | Ссылки на TV-выступления (только у Одинцова) |

`DoctorPage.jsx` отображает секции «Научные публикации и патенты» и «Выступления в СМИ» при наличии соответствующих данных.

### Централизованные данные и утилиты (`src/lib/`)

| Файл | Экспорты | Используется в |
|---|---|---|
| `contacts.js` | `PHONE_NUMBER`, `PHONE_DISPLAY`, `PHONE_NUMBER_2`, `PHONE_DISPLAY_2`, `TELEGRAM_URL`, `ADDRESS`, `HOURS_WEEKDAY`, `HOURS_WEEKEND` | `Footer`, `Header`, `CtaSection`, `ClayContactBanner` |
| `nav.js` | `DIRECTIONS`, `NAV_ITEMS`, `FOOTER_LINKS` | `Header`, `Footer` |
| `filters.js` | `FILTER_TABS`, `FILTER_TABS_SHORT`, `FILTER_BG`, `FILTER_BG_FLAT`, `matchesFilter` | `Doctors`, `DoctorsSection` |
| `clinic-info.js` | `CLINIC_FACTS`, `SERVICES`, `WHY_ITEMS` | `Footer`, `ServicesSection`, `WhyUsSection` |
| `constants.js` | `ICON_SIZES`, `RING_COLOR_MAP` | `DoctorCard`, `DoctorPage` |
| `theme-config.js` | `COLOR_THEMES`, `HEADING_FONTS`, `BODY_FONTS`, `NAV_FONTS`, `STORAGE_KEY`, `buildFullPalette`, `hexToHsl`, `hslToHex` | `ThemeSwitcher`, `Layout.astro` (FOUC script) |
| `rate-limit.js` | `checkRateLimit`, `resetRateLimit` | Все API endpoints (admin, analytics, forms, auth) |
| `appointment-validation.js` | Валидация и нормализация расписания, пациента и opaque intent ID | API онлайн-записи |
| `appointment-history.js` | Ограниченная постраничная сверка неясной попытки с историей Medflex | Сценарий онлайн-записи |
| `appointment-intents.js` | Durable intent, HMAC-дедупликация, fencing и атомарные переходы состояния | Сценарий онлайн-записи и startup-миграция |
| `appointment-booking.js` | Оркестрация возобновления, live-slot проверки, создания записи и reconciliation | `api/appointments/book` |
| `appointment-schedule.js` | Browser-safe нормализация расписания и повторная серверная проверка слота | API онлайн-записи |
| `medflex-client.js` | Фиксированный server-only клиент официального API | API онлайн-записи и discovery |
| `medflex-doctors.js` | Явный allowlist девяти врачей и локальных типов приёма | API онлайн-записи |
| `admin-api.js` | `guardAdminRead`, `guardAdminWrite` | Все `api/admin/*` endpoints |
| `file-constraints.js` | `MAX_FILES`, `MAX_FILE_SIZE_BYTES`, `ALLOWED_EXTENSIONS`, `ALLOWED_MIME_TYPES` | `SecondOpinionForm`, `api/second-opinion` |
| `useAdminFetch.js` | `useAdminFetch` | `Dashboard`, `DoctorList`, `SessionsViewer`, `LogsViewer` |
| `useHeroFit.js` | `useHeroFit` | Все 17 страниц с hero-блоком (auto-fit font size) |

### Админ-панель (SSR - серверные)

| Маршрут | Описание |
|---|---|
| `/admin/login` | Страница входа (пароль из `.env`) |
| `/admin` | Дашборд: статистика, графики, лента событий |
| `/admin/sessions` | Активные сессии с авто-обновлением каждые 10с |
| `/admin/logs` | Логи всех событий с фильтрами и пагинацией |
| `/admin/doctors` | Редактирование данных докторов |

---

## Home.jsx: модульная композиция

`Home.jsx` (84 строки) — тонкий композиционный файл, импортирующий 9 секций из `src/components/home/`:

| Компонент | Строк | Содержимое |
|---|---|---|
| `HeroSlider.jsx` | 337 | Трёхслайдовый hero с clinic-first первым экраном, быстрым выбором направлений на mobile и ARIA carousel pattern |
| `SecondOpinionSection.jsx` | 53 | Баннер «Второе мнение» |
| `VabSection.jsx` | 57 | Блок ВАБ |
| `ServicesSection.jsx` | 64 | Editorial-список направлений + featured routes |
| `WhyUsSection.jsx` | 74 | «Почему выбирают» + статистика |
| `DoctorsSection.jsx` | — | Фильтры + полноэкранная mobile-карусель / desktop-карточки врачей |
| `DirectContactSection.jsx` | 61 | «Прямая связь» + телефон/Telegram |
| `ReviewsSection.jsx` | 78 | Отзывы пациентов |
| `AppointmentFormSection.jsx` | — | First-party CTA; данные пациента вводятся только внутри общего `BookingFlow` |

### Hero-слайдер

Трёхслайдовый hero с clinic-first сценарием: на mobile перед hero-контентом показывается быстрый выбор 4 направлений, а первый слайд позиционирует клинику как многопрофильную. Карточка врача скрыта на mobile и остаётся только на desktop. Текст начинается от верхнего левого края слайда; на desktop стрелки вынесены по сторонам, а на mobile остаются снизу. Нижние точки и кнопка паузы не отображаются. Автопереключение выполняется каждые 12 секунд и отключается при `prefers-reduced-motion`. Все слайды наложены в одной CSS-grid ячейке, поэтому hero сразу получает высоту самого высокого слайда и не меняет её при переключении.

Текстовая колонка во всех двухколоночных публичных hero закреплена у верхнего левого края независимо от высоты соседней карточки. Геометрический контракт основных маршрутов проверяет `e2e/hero-alignment.spec.js`.

### Слайды

1. **Клиника целиком** — все ключевые направления и понятный маршрут пациента
2. **ВАБ** — акцент на малоинвазивной процедуре, длительности и амбулаторном формате
3. **Второе мнение** — сценарий для пациентов с уже назначенной операцией

---

## Дизайн-система: Skinnable CSS Architecture

UI построен на CSS-переменных в `:root` (`src/styles/global.css`). Вся визуальная стилизация управляется через ~87 CSS-переменных — без inline-стилей в JSX, без hardcoded цветов. Пакет `claymorphism-css` полностью удалён (март 2026), класс `.clay` оставлен пустым для обратной совместимости.

### Ключевые CSS-переменные

| Группа | Переменные | Описание |
|---|---|---|
| Поверхности | `--surface-page`, `--surface-card`, `--surface-accent`, `--surface-mint/peach/blue/lavender/yellow` | Фоны страницы, карточек, акцентных блоков |
| Текст | `--text-primary`, `--text-secondary`, `--text-muted`, `--text-inverse` | Цвета текста |
| Акцент | `--accent`, `--accent-hover`, `--accent-light`, `--accent-text` | Основной акцентный цвет (по умолчанию emerald #1B6B5A) |
| Специализации | `--color-mint`, `--color-peach`, `--color-blue`, `--color-lavender`, `--color-yellow` + `*-rgb`, `*-hover` | Цвета направлений клиники |
| Шрифты | `--font-body`, `--font-serif`, `--font-nav` | Текст (Golos Text), заголовки (Cormorant Garamond), навигация (наследует body) |
| Тени | `--shadow-xs/sm/md/lg/xl`, `--shadow-mint/peach/blue` | Тени с поддержкой акцентных цветов |
| Скругления | `--radius-sm/md/lg/xl/full` | Радиусы углов |
| Градиенты | `--gradient-badge-mint/peach/blue`, `--gradient-card-mint/peach/blue`, `--gradient-cta` | Градиенты для бейджей, карточек, CTA |
| Декор | `--decoration-display` | Включение/отключение декоративных элементов (blobs, orbs) |

### ThemeSwitcher (`src/components/ThemeSwitcher.jsx`)

Плавающая кнопка (палитра) в правом нижнем углу. Открывает панель с тремя секциями:

1. **Акцент** — 20 цветовых пресетов (emerald, slate-blue, dusty-rose, warm-clay, sage, indigo, teal, amber, plum, crimson, ocean, forest, graphite, copper, midnight, mauve, moss, terracotta, steel, burgundy) + hue-strip для произвольного цвета. При выборе цвета `buildFullPalette()` автоматически рассчитывает всю палитру (peach, blue, lavender, yellow, тени, градиенты).
2. **Заголовки** — 10 серифных шрифтов (Cormorant Garamond по умолчанию, Playfair Display, Lora, Merriweather, PT Serif, EB Garamond, Libre Baskerville, Spectral, Crimson Pro, DM Serif Display)
3. **Меню** — шрифт навигации в хедере и футере. «Как текст» (наследует body font) + те же 10 серифных шрифтов. Применяется через CSS-переменную `--font-nav`.
4. **Текст** — 10 sans-serif шрифтов (Golos Text по умолчанию, Commissioner, Onest, Manrope, Rubik, Nunito, Inter, PT Sans, Open Sans, Raleway)

Настройки сохраняются в `localStorage` (`clod-theme-settings`). FOUC предотвращается inline-скриптом в `Layout.astro`, который восстанавливает тему до первой отрисовки.

### Font Size Controls (`src/layouts/Layout.astro`)

Фиксированные кнопки `A+ / A / A−` в правом нижнем углу управляют базовым размером текста на всём публичном сайте через `document.documentElement.style.fontSize`.

- Шаг изменения: `5%`
- Базовое значение: `100%`
- Диапазон: от `65%` до `135%` (`7` шагов вниз и `7` шагов вверх)
- Значение сохраняется в `localStorage` (`clod-font-size`)

### Tailwind fontFamily

```js
fontFamily: {
  sans:  ['var(--font-body)'],   // основной текст
  serif: ['var(--font-serif)'],  // заголовки
  nav:   ['var(--font-nav)'],    // навигация (хедер + футер)
}
```

### CSS-утилиты (классы)

**Карточки:** `clay-card`, `clay-card-lg`, цветные карточки (`mint/peach/blue/lavender/yellow` и `soft-*` варианты)

**Кнопки:** `btn-clay-primary`, `btn-clay-secondary`, `btn-clay-white`, `pill-filter`

**Иконки:** `icon-circle-mint/peach/blue/lavender/yellow`

**Заголовки:** `heading-display` (serif, light), `heading-serif` (serif, regular), `heading-accent` (serif, italic, акцентный цвет)

**Лейаут:** `section`, `container-clay`

> Правило: **никогда не использовать inline-стили** для цветов, теней, фонов — только CSS-переменные и утилит-классы.

---

## Паттерны кода

### Компоненты

```jsx
// ✅ Правильно - function, named export, RORO
export function ClayCard({ title, children, variant = 'default' }) {
  return <div className="clay-card">{children}</div>
}

// ❌ Неправильно - const, default export
const ClayCard = (props) => { ... }
export default ClayCard
```

### Статические данные

```jsx
// Вне компонента, UPPER_SNAKE_CASE
const NAV_ITEMS = [{ label: 'Маммология', to: '/mammology' }]

export function Nav() {
  return NAV_ITEMS.map(item => <NavLink key={item.to} {...item} />)
}
```

### Обработка ошибок (guard clauses)

```jsx
function DoctorCard({ doctor }) {
  if (!doctor) return null
  if (!doctor.name) return <SkeletonCard />
  return <div>{doctor.name}</div>
}
```

### Состояния загрузки

```jsx
const [isLoading, setIsLoading] = useState(false)
const [hasError, setHasError] = useState(false)
const [errorMessage, setErrorMessage] = useState('')
```

---

## Принципы разработки

- Функциональный, декларативный стиль - без классов
- Без точек с запятой
- Директории в `kebab-case` (`components/clay-card`, `pages/second-opinion`)
- Мобильный-first: Tailwind breakpoints `sm:` → `md:` → `lg:`
- Изображения: `loading="lazy"`, предпочтительно WebP, всегда `width` и `height`
- Порядок в файле: компонент → подкомпоненты → хелперы → статические данные

---

## Конфигурация Astro

```js
// astro.config.mjs
integrations: [
  react(),                              // React-компоненты в .astro-файлах
  tailwind({ applyBaseStyles: false }), // Tailwind без сброса базовых стилей
]
```

Лейаут (`Layout.astro`) подключает:
- Шрифт Inter (Google Fonts)
- `global.css` (Tailwind + CSS-переменные дизайн-системы)
- `Header` с `client:load` (интерактивный)
- один глобальный `BookingFlow` с `client:load` для всех CTA записи
- `Footer` (статический)
- `<slot />` для контента страниц
- Open Graph / Twitter Card мета-теги (включая `og:image:width`, `og:image:height`, `og:image:alt`)
- Canonical URL
- JSON-LD `MedicalBusiness` structured data (на всех страницах)
- JSON-LD `Physician` structured data (на страницах `/doctors/[slug]`)

---

## SEO & GEO оптимизация

### Реализованные улучшения

| Задача | Статус | Описание |
|---|---|---|
| A1 - Sitemap | ✅ | `@astrojs/sitemap` автогенерация, удалён хардкодный `public/sitemap.xml` |
| A2 - GEO-метатеги | ✅ | `geo.region`, `geo.placename`, `geo.position`, `ICBM` в `Layout.astro` |
| A3 - Keywords | ✅ | `keywords` prop в `Layout.astro`, заполнен на всех страницах |
| A4 - JSON-LD расширен | ✅ | `priceRange`, `hasMap`, `aggregateRating`, `sameAs`, полный `PostalAddress` |
| A5 - BreadcrumbNav | ✅ | `BreadcrumbNav.jsx` с `BreadcrumbList` JSON-LD на всех внутренних страницах |
| A6 - Самохостинг шрифтов | ✅ | Inter woff2 в `public/fonts/`, `@font-face` в `global.css`, `<link rel="preload">` |
| B1 - Страница /vab | ✅ | `MedicalProcedure` + `FAQPage` JSON-LD, полный контент |
| B2 - FaqSection + /contacts | ✅ | `FaqSection.jsx` с FAQPage schema, страница контактов |
| B3 - Углубление специализаций | ✅ | H2/H3 структура, цены, FAQ на всех страницах специализаций |
| B4 - Блог | ✅ | 40 статей, `ItemList` + `MedicalWebPage` JSON-LD |
| B5 - Страницы врачей E-E-A-T | ✅ | Публикации, TV-ссылки, proDoctorovUrl, расширенный Physician JSON-LD |
| C1 - ogImage на страницах врачей | ✅ | Фото врача передаётся как `ogImage` в `Layout.astro` для страниц `/doctors/[slug]` |
| C2 - ogImage на страницах блога | ✅ | Изображение статьи из frontmatter передаётся как `ogImage` для `/blog/[slug]` |
| C3 - OG расширенные теги | ✅ | `og:image:width` (1200), `og:image:height` (630), `og:image:alt` добавлены в `Layout.astro` |
| C4 - addressRegion в Physician schema | ✅ | `"addressRegion": "Санкт-Петербург"` добавлен в `worksFor.address` JSON-LD врачей |
| E19 - Онлайн-запись на главной | ✅ | `AppointmentFormSection` открывает общий first-party `BookingFlow`; данные пациента не дублируются в секции главной |
| E20 - Блок отзывов на главной | ✅ | `ReviewsSection` в `Home.jsx`: 4 карточки с именем, звёздами, текстом и датой |
| E22 - Страница О клинике | ✅ | `/about` - миссия (приветствие главврача), руководство (3 человека), документы (лицензия, СОУТ, реквизиты), преимущества (6 пунктов), оборудование (4 пункта), CTA |
| E24 - Способы оплаты на /prices | ✅ | Секция "Способы оплаты" в `Prices.jsx`: наличные/карты, ДМС, рассрочка |
| E25 - Sticky CTA на мобильных | ✅ | `StickyCTA.jsx` в `Layout.astro`: "Позвонить" + "Записаться", `md:hidden` |
| E26 - Фасад для Яндекс.Карт | ✅ | Замена iframe карты на фасад-заглушку в `Contacts.jsx` для снижения TBT |

### Блог (`/blog`)

Блог реализован через **Astro Content Collections** (`src/content/blog/`):

- Статьи в формате Markdown с frontmatter (title, description, keywords, publishDate, author, category, tags)
- Схема коллекции в `src/content/config.ts`
- `/blog` - листинг статей с `ItemList` JSON-LD
- `/blog/[slug]` - статья с `MedicalWebPage` JSON-LD (author = Physician, medicalAudience = Patient)
- Автор статьи связывается с данными из `doctors-data.js` по `authorSlug`
- Стили для контента статей: класс `.prose-clay` в `global.css` (кастомные заголовки с акцентом, стилизованные списки, таблицы с закруглёнными углами)
- Layout страницы статьи: двухколоночный grid (`blog-article-layout`) - основной контент + sticky боковая панель с автором и кнопкой записи (на десктопе ≥1024px)
- Контейнер статьи: `container-clay` (max-w-6xl) вместо узкого max-w-3xl

**Приоритетные статьи:**
- `vab-ili-operatsiya` - ВАБ или операция при фиброаденоме
- `chto-takoe-fibroadenoma` - Фиброаденома: причины, симптомы, лечение
- `kak-izbezhat-operatsii-na-grudi` - Как избежать операции на молочной железе
- `mammografiya-ili-uzi` - Маммография или УЗИ: что выбрать
- `gipotireoz-simptomy-lechenie` - Гипотиреоз: симптомы, диагностика и лечение

**Недавно добавленные статьи:**
- `fibroadenoma-chastye-voprosy` - Фиброаденома. Частые вопросы
- `rannyaya-diagnostika-raka-grudi` - Ранняя диагностика рака груди
- `kista-molochnoy-zhelezy` - Киста молочной железы: причины, симптомы, лечение
- `eroziya-sheyki-matki` - Эрозия шейки матки. Мифы и правда
- `15-pravil-grudnogo-vskarmlivaniya` - 15 правил грудного вскармливания
- `mylnaya-opera-o-kistoznoy-mastopatii` - Мыльная опера о кистозной мастопатии
- `simptomy-gipotireoza-i-gipertireoza` - Симптомы ГИПОтиреоза и ГИПЕРтиреоза
- `tonkoigolnaya-punktsionnaya-biopsiya` - Тонкоигольная пункционная биопсия молочных желёз
- `kak-prokhodit-priem-ginekologa` - Как проходит приём гинеколога
- `kak-podgotovitsya-k-priemu-ginekologa` - Как подготовиться к приёму гинеколога
- `kak-podgotovitsya-k-priemu-endokrinologa` - Как подготовиться к приёму эндокринолога

**SEO/GEO на страницах блога:**
- Meta: title, description, keywords, canonical URL
- GEO: `geo.region`, `geo.placename`, `geo.position`, `ICBM` (из Layout)
- Open Graph: og:type=article, og:image, article:published_time, article:modified_time, article:author, article:section, article:tag
- JSON-LD: MedicalWebPage с keywords, spatialCoverage (Санкт-Петербург), author=Physician
- Fallback: при отсутствии keywords - автогенерация из category + title + «СПб, Санкт-Петербург»

**Добавление новой статьи:**
1. Создать файл `src/content/blog/slug-statyi.md`
2. Заполнить frontmatter (title, description, keywords, publishDate, author, authorSlug, category, tags)
3. Для GEO: включить в keywords «СПб» и «Санкт-Петербург» (при отсутствии - fallback сработает автоматически)
4. Написать контент в Markdown
5. Статья автоматически появится на `/blog` и `/blog/slug-statyi`

---

## Docker-деплой на VPS

**Пошаговая инструкция по деплою на Beget VPS (Ubuntu) из GitHub:** см. [DEPLOY-BEGET.md](./DEPLOY-BEGET.md) - создание VPS, установка Docker, клонирование репозитория, настройка `.env`, получение SSL (Let's Encrypt) и обновление сайта.

### Файлы конфигурации

| Файл | Назначение |
|---|---|
| `Dockerfile` | Multi-stage сборка: builder (bun install + build) → runner (slim, node entry.mjs) |
| `.dockerignore` | Исключает `node_modules`, `dist`, `.git`, `.env` из образа |
| `docker-compose.yml` | Стек: `app` (Astro) + `nginx` (reverse proxy) + `certbot` (Let's Encrypt) |
| `nginx.conf` | Рабочий конфиг по умолчанию: только HTTP (без путей к сертификатам — подходит для IP) |
| `nginx.https.conf` | Шаблон с HTTPS; после Certbot копируют в `nginx.conf` (см. DEPLOY-BEGET.md) |
| `nginx.bootstrap.conf` | Временная конфигурация HTTP для первичного выпуска сертификата Let's Encrypt |
| `.env.example` | Шаблон переменных окружения для production |

### Переменные окружения (`.env` на сервере)

| Переменная | Описание |
|---|---|
| `ADMIN_PASSWORD` | Пароль для входа в админ-панель |
| `TOKEN_SECRET` | Секрет для HMAC-подписи токенов |
| `MEDFLEX_CLINIC_TOKEN` | Server-only токен клиники для Medflex API; никогда не использовать префикс `PUBLIC_` |
| `BOOKING_INTENT_SECRET` | Отдельный стабильный server-only HMAC-секрет для защищённой дедупликации записи |
| `ASTRO_DB_REMOTE_URL` | Путь к SQLite-файлу: `file:/data/db.sqlite` |

### Первый деплой (Bootstrap HTTPS)

> DNS домена должен указывать на IP сервера до шага 3.

```bash
# 1. Установить Docker на сервере
apt install docker.io docker-compose-plugin

# 2. Клонировать репозиторий
git clone <repo> /srv/clod && cd /srv/clod

# 3. Создать .env из шаблона и заполнить
cp .env.example .env

# 4. Запустить Nginx в bootstrap-режиме (только HTTP)
cp nginx.bootstrap.conf nginx.conf
docker compose up -d nginx

# 5. Получить SSL-сертификат
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d odintsovclinic.ru -d www.odintsovclinic.ru \
  --email admin@odintsovclinic.ru --agree-tos --no-eff-email

# 6. Переключить на HTTPS: скопировать шаблон в nginx.conf, править домен, поднять стек
cp nginx.https.conf nginx.conf
# отредактировать nginx.conf: server_name и пути /etc/letsencrypt/live/ВАШ_ДОМЕН/
docker compose up -d --build
```

### Обновление (деплой новой версии)

С локальной машины разработчика (рекомендуемый способ):

```bash
bun run deploy
```

Скрипт `scripts/deploy.sh` выполняет: git pull → docker prune → docker compose build → nginx reload. Параметры: `DEPLOY_HOST` (по умолчанию `clod`), `DEPLOY_DIR` (по умолчанию `/srv/clod`).

Или вручную на сервере:

```bash
cd /srv/clod && git pull && docker system prune -af && docker compose up -d --build
```

### Автообновление SSL-сертификата

Certbot-контейнер проверяет сертификат каждые 12 часов автоматически.
Для применения обновлённого сертификата добавьте cron на хосте:

```
0 3 * * * docker compose -f /srv/clod/docker-compose.yml exec nginx nginx -s reload
```

---

## Последние изменения (апрель 2026)

### Tech debt, accessibility и оптимизация (апрель 2026)

- **WCAG 2.1 AA аудит**: ThemeSwitcher focus trap, LoginForm aria-describedby, carousel ARIA pattern, prefers-reduced-motion, touch targets 44px, alt-текст, контрасты
- **NOINDEX для staging**: `X-Robots-Tag: noindex` через nginx + middleware для `new.odintsovclinic.ru`
- **Rate limiting**: единая утилита `rate-limit.js` с namespace-изоляцией, admin-api guards (60 read / 20 write req/min), lazy eviction
- **Дедупликация кода**: `useAdminFetch` хук (4 admin-компонента), `file-constraints.js` (upload-константы), `theme-config.js` (пресеты + palette generation)
- **Home.jsx split**: 1009→84 строк, 9 модульных компонентов в `src/components/home/`
- **ThemeSwitcher**: 770→378 строк, конфиг и palette-логика вынесены в `theme-config.js`
- **Сжатие изображений**: OG + blog картинки 207MB→1.7MB (-99%), решает "no space left" при Docker-билде
- **Hero auto-fit**: `useHeroFit` хук на 17 страницах — авто-подгонка размера шрифта под viewport
- **CI**: Bun cache, security audit job, 0 lint errors/warnings, 192/192 тестов
- **Docker**: non-root user, HEALTHCHECK, deploy.sh с авто-очисткой Docker-кэша
- **Полные ФИО врачей** в навигационном меню
- **Lighthouse a11y**: badge contrast 3.1→4.9:1, heading order fix, label-in-name fix

### Последние изменения (март 2026)

### Масштабное расширение сайта (roadmap-implementation)

- **8 condition-лендингов**: `/fibroadenoma`, `/mastopatiya`, `/kista-molochnoy-zhelezy`, `/eroziya-sheyki-matki`, `/gipotireoz`, `/adenomioz`, `/endometrioz`, `/tireoidit-khashimoto` — каждая с Hero, симптомами, диагностикой, лечением, timeline, FAQ (JSON-LD), CTA, перелинковкой
- **Mega-menu навигация**: `Header.jsx` переписан с поддержкой 3-уровневой вложенности, колонки по специализациям, condition-ссылки, ВАБ CTA; mobile: аккордеоны
- **Pagefind поиск**: `SearchModal.jsx` — модальный поиск по всему сайту (49 страниц), лупа в header, mobile search
- **Новые страницы**: `/dlya-inogorodnikh` (для иногородних), `/nashi-rezultaty` (count-up анимации, статистика), `/media` (агрегация TV-выступлений)
- **ПроДокторов интеграция**: `StarRating.jsx`, рейтинги в `DoctorCard.jsx` и `DoctorPage.jsx`, данные в `doctors-data.js`
- **Коллекция врачей**: на `/doctors` после route chrome и desktop-breadcrumbs коллекция начинается с `h1` «Ваши доктора» и фильтров только по специальностям; повторное нажатие активной специальности возвращает всех врачей без отдельной кнопки «Все доктора». Затем mobile показывает круговой многослойный coverflow прозрачных `*-mobile.webp` с общей объёмной плашкой, а desktop — сетку карточек; редакционный блок `h2` «Врачи клиники Одинцова» следует после коллекции. Карусель сохраняет прямую проекцию без светлого ореола, непрозрачный тонально высветленный ближний слой, мягкий дальний слой, фиксированные две строки ФИО, стабильные действия и feedback только при реальном переключении.
- **Scroll-анимации**: `FadeInSection.jsx` (Intersection Observer), `CountUp` в Home.jsx hero, визуальный timeline в Vab.jsx
- **Интерлинковка**: секции «Заболевания» на pillar-страницах (Mammology, Gynecology, Endocrinology), `RelatedArticles.jsx` в блоге, `PillarPageLink` в sidebar
- **About расширен**: секция «Маршрут пациента» (5-step flowchart), секция «Наши принципы» (4 карточки)
- **Footer**: 4-колоночная раскладка с новыми группами
- **FAQ на направлениях**: 6 вопросов на каждой странице специализации + FAQPage JSON-LD
- **WCAG 2.1 AA**: контрастность обновлена (`clay-muted` → #465550, `clay-text` → #2D3A34), focus rings, dialog a11y, hero tablist
- **Дизайн-токены**: mint-шкала 400-700, admin-палитра, `.dot-peach-light`/`.dot-blue-light`/`.dot-mint-light`
- **UX-копирайтинг**: улучшены error/success messages, privacy notices, helper text для форм
- **Конверсия**: боковая навигация hero, CTA hierarchy (primary vs secondary), ВАБ stacked cards на mobile

### Глобальная ревизия терминологии и контента (февраль 2026)

- **Терминология**: «Аудит» → «Бесплатное второе мнение» во всём сайте; «Флагман» → «Основное направление»; «Неврология» → «Нутрициология» (меню, футер, мета-теги, URL breadcrumbs)
- **Публичные claims**: неподтверждённые формулировки про «№1 в России», «99% пациентов», «личный кабинет» и фиксированные сроки выдачи результатов убраны или смягчены на публичных страницах
- **Hero Block**: hero приведён к truthful-copy; справа остаются только цифровые карточки с поддерживаемыми метриками, без старого контракта `HeroVisual*`
- **ВАБ**: добавлен блок счётчиков (1000+ процедур, 50+ обученных врачей); «флагман» → «топ-манипуляция»; убраны фразы «без операции»; декомпозиция цены (базовая + дополнительные услуги отдельно)
- **Маммология**: добавлена услуга «Удаление образований молочной железы» в прайс; убрана фраза «поможем выбрать хирурга»
- **Второе мнение**: убрана фраза «поможем выбрать хирурга»; обновлена статистика
- **Прайс-лист**: убрана формулировка «ВАБ под ключ»; декомпозиция стоимости на базовую и дополнительные позиции
- **Прямая связь**: новый блок на главной с гарантией ответа в день обращения; переименован «Врач в мессенджере» → «Лично врачу»
- **Контакты/Футер**: добавлена ссылка и иконка ВКонтакте (`VK_URL` в `contacts.js`)
- **Блог**: добавлены категории (Статьи, События клиники, Клинические случаи, Видео); секция «Врачи на телевидении»; CTA на запись и консультацию
- **Нутрициология**: переименован маршрут и файлы с `/neurology` на `/nutrition`, полностью переписан контент под нутрициологию.
- **Блог (редизайн)**: карусель для видео "Врачи на ТВ", генерация тематических `og:image` (Unsplash) для всех статей, вывод картинок в карточках статей, улучшенные градиенты и тени.
- **Онлайн-запись**: внешний виджет заменён единым first-party `BookingFlow`; все CTA работают через same-origin API, а страницы и карточки девяти врачей передают только публичный slug.
- **SEO/Редиректы**: настроены 301-редиректы для всех старых адресов сайта (изменения зафиксированы в `astro.config.mjs`).
- **Производительность (Lighthouse)**: загрузка `tracker.js` с `defer` не блокирует отрисовку; уменьшено число декоративных орбов в DOM (18→10); для орбов добавлен `will-change: transform` (композированные анимации); в middleware — `Cache-Control: public, max-age=31536000, immutable` для `/_astro/`, `/fonts/`, `/images/`; в nginx включено gzip для текстовых ответов.
- **Lighthouse (доп.)**: неиспользуемый JS снижен за счёт `client:idle` для StickyCTA и About (отдельные чанки, загрузка при idle); LCP на странице «О клинике» — фото главврача с `loading="eager"` и `fetchPriority="high"`; блокирующий CSS страницы «О клинике» сделан неблокирующим (post-build скрипт `scripts/async-about-css.mjs`: `media="print"` + `onload="this.media='all'"`).

### Редизайн и тематизация (март–апрель 2026)

- **Luxury redesign**: переход от claymorphism к чистой premium-эстетике — белый фон, тонкие 1px-бордеры, минимальные тени, пакет `claymorphism-css` полностью удалён
- **Skinnable CSS-архитектура**: ~87 CSS-переменных в `:root` управляют всей визуальной системой; inline-стили в JSX запрещены
- **ThemeSwitcher**: плавающая кнопка с панелью настроек — 20 цветовых пресетов + hue-strip, 3 шрифтовых селектора (заголовки, меню, текст); автоматический расчёт палитры через `buildFullPalette()`; localStorage-персистенция; FOUC-предотвращение через inline-скрипт в Layout.astro
- **Шрифт навигации** (`--font-nav`): отдельная CSS-переменная для хедера и футера, настраивается через ThemeSwitcher (11 вариантов: «Как текст» + 10 серифных шрифтов)
- **3 новых condition-лендинга**: `/adenomioz` (Аденомиоз), `/endometrioz` (Эндометриоз), `/tireoidit-khashimoto` (Тиреоидит Хашимото) — MedicalCondition JSON-LD, полный контент
- **Blog Image Generator**: внутренний инструмент `/blog-images` (SSR) для генерации AI-постеров к статьям блога
- **Блог расширен**: с 16 до 40 статей

---

## Обновление этого файла

Этот README должен обновляться при следующих изменениях:

- Добавление новой страницы → обновить таблицу роутинга и структуру файлов
- Добавление нового компонента → обновить структуру файлов
- Новые CSS-переменные в `global.css` → обновить раздел дизайн-системы
- Новые цвета/шрифты в ThemeSwitcher → обновить раздел дизайн-системы
- Изменение стека (зависимости в `package.json`) → обновить таблицу стека
- Изменение правил в `.cursor/rules/` → синхронизировать разделы паттернов
