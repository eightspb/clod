# Клиника Одинцова - Project README

> Сайт клиники экспертной медицины. Быстрый контекст для AI-агентов и разработчиков.

---

## Стек технологий

| Слой | Технология |
|---|---|
| Runtime | **Bun** (не npm/yarn) |
| Фреймворк | **Astro 4** + React 18 (island architecture) |
| База данных | **@astrojs/db** (SQLite) |
| Стилизация | **Tailwind CSS 3** + кастомные clay-утилиты в `src/styles/global.css` |
| Иконки | **Lucide React** |
| CSS-библиотека | `claymorphism-css` (npm-пакет, импортируется в global.css) |
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

---

## Тестирование и CI/CD

### Команды

| Команда | Описание |
|---------|----------|
| `bun run test` | Запуск юнит-тестов в watch-режиме |
| `bun run test:run` | Однократный прогон юнит-тестов |
| `bun run test:coverage` | Тесты с отчётом покрытия |
| `bun run test:e2e` | E2E-тесты (Playwright) |
| `bun run lint` | Проверка кода ESLint |
| `bun run lint:fix` | Автоисправление ESLint |

### Покрытие тестами

- **Юнит-тесты (Vitest)**: 56 тестов в `src/lib/*.test.js`, `src/components/*.test.jsx` - полное покрытие: nav, contacts, filters, auth (validateOrigin, cookie), upload-validation (doctorId, extension), DoctorCard, CtaSection
- **E2E-тесты (Playwright)**: 7 тестов в `e2e/` - главная страница, навигация, blog

### GitHub Actions CI

При push/PR в `main` или `develop` выполняются:

1. **Lint** - ESLint
2. **Unit tests** - Vitest (56 тестов)
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
- Интерактивные части - React `.jsx`-компоненты с директивой `client:load`
- Лейаут оборачивает все страницы через `<slot />`

```
Публичный запрос → src/pages/*.astro (prerendered) → Layout.astro → components/pages/*.jsx
Админ запрос     → src/pages/admin/*.astro (SSR) → AdminLayout.astro → components/admin/*.jsx
API запрос       → src/pages/api/**/*.js (SSR)
```

Только `Header.jsx` и все admin-компоненты рендерятся на клиенте (`client:load`).

### Аналитика и трекинг

Клиентский трекер (`public/tracker.js`) автоматически подключается на всех публичных страницах и собирает:
- Сессии посетителей (IP, UA, экран, язык, referrer)
- Просмотры страниц с длительностью
- Клики на кнопки и ссылки
- Отправки форм
- Переходы между страницами

Данные хранятся в трёх таблицах БД: `AnalyticsSession`, `PageView`, `EventLog`.

### Безопасность

- **Security headers** - добавлены через `src/middleware.js` (X-Frame-Options, X-Content-Type-Options, HSTS в production и т.д.)
- **Rate limiting** - login: 5 попыток / 15 мин; аналитика: 100 req/min (event), 120 req/min (heartbeat)
- **CSRF-защита** - проверка заголовка `Origin`/`Referer` на всех state-changing API
- **Санитизация** - валидация и trim всех текстовых полей в admin API; защита от path traversal при загрузке файлов (doctorId, extension)
- **Разделение секретов** - `TOKEN_SECRET` для HMAC (fallback на `ADMIN_PASSWORD`), `Secure` cookie в production

### Переменные окружения (`.env`)

| Переменная | Описание |
|---|---|
| `ADMIN_PASSWORD` | Пароль для входа в админ-панель |
| `TOKEN_SECRET` | Секрет для HMAC-подписи токенов (рекомендуется длинная случайная строка) |

### Админ-панель

