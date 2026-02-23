# Комплексный отчёт по безопасности и качеству кода

**Сайт:** Клиника Одинцова (odintsovclinic.ru)  
**Дата анализа:** 23 февраля 2025  
**Стек:** Astro 4 + React 18 + SQLite (@astrojs/db) + Bun

---

## ✅ ВЫПОЛНЕННЫЕ ИСПРАВЛЕНИЯ (23.02.2025)

1. **Debug-код удалён** - из `middleware.js` и `AdminLayout.astro`
2. **Валидация doctorId и защита от path traversal** - новый `src/lib/upload-utils.js`, проверка в `photo.js` и `certificates.js`
3. **Rate limiting для аналитики** - `/api/analytics/event` (100 req/min) и `/api/analytics/heartbeat` (120 req/min)
4. **Overrides minimatch** - `>=10.2.1` в package.json (исправляет ReDoS)
5. **Content API** - `post.render()` заменён на `render(post)` в `blog/[slug].astro` (совместимость с Astro 4.16)

---

## Краткое резюме

| Категория | Оценка | Критические замечания |
|-----------|--------|------------------------|
| **Безопасность** | Требует внимания | 11 уязвимостей в зависимостях, debug-код в production, потенциальный path traversal в загрузках |
| **Качество кода** | Хорошее | Debug-логи в middleware и layout, несколько мелких предупреждений ESLint |
| **Архитектура** | Отличное | Чёткое разделение SSG/SSR, централизованная авторизация, CSRF-защита |
| **Тестирование** | Хорошее | 48 юнит-тестов, 7 E2E, CI/CD |

---

## 1. БЕЗОПАСНОСТЬ

### 1.1 Критические проблемы

#### 1.1.1 Debug-код в production (критично)

В `src/middleware.js` и `src/layouts/AdminLayout.astro` остался отладочный код, который пишет в файл `debug-a3eddf.log` при каждом запросе:

- **middleware.js** (строки 39–42, 48–52, 61–65): логирует `pathname`, результат auth-check, статус ответа
- **AdminLayout.astro** (строки 2–5): логирует `pathname` при проверке auth

**Риски:**
- Раскрытие путей запросов и статусов авторизации
- Рост диска при высокой нагрузке
- Лишние операции I/O на каждый запрос
- Утечка внутренней логики

**Рекомендация:** Удалить все блоки `#region agent log` и связанный с ними код.

---

#### 1.1.2 Уязвимости зависимостей (bun audit)

```
11 уязвимостей (2 high, 8 moderate, 1 low)
```

| Пакет | Серьёзность | Описание |
|-------|-------------|----------|
| **astro** | High | Reflected XSS через server islands |
| **astro** | Moderate | Auth bypass через double URL encoding (CVE-2025-64765) |
| **astro** | Moderate | Обход middleware при URL-encoded path |
| **astro** | Moderate | X-Forwarded-Host без валидации |
| **astro** | Moderate | Манипуляции с заголовками |
| **@astrojs/node** | Moderate | Open redirect (trailing slash) |
| **@astrojs/node** | Moderate | Несанкционированные изображения в /_image |
| **minimatch** | High | ReDoS через паттерны |
| **esbuild** | Moderate | Dev server - чтение ответов (актуально только в dev) |

**Рекомендация:** 
```bash
bun update
```
Обновить Astro до версии с исправлениями (5.15.9+ или последний 4.x с backport-патчами). Перед обновлением - проверить changelog и breaking changes.

---

### 1.2 Высокий приоритет

#### 1.2.1 Path traversal при загрузке файлов

**Файлы:** `src/pages/api/admin/upload/photo.js`, `src/pages/api/admin/upload/certificates.js`

`doctorId` из формы подставляется в имя файла без проверки:
```javascript
const filename = `${doctorId}-${Date.now()}.${ext}`  // photo.js
const filename = `${doctorId}-cert-${Date.now()}-...` // certificates.js
```

Если `doctorId = "../../../etc/passwd"`, возможна запись вне каталога `uploads/`.

