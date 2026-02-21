# Клиника Одинцова — Project README

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

> Нет TypeScript в компонентах. `.jsx` файлы — чистый JS.

---

## Запуск проекта

```bash
bun run dev      # dev-сервер на localhost:4321
bun run build    # production-сборка в dist/
bun run preview  # превью собранного билда
```

---

## Архитектура

Проект использует **Astro island architecture**:

- Страницы — `.astro`-файлы (статический HTML + слоты)
- Интерактивные части — React `.jsx`-компоненты с директивой `client:load`
- Лейаут оборачивает все страницы через `<slot />`

```
Запрос → src/pages/*.astro → src/layouts/Layout.astro → src/components/pages/*.jsx
```

Только `Header.jsx` рендерится на клиенте (`client:load`) — для мобильного меню.
Остальные компоненты рендерятся на сервере (SSG).

---

## Структура файлов

```
clod/
├── public/                        # Статические ассеты (favicon и т.д.)
│   └── uploads/                   # Медиафайлы (разбиты по папкам: doctors, blog, и т.д.)
├── src/
│   ├── components/
│   │   ├── pages/                 # React-компоненты страниц
│   │   │   ├── Home.jsx
│   │   │   ├── Mammology.jsx
│   │   │   ├── Gynecology.jsx
│   │   │   ├── Endocrinology.jsx
│   │   │   ├── Neurology.jsx
│   │   │   ├── SecondOpinion.jsx
│   │   │   └── Prices.jsx
│   │   ├── doctors-demo/          # Демо-компоненты карточек врачей
│   │   │   ├── DoctorClayCard.jsx
│   │   │   ├── DoctorDirectionFilters.jsx
│   │   │   └── DoctorsClayTitle.jsx
│   │   ├── Header.jsx             # Навигация (client:load, мобильное меню)
│   │   ├── Footer.jsx             # Подвал сайта
│   │   └── ClayContactBanner.jsx  # Баннер с контактами
│   ├── layouts/
│   │   └── Layout.astro           # Главный лейаут (HTML-обёртка, шрифты, мета)
│   ├── pages/                     # Astro-роуты (file-based routing)
│   │   ├── index.astro            # /
│   │   ├── mammology.astro        # /mammology
│   │   ├── gynecology.astro       # /gynecology
│   │   ├── endocrinology.astro    # /endocrinology
│   │   ├── neurology.astro        # /neurology
│   │   ├── second-opinion.astro   # /second-opinion
│   │   └── prices.astro           # /prices
│   ├── styles/
│   │   └── global.css             # Tailwind + все clay-утилиты
│   └── env.d.ts                   # Astro type references
├── db/                            # Astro DB
│   ├── config.ts                  # Схема базы данных
│   └── seed.ts                    # Скрипт наполнения (демо-данные)
├── astro.config.mjs               # Astro конфиг (react + tailwind интеграции)
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

Astro file-based routing — каждый `.astro`-файл в `src/pages/` = отдельный маршрут.

| Маршрут | Astro-файл | React-компонент |
|---|---|---|
| `/` | `index.astro` | `Home.jsx` |
| `/mammology` | `mammology.astro` | `Mammology.jsx` |
| `/gynecology` | `gynecology.astro` | `Gynecology.jsx` |
| `/endocrinology` | `endocrinology.astro` | `Endocrinology.jsx` |
| `/neurology` | `neurology.astro` | `Neurology.jsx` |
| `/second-opinion` | `second-opinion.astro` | `SecondOpinion.jsx` |
| `/prices` | `prices.astro` | `Prices.jsx` |

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
clay-card              — белая карточка с clay-тенью
clay-card-lg           — то же, крупнее
clay-card-mint         — тил-карточка (градиент)
clay-card-peach        — персиковая карточка
clay-card-blue         — синяя карточка
clay-card-lavender     — лавандовая карточка
clay-card-soft-mint    — пастельный тил (бледный)
clay-card-soft-peach   — пастельный персик
clay-card-soft-blue    — пастельный синий
clay-card-soft-lavender — пастельный лавандовый
```

**Кнопки:**
```
btn-clay-primary   — основная кнопка (тил, pill-форма)
btn-clay-secondary — вторичная кнопка (белая)
btn-clay-white     — белая кнопка
pill-filter        — фильтр-таблетка
```

**Иконки и декор:**
```
icon-circle-mint/peach/blue/lavender/yellow — цветной круг под иконку
blob-mint/peach/blue/lavender              — органические blob-фигуры (фон)
orb                                         — декоративный шар
```

**Бейджи и статистика:**
```
num-badge   — нумерованный шаг
stat-pill   — маленький stat-лейбл
```

**Аватары:**
```
avatar-ring-peach/blue/mint/lavender — цветное кольцо вокруг аватара
```

**Лейаут:**
```
section          — секция с вертикальными отступами
container-clay   — контейнер с горизонтальными отступами
```

### Тени (`tailwind.config.js` → `boxShadow`)

```
shadow-clay          — нейтральная clay-тень
shadow-clay-sm       — маленькая
shadow-clay-lg       — большая
shadow-clay-mint     — тил-тень
shadow-clay-peach    — персиковая тень
shadow-clay-blue     — синяя тень
shadow-clay-lavender — лавандовая тень
```

> Правило: **никогда не использовать `box-shadow` inline**, если есть готовый clay-класс.

---

## Паттерны кода

### Компоненты

```jsx
// ✅ Правильно — function, named export, RORO
export function ClayCard({ title, children, variant = 'default' }) {
  return <div className="clay-card">{children}</div>
}

// ❌ Неправильно — const, default export
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

- Функциональный, декларативный стиль — без классов
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

---

## Обновление этого файла

Этот README должен обновляться при следующих изменениях:

- Добавление новой страницы → обновить таблицу роутинга и структуру файлов
- Добавление нового компонента → обновить структуру файлов
- Новые clay-утилиты в `global.css` → обновить раздел CSS-утилит
- Новые цвета в `tailwind.config.js` → обновить цветовую палитру
- Изменение стека (зависимости в `package.json`) → обновить таблицу стека
- Изменение правил в `.cursor/rules/` → синхронизировать разделы паттернов