Доступна по адресу `/admin/login`. Защита - одним паролем из `.env` (`ADMIN_PASSWORD`).

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
│   │   ├── pages/                 # React-компоненты страниц
│   │   │   ├── Home.jsx           # Главная: герой-слайдер, услуги, доктора, отзывы, форма записи
│   │   │   ├── About.jsx          # Страница "О клинике": миссия, руководство, документы, преимущества, оборудование
│   │   │   ├── Mammology.jsx
│   │   │   ├── Gynecology.jsx
│   │   │   ├── Endocrinology.jsx
│   │   │   ├── Neurology.jsx
│   │   │   ├── Vab.jsx            # Страница ВАБ-процедуры
│   │   │   ├── Contacts.jsx       # Страница контактов с картой
│   │   │   ├── SecondOpinion.jsx
│   │   │   ├── Prices.jsx
│   │   │   ├── Doctors.jsx        # Листинг всех докторов с фильтрами
│   │   │   ├── DoctorPage.jsx     # Страница отдельного доктора
│   │   │   └── PrivacyPolicy.jsx  # Политика конфиденциальности
│   │   ├── admin/                 # Компоненты админ-панели
│   │   │   ├── LoginForm.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── DoctorManager.jsx  # Контейнер списка докторов
│   │   │   ├── DoctorEditForm.jsx # Форма редактирования (модалка)
│   │   │   ├── DoctorPhotoUpload.jsx # Загрузка фото доктора
│   │   │   ├── DoctorCertificates.jsx # Управление сертификатами
│   │   │   ├── SessionsViewer.jsx
│   │   │   └── LogsViewer.jsx
│   │   ├── Header.jsx             # Навигация (client:load, мобильное меню)
│   │   ├── Footer.jsx             # Подвал сайта
│   │   ├── StickyCTA.jsx          # Фиксированная панель внизу экрана (только mobile, md:hidden)
│   │   ├── ClayContactBanner.jsx  # Баннер с контактами
│   │   ├── DoctorCard.jsx         # Переиспользуемая карточка доктора
│   │   ├── CtaSection.jsx         # Переиспользуемый CTA-блок
│   │   ├── ErrorBoundary.jsx      # React Error Boundary для page-level компонентов
│   │   └── PageWrapper.jsx        # Обёртка страницы с ErrorBoundary
│   ├── layouts/
│   │   ├── Layout.astro           # Главный лейаут (OG-теги, canonical, JSON-LD)
│   │   └── AdminLayout.astro      # Лейаут админ-панели (с проверкой авторизации)
│   ├── lib/
│   │   ├── auth.js                # HMAC-авторизация (токены, cookie, CSRF validateOrigin)
│   │   ├── constants.js           # UI-константы: ICON_SIZES, RING_COLOR_MAP
│   │   ├── contacts.js            # Контактные данные: телефоны, адрес, часы, мессенджеры
│   │   ├── nav.js                 # Навигация: DIRECTIONS, NAV_ITEMS, FOOTER_LINKS
│   │   ├── filters.js             # Фильтры докторов: FILTER_TABS, FILTER_BG, matchesFilter
│   │   ├── clinic-info.js         # Данные клиники: CLINIC_FACTS, SERVICES, WHY_ITEMS
│   │   └── doctors-data.js        # Статические данные 9 докторов клиники
│   ├── content/                   # Astro Content Collections
│   │   ├── config.ts              # Схема коллекций (blog: title, description, author, tags…)
│   │   └── blog/                  # Markdown-статьи блога
│   │       ├── vab-ili-operatsiya.md
│   │       ├── chto-takoe-fibroadenoma.md
│   │       ├── kak-izbezhat-operatsii-na-grudi.md
│   │       ├── mammografiya-ili-uzi.md
│   │       ├── gipotireoz-simptomy-lechenie.md
│   │       └── ... и еще 11 новых статей
│   ├── pages/                     # Astro-роуты (file-based routing)
│   │   ├── index.astro            # /
│   │   ├── about.astro            # /about - О клинике (миссия, руководство, документы, преимущества, оборудование)
│   │   ├── mammology.astro        # /mammology
│   │   ├── gynecology.astro       # /gynecology
│   │   ├── endocrinology.astro    # /endocrinology
│   │   ├── neurology.astro        # /neurology
│   │   ├── second-opinion.astro   # /second-opinion
│   │   ├── prices.astro           # /prices
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
│   │   └── global.css             # Tailwind + все clay-утилиты + clay-banner-* + prose-clay (блог)
│   └── env.d.ts                   # Astro type references
├── db/                            # Astro DB
│   ├── config.ts                  # Схема базы данных
│   └── seed.ts                    # Скрипт наполнения (демо-данные)
├── Dockerfile                     # Multi-stage Docker-сборка (builder + runner)
├── docker-compose.yml             # Docker Compose: app + nginx + certbot
├── nginx.conf                     # Nginx: HTTPS reverse proxy (финальный)
├── nginx.bootstrap.conf           # Nginx: только HTTP (для первичного получения SSL)
├── nginx.no-domain.conf           # Nginx: доступ по IP без домена (только HTTP)
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
| `/neurology` | `neurology.astro` | `Neurology.jsx` |
| `/vab` | `vab.astro` | `Vab.jsx` |
| `/contacts` | `contacts.astro` | `Contacts.jsx` |
| `/second-opinion` | `second-opinion.astro` | `SecondOpinion.jsx` |
| `/prices` | `prices.astro` | `Prices.jsx` |
| `/doctors` | `doctors.astro` | `Doctors.jsx` |
| `/doctors/[slug]` | `doctors/[slug].astro` | `DoctorPage.jsx` |
| `/blog` | `blog/index.astro` | - (Astro) |
| `/blog/[slug]` | `blog/[slug].astro` | - (Astro + Content Collections) |
| `/privacy-policy` | `privacy-policy.astro` | `PrivacyPolicy.jsx` |
| `/licenses` | `licenses.astro` | `Licenses.jsx` |
| `/404` | `404.astro` | - (Astro) |