**Рекомендация:**
- Валидировать `doctorId` как UUID: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`
- Проверять существование доктора в БД перед сохранением
- Формировать имя через `path.basename()` или явную подстановку UUID

---

#### 1.2.2 API аналитики без ограничений

**Файл:** `src/pages/api/analytics/event.js`

- Нет CSRF (приемлемо для аналитики с того же origin)
- Нет rate limiting - можно заспамить БД
- Нет проверки `Origin` - сторонние сайты могут слать события

**Рекомендация:** Добавить rate limiting (например, по IP: 100 req/min). Опционально - проверять `Origin`/`Referer` для приёма только с odintsovclinic.ru.

---

### 1.3 Средний приоритет

#### 1.3.1 TOKEN_SECRET и fallback на ADMIN_PASSWORD

В `src/lib/auth.js`:
```javascript
const secret = import.meta.env.TOKEN_SECRET || import.meta.env.ADMIN_PASSWORD || ...
```

Если `TOKEN_SECRET` не задан, используется пароль админа. Это удобно, но при компрометации одного секрета страдают оба механизма.

**Рекомендация:** Использовать отдельный `TOKEN_SECRET`, не совпадающий с паролем. Генерация: `openssl rand -hex 32`.

---

#### 1.3.2 ALLOWED_HOSTS для CSRF

В `src/lib/auth.js`:
```javascript
const ALLOWED_HOSTS = [
  'odintsovclinic.ru', 'www.odintsovclinic.ru',
  'localhost:4321', 'localhost:3000', '127.0.0.1:4321'
]
```

Нет превью/стейджинг-доменов (если планируются).

**Рекомендация:** Добавить staging-домены через переменную окружения, например:
```javascript
const extraHosts = (import.meta.env.CSRF_ALLOWED_HOSTS || '').split(',').map(h => h.trim()).filter(Boolean)
const ALLOWED_HOSTS = [...DEFAULT_HOSTS, ...extraHosts]
```

---

#### 1.3.3 Проверка MIME при загрузке файлов

Сейчас используется `file.type` из запроса. Клиент может подделать Content-Type.

**Рекомендация:** Подтверждать тип по магическим байтам (file signature), например через `file-type` или собственную проверку первых байт. Строгая whitelist расширений (`.jpg`, `.png`, `.webp`) уже снижает риск.

---

### 1.4 Что реализовано корректно

| Мера | Реализация |
|------|-------------|
| **Аутентификация** | HMAC-токены, cookie HttpOnly, SameSite=Strict, Secure в production |
| **Rate limiting** | Логин: 5 попыток / 15 мин по IP |
| **CSRF** | `validateOrigin()` на state-changing API |
| **Security headers** | X-Frame-Options, X-Content-Type-Options, CSP, HSTS (в production), Referrer-Policy, Permissions-Policy |
| **Валидация данных** | Строгие лимиты и типы в admin/doctors API |
| **.env** | В .gitignore, секреты через env_file в Docker |
| **HTTPS** | Nginx + Let's Encrypt |
| **SQL** | ORM Astro DB, параметризованные запросы (инъекции маловероятны) |

---

## 2. КАЧЕСТВО КОДА

### 2.1 Критические замечания

#### 2.1.1 Debug-код

См. раздел 1.1.1 - тот же debug-код влияет и на качество: лишняя логика, логирование в production.

---

### 2.2 Замечания средней важности

#### 2.2.1 Форма записи на главной (Home.jsx)

Функция `handleSubmit` имитирует отправку:
```javascript
setTimeout(() => {
  setIsSubmitting(false)
  setIsSubmitted(true)
  setName('')
  setPhone('')
}, 800)
```

Нет вызова API, данные никуда не отправляются.

**Рекомендация:** Либо подключить реальный API (email/CRM/форма), либо честно обозначить, что это заглушка (например, «Форма в разработке»).

---

#### 2.2.2 TypeScript в JS-проекте

`AdminLayout.astro` использует `interface Props` при общем правиле «без TypeScript в компонентах».

**Рекомендация:** Удалить `interface` или перейти на JSDoc, чтобы сохранить стиль проекта.

---

#### 2.2.3 Внешние шрифты в админке

В `AdminLayout.astro` подключены Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`), тогда как в публичном Layout используется самохостинг Inter.

**Рекомендация:** Для единообразия и скорости - подключить те же самохостинг-шрифты и в админке.

---

### 2.3 Мелкие замечания

#### 2.3.1 ESLint

Два предупреждения в coverage:
```
coverage/block-navigation.js:1 - Unused eslint-disable directive
coverage/lcov-report/block-navigation.js:1 - Unused eslint-disable directive
```

**Рекомендация:** Исключить `coverage/` из ESLint или поправить directive. Также можно добавить `coverage/` в `.eslintignore`.

---

#### 2.3.2 dangerouslySetInnerHTML

Используется в Contacts.jsx, BreadcrumbNav.jsx, FaqSection.jsx для JSON-LD:
```jsx
dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
```

`JSON.stringify()` экранирует спецсимволы, данные контролируемые - риск XSS низкий. Оставить как есть, но при изменении источников schema - убедиться, что они надёжно санитизированы.

---

### 2.4 Сильные стороны

- Единый стиль: `function`, named export, RORO
- Guard clauses, минимум вложенности
- Разделение данных (nav, contacts, filters) в `src/lib/`
- Error boundaries
- Тесты для auth, nav, contacts, filters, компонентов
- README и документация в актуальном состоянии

---

## 3. РЕКОМЕНДУЕМЫЙ ПЛАН ДЕЙСТВИЙ

### Немедленно (P0)
1. Удалить debug-логи из `middleware.js` и `AdminLayout.astro`
2. Обновить зависимости (`bun update`), проверить совместимость
3. Добавить валидацию `doctorId` в upload photo/certificates (UUID + проверка в БД)
4. Исключить path traversal при формировании имён файлов

### В течение 1–2 недель (P1)
5. Добавить rate limiting для `/api/analytics/event`
6. Ввести отдельный `TOKEN_SECRET` и убрать fallback на `ADMIN_PASSWORD`
7. Реализовать отправку формы записи или явно пометить её как заглушку

### По возможности (P2)
8. Исключить `coverage/` из ESLint или исправить директивы
9. Добавить проверку MIME по магическим байтам при загрузке
10. Вынести ALLOWED_HOSTS в переменные окружения для staging

---

## 4. ПРИЛОЖЕНИЯ

### A. Проверка .env

`.env` в `.gitignore` - локальные секреты не попадают в репозиторий. На production используется `env_file: .env` в `docker-compose.yml`. Убедитесь, что `.env` на сервере создан и не доступен через веб.

### B. Зависимости (bun audit)

Перед обновлением:
```bash
bun update
bun audit
bun run build
bun run test:run
bun run test:e2e
```

### C. Структура отчёта

Отчёт охватывает:
- Безопасность (auth, API, загрузки, зависимости, заголовки)
- Качество кода (паттерны, debug, формы, lint, стиль)
- Архитектуру и тестирование - в обзорном виде

---

*Отчёт подготовлен автоматизированным анализом. Рекомендуется пройтись по пунктам вручную и протестировать изменения перед деплоем.*
