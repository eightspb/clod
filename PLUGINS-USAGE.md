# Claude Code Plugins — clod (Astro/React/JS, TDD)

## Структура после корректной установки

```
clod/
├── .claude/
│   ├── skills/                     # 24 SEO skill + humanizer + seo-audit
│   ├── agents/                     # 17 специализированных SEO-агентов
│   ├── marketplaces/
│   │   └── marketingskills/        # marketplace-плагин (активируется /plugin install)
│   └── design-systems/
│       └── awesome-design-md/      # 66+ DESIGN.md брендов
└── seomachine-workspace/           # отдельный SEO workspace
```

## Статус активации

| Плагин | Тип | Активация |
|--------|-----|-----------|
| humanizer, seo-audit | drop-in skill | уже работает |
| claude-seo (20 sub-skills + 17 agents) | collection of skills | уже работает (разложен плоско в skills/) |
| marketing-skills (36 skills) | marketplace plugin | `/plugin install marketing-skills@marketingskills` + `/reload-plugins` |

### Marketplace-плагин (один раз в Claude Code)

```text
/plugin marketplace add ./.claude/marketplaces/marketingskills
/plugin install marketing-skills@marketingskills
/reload-plugins
```

### Важное: claude-seo — это не slash-плагин

Команды `/claude-seo` **не существует**. Репо `AgriciDaniel/claude-seo` — это коллекция из 20 именованных скиллов + 17 агентов, которые вызываются по имени. Если вы добавили маркетплейс раньше, удалите лишнюю запись:

```text
/plugin marketplace remove agricidaniel-seo
```

Доступные команды после флаттинга skills:

```text
/seo audit <url>            # полный аудит (оркестрирует всё)
/seo page <url>              # анализ страницы
/seo schema <url>            # schema.org аудит
/seo sitemap <url>           # sitemap анализ
/seo-geo <url>              # GEO (ChatGPT/Perplexity)
/seo-backlinks <url>
/seo-local <url>
/seo-technical <url>
/seo-hreflang
/seo-cluster
/seo-competitor-pages
/seo-drift
/seo-ecommerce
/seo-google
/seo-image-gen
/seo-images
/seo-maps
/seo-page
/seo-plan
/seo-programmatic
/seo-schema
/seo-sxo
/seo-content
/seo-dataforseo             # требует API-ключ
```

## Что нужно глобально (запустить `install-global-claude-plugins.sh`)

| Плагин | Функция |
|--------|---------|
| `caveman` | −40–65% токенов |
| `everything-claude-code` | 47 агентов, security scan |
| `agentmemory` | Персистентная память |
| `oh-my-claudecode` | Роутинг Haiku/Sonnet/Opus |
| `codex-plugin-cc` | Second opinion (Codex) |

---

## Workflows для clod

### 1. Старт сессии
```
/caveman                 # сжатый режим (после глобальной установки)
```

### 2. Фича с TDD
```
Use everything-claude-code test-architect.
Write failing Playwright test for <фича> (Angry Tests style, 1 assertion).
Then minimum Astro/React implementation.
```

### 3. UI-страница в стиле бренда
1. Выберите бренд: `ls .claude/design-systems/awesome-design-md/design-md/` (Tesla, Apple, Nike, Figma, Airbnb, ...)
2. Скопируйте в корень:
   ```bash
   cp .claude/design-systems/awesome-design-md/design-md/apple/DESIGN.md ./DESIGN.md
   ```
3. Промпт:
   ```
   Read ./DESIGN.md. Build Astro page following this design system exactly.
   ```
4. Удалите `DESIGN.md` после использования или переименуйте, чтобы не путать с другими.

### 4. SEO-аудит (Plot SEO)
```
/seo audit https://<domain>            # полный аудит с делегированием
/seo-geo <domain>                      # GEO (ChatGPT/Perplexity)
/seo-schema src/pages/                 # schema.org проверка
/seo-technical <domain>                # CWV, crawlability
```

### 5. Блог-статья (SEO Machine)
```bash
cd seomachine-workspace
pip install -r data_sources/requirements.txt
# Заполните 3 файла в context/: brand-voice.md, features.md, writing-examples.md
```
Промпт из этой папки:
```
Generate SEO article on "<keyword>". Target 2000-3000 words, E-E-A-T,
dual-optimized for Google + AI search citations.
```
Финальная шлифовка:
```
Run humanizer on ./seomachine-workspace/drafts/<slug>.md
```
Готовый файл → `clod/src/content/blog/`.

### 6. CRO на лендинге
После регистрации marketingskills:
```
Use page-cro skill on src/pages/index.astro.
Hypotheses → A/B variants → copy rewrite → analytics events.
```
Другие полезные: `copywriting`, `form-cro`, `analytics-tracking`, `ai-seo`.

### 7. Pre-merge
```
/codex-plugin-cc:review                      # второе мнение (после установки)
/everything-claude-code:agentshield          # security scan
```

---

## Таблица: задача → плагин

| Задача | Плагин | Как вызвать |
|--------|--------|-------------|
| Генерация кода | caveman | авто после /caveman |
| Долгая сессия, контекст теряется | agentmemory | авто |
| Параллельные задачи | oh-my-claudecode | `/oh-my-claudecode:omc-setup` |
| Сомневаюсь в коде | codex-plugin-cc | `/codex-plugin-cc:review` |
| Страница «под бренд» | awesome-design-md | скопировать DESIGN.md |
| Очистить AI-текст | humanizer | «Run humanizer on ...» |
| Блог-статья | seomachine + humanizer | из seomachine-workspace/ |
| CRO лендинга | marketing-skills | `/plugin install` → page-cro |
| Полный SEO/GEO | claude-seo (flat skills) | `/seo audit`, `/seo-geo`, `/seo-schema`, ... |

## Зависимости

- `codex-plugin-cc`: `npm i -g @openai/codex` + ChatGPT Plus
- `claude-seo`: Python 3.10+, опц. API-ключи DataForSEO/Firecrawl
- `seomachine`: Python + pip install requirements
- `agentmemory`: локальный сервис по README
- `oh-my-claudecode`: marketplace-установка
- Все SEO-плагины — под Google (для Яндекса адаптировать вручную)