Данные докторов хранятся в `src/lib/doctors-data.js` (статический массив `DOCTORS` с 9 докторами). Каждый доктор имеет поля:

| Поле | Тип | Описание |
|---|---|---|
| `slug` | string | URL-идентификатор (`/doctors/odintsov`) |
| `name` | string | Полное имя |
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

### Централизованные данные (`src/lib/`)

| Файл | Экспорты | Используется в |
|---|---|---|
| `contacts.js` | `PHONE_NUMBER`, `PHONE_DISPLAY`, `PHONE_NUMBER_2`, `PHONE_DISPLAY_2`, `WHATSAPP_URL`, `TELEGRAM_URL`, `ADDRESS`, `HOURS_WEEKDAY`, `HOURS_WEEKEND` | `Footer`, `Header`, `CtaSection`, `ClayContactBanner` |
| `nav.js` | `DIRECTIONS`, `NAV_ITEMS`, `FOOTER_LINKS` | `Header`, `Footer` |
| `filters.js` | `FILTER_TABS`, `FILTER_TABS_SHORT`, `FILTER_BG`, `FILTER_BG_FLAT`, `matchesFilter` | `Doctors`, `Home` |
| `clinic-info.js` | `CLINIC_FACTS`, `SERVICES`, `WHY_ITEMS` | `Footer`, `Home` |
| `constants.js` | `ICON_SIZES`, `RING_COLOR_MAP` | `DoctorCard`, `DoctorPage` |

### Админ-панель (SSR - серверные)

| Маршрут | Описание |
|---|---|
| `/admin/login` | Страница входа (пароль из `.env`) |
| `/admin` | Дашборд: статистика, графики, лента событий |
| `/admin/sessions` | Активные сессии с авто-обновлением каждые 10с |
| `/admin/logs` | Логи всех событий с фильтрами и пагинацией |
| `/admin/doctors` | Редактирование данных докторов |

---

## Hero-блок главной страницы (`Home.jsx`)

Hero реализован как **трёхслайдовый слайдер** с двухколоночным лейаутом (текст слева, визуальный блок справа). Автопереключение каждые 7 секунд.

### Структура каждого слайда

| Элемент | Описание |
|---|---|
| `trustBadge` | Плашка доверия над заголовком (напр. «Технология 2024 года») |
| `badge` | Смысловой вектор / подзаголовок |
| `title` | Крупный заголовок-решение (JSX с цветовым акцентом) |
| `desc` | Описание, снимающее первичный страх/барьер |
| `stats[]` | Цифровой блок: 3 ключевые метрики |
| `primaryBtn` / `secondaryBtn` | CTA-кнопки |
| `visual` | Ключ визуального подкомпонента (`'vab'`, `'opinion'`, `'ecosystem'`) |

### Слайды

1. **ВАБ (Флагман)** - альтернатива операции. Визуал: сравнение прокола 2 мм vs разреза 5 см.
2. **Второе мнение** - для тех, кому уже назначили операцию. Визуал: BI-RADS классификация, шаги загрузки документов.
3. **Экосистема** - гинекология, эндокринология, неврология. Визуал: три направления с тегами результата.

### Визуальные подкомпоненты

```
HeroVisualVab()       - сравнение размеров прокола (прогресс-бары)
HeroVisualOpinion()   - интерфейс BI-RADS + шаги загрузки документов
HeroVisualEcosystem() - карточки трёх направлений с тегами
```

---

## Дизайн-система: Claymorphism

Весь UI построен на кастомной clay-дизайн-системе. Утилиты определены в `src/styles/global.css`.

### Цветовая палитра (`tailwind.config.js` → `colors.clay`)

| Токен | Hex | Назначение |
|---|---|---|
| `clay-mint` | `#4DC8A8` | Основной акцент (тил/зелёный) |
| `clay-peach` | `#F5A88C` | Тёплый акцент |
| `clay-blue` | `#72B8E0` | Холодный акцент |
| `clay-lavender` | `#B8A8D8` | Фиолетовый акцент |
| `clay-yellow` | `#F0C870` | Жёлтый акцент |
| `clay-bg` | `#F7F3EE` | Фон страницы |
| `clay-card` | `#FFFCF8` | Фон карточек |
| `clay-dark` | `#2D3A34` | Тёмный текст/заголовки |
| `clay-text` | `#3D4A44` | Основной текст |
| `clay-muted` | `#7A8C84` | Приглушённый текст |

### CSS-утилиты (классы)

**Карточки:**
```
clay-card              - белая карточка с clay-тенью
clay-card-lg           - то же, крупнее
clay-card-mint         - тил-карточка (градиент)
clay-card-peach        - персиковая карточка
clay-card-blue         - синяя карточка
clay-card-lavender     - лавандовая карточка
clay-card-soft-mint    - пастельный тил (бледный)
clay-card-soft-peach   - пастельный персик
clay-card-soft-blue    - пастельный синий
clay-card-soft-lavender - пастельный лавандовый
```

**Кнопки:**
```
btn-clay-primary   - основная кнопка (тил, pill-форма)
btn-clay-secondary - вторичная кнопка (белая)
btn-clay-white     - белая кнопка
pill-filter        - фильтр-таблетка
```

**Иконки и декор:**
```
icon-circle-mint/peach/blue/lavender/yellow - цветной круг под иконку
blob-mint/peach/blue/lavender              - органические blob-фигуры (фон)
orb                                         - декоративный шар
```

**Бейджи и статистика:**
```
num-badge   - нумерованный шаг
stat-pill   - маленький stat-лейбл
```

**Аватары:**
```
avatar-ring-peach/blue/mint/lavender - цветное кольцо вокруг аватара
```

**Лейаут:**
```
section          - секция с вертикальными отступами
container-clay   - контейнер с горизонтальными отступами
```

### Тени (`tailwind.config.js` → `boxShadow`)

```
shadow-clay          - нейтральная clay-тень
shadow-clay-sm       - маленькая
shadow-clay-lg       - большая
shadow-clay-mint     - тил-тень
shadow-clay-peach    - персиковая тень
shadow-clay-blue     - синяя тень
shadow-clay-lavender - лавандовая тень
```

> Правило: **никогда не использовать `box-shadow` inline**, если есть готовый clay-класс.

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
- `global.css` (Tailwind + clay-утилиты)
- `Header` с `client:load` (интерактивный)
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
| B4 - Блог | ✅ | 5 статей, `ItemList` + `MedicalWebPage` JSON-LD |
| B5 - Страницы врачей E-E-A-T | ✅ | Публикации, TV-ссылки, proDoctorovUrl, расширенный Physician JSON-LD |
| C1 - ogImage на страницах врачей | ✅ | Фото врача передаётся как `ogImage` в `Layout.astro` для страниц `/doctors/[slug]` |
| C2 - ogImage на страницах блога | ✅ | Изображение статьи из frontmatter передаётся как `ogImage` для `/blog/[slug]` |
| C3 - OG расширенные теги | ✅ | `og:image:width` (1200), `og:image:height` (630), `og:image:alt` добавлены в `Layout.astro` |
| C4 - addressRegion в Physician schema | ✅ | `"addressRegion": "Санкт-Петербург"` добавлен в `worksFor.address` JSON-LD врачей |
| E19 - Форма записи на главной | ✅ | `AppointmentFormSection` в `Home.jsx`: поля Имя + Телефон, валидация, состояние успеха |
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
| `nginx.conf` | Финальная конфигурация Nginx с HTTPS (используется после получения сертификата) |
| `nginx.bootstrap.conf` | Временная конфигурация только с HTTP - для первичного получения SSL-сертификата |
| `nginx.no-domain.conf` | Конфиг для доступа по IP без домена (только HTTP, без SSL) |
| `.env.example` | Шаблон переменных окружения для production |

### Переменные окружения (`.env` на сервере)

| Переменная | Описание |
|---|---|
| `ADMIN_PASSWORD` | Пароль для входа в админ-панель |
| `TOKEN_SECRET` | Секрет для HMAC-подписи токенов |
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

# 6. Переключить на финальный nginx.conf (с HTTPS) и поднять весь стек
git checkout nginx.conf
docker compose up -d --build
```

### Обновление (деплой новой версии)

```bash
git pull
docker compose up -d --build
```

### Автообновление SSL-сертификата

Certbot-контейнер проверяет сертификат каждые 12 часов автоматически.
Для применения обновлённого сертификата добавьте cron на хосте:

```
0 3 * * * docker compose -f /srv/clod/docker-compose.yml exec nginx nginx -s reload
```

---

## Обновление этого файла

Этот README должен обновляться при следующих изменениях:

- Добавление новой страницы → обновить таблицу роутинга и структуру файлов
- Добавление нового компонента → обновить структуру файлов
- Новые clay-утилиты в `global.css` → обновить раздел CSS-утилит
- Новые цвета в `tailwind.config.js` → обновить цветовую палитру
- Изменение стека (зависимости в `package.json`) → обновить таблицу стека
- Изменение правил в `.cursor/rules/` → синхронизировать разделы паттернов
