# Dependency exposure: обоснование исключений аудита

`scripts/audit-dependencies.sh` (job **Security audit** в CI) выполняет `bun audit --audit-level=high`
и падает на любом high/critical advisory, кроме перечисленных в `dependency-exposure.ignore`.
Каждая строка ниже — осознанное решение с обоснованием и условием снятия.

Состояние на 4 сентября 2026 (после `bun update`, `nodemailer@10`, `vitest@3`, `drizzle-orm@0.45.2` и
`overrides` для `postcss`, `devalue`, `ws`, `sharp`, `minimatch`, `brace-expansion`, `browserslist`, (без `js-yaml`: astro 4 требует 3.x, а 3.15.2 уже исправлена)
`form-data`, `flatted`, `nanoid`, `picomatch`, `rollup`, `undici`, `yaml`, `postcss-selector-parser`):
28 advisories остаются, все — в ветке Astro 4 / Vite 5 и dev-инструментах. Было 89.

## Правила

- Исключение допустимо только для advisory без исправления в текущем мажоре либо для пакета,
  который не попадает в production-образ (`bun install --omit=dev`) и не обрабатывает пользовательский ввод.
- Каждое исключение снимается при закрытии Фазы 2 роадмепа (апгрейд Astro 5): после апгрейда
  `dependency-exposure.ignore` должен опустеть, а этот документ — сократиться до правил.
- Новый advisory на runtime-пакет (`astro`, `@astrojs/node`, `@astrojs/db`, `drizzle-orm`, `nodemailer`,
  `sharp`, `react`, `react-dom`, `lucide-react`, `cheerio`) нельзя добавлять в ignore без митигации
  на уровне nginx/middleware, описанной здесь.

## Действующие исключения

| Advisory | Severity | Пакет | Суть | Почему допустимо сейчас |
|---|---|---|---|---|
| `GHSA-v6wh-96g9-6wx3` | moderate | `vite` | launch-editor: NTLMv2 hash disclosure via UNC path handling on Windows | Только dev/build-toolchain: не попадает в production-образ (`--omit=dev`) и не обрабатывает пользовательский ввод; исправление требует Vite 6/7 вместе с Astro 5 |
| `GHSA-4w7w-66w2-5vf9` | moderate | `vite` | Vite Vulnerable to Path Traversal in Optimized Deps `.map` Handling | Только dev/build-toolchain: не попадает в production-образ (`--omit=dev`) и не обрабатывает пользовательский ввод; исправление требует Vite 6/7 вместе с Astro 5 |
| `GHSA-fx2h-pf6j-xcff` | high | `vite` | vite: `server.fs.deny` bypass on Windows alternate paths | Только dev/build-toolchain: не попадает в production-образ (`--omit=dev`) и не обрабатывает пользовательский ввод; исправление требует Vite 6/7 вместе с Astro 5 |
| `GHSA-fvmw-cj7j-j39q` | moderate | `astro` | Astro Cloudflare adapter has Stored Cross-site Scripting vulnerability in /_image endpoint | Исправлено только в Astro 5 / @astrojs/node 9.2+ (Фаза 2). Server islands, view transitions, Cloudflare adapter и `/_image` не используются; slot-имена и spread-атрибуты не берутся из пользовательского ввода |
| `GHSA-ggxq-hp9w-j794` | moderate | `astro` | Astro's middleware authentication checks based on url.pathname can be bypassed via url encoded values | Исправлено только в Astro 5 (Фаза 2). Middleware — не единственный барьер: каждый `api/admin/*` вызывает guardAdminRead/Write, а страницы админки проверяют сессию в AdminLayout |
| `GHSA-whqg-ppgf-wp8c` | moderate | `astro` | Astro has an Authentication Bypass via Double URL Encoding, a bypass for CVE-2025-64765 | Исправлено только в Astro 5 (Фаза 2). Middleware — не единственный барьер: каждый `api/admin/*` вызывает guardAdminRead/Write, а страницы админки проверяют сессию в AdminLayout |
| `GHSA-xr5h-phrj-8vxv` | low | `astro` | Astro: Server island encrypted parameters vulnerable to cross-component replay | Исправлено только в Astro 5 / @astrojs/node 9.2+ (Фаза 2). Server islands, view transitions, Cloudflare adapter и `/_image` не используются; slot-имена и spread-атрибуты не берутся из пользовательского ввода |
| `GHSA-5ff5-9fcw-vg88` | moderate | `astro` | Astro's `X-Forwarded-Host` is reflected without validation | Исправлено только в Astro 5 (Фаза 2). Митигировано nginx: чужой Host → 444/отказ TLS, `Host $server_name`, пустой `X-Forwarded-Host`, 404 рендерится SSR без исходящего fetch |
| `GHSA-hr2q-hp5q-x767` | moderate | `astro` | Astro vulnerable to URL manipulation via headers, leading to middleware and CVE-2025-61925 bypass | Исправлено только в Astro 5 (Фаза 2). Middleware — не единственный барьер: каждый `api/admin/*` вызывает guardAdminRead/Write, а страницы админки проверяют сессию в AdminLayout |
| `GHSA-wrwg-2hg8-v723` | high | `astro` | Astro vulnerable to reflected XSS via the server islands feature | Исправлено только в Astro 5 / @astrojs/node 9.2+ (Фаза 2). Server islands, view transitions, Cloudflare adapter и `/_image` не используются; slot-имена и spread-атрибуты не берутся из пользовательского ввода |
| `GHSA-x3h8-62x9-952g` | low | `astro` | Astro Development Server has Arbitrary Local File Read | Исправлено только в Astro 5 / @astrojs/node 9.2+ (Фаза 2). Server islands, view transitions, Cloudflare adapter и `/_image` не используются; slot-имена и spread-атрибуты не берутся из пользовательского ввода |
| `GHSA-g735-7g2w-hh3f` | low | `astro` | Astro: Remote allowlist bypass via unanchored matchPathname wildcard | Исправлено только в Astro 5 / @astrojs/node 9.2+ (Фаза 2). Server islands, view transitions, Cloudflare adapter и `/_image` не используются; slot-имена и spread-атрибуты не берутся из пользовательского ввода |
| `GHSA-j687-52p2-xcff` | moderate | `astro` | Astro: XSS in define:vars via incomplete </script> tag sanitization | Исправлено только в Astro 5 / @astrojs/node 9.2+ (Фаза 2). Server islands, view transitions, Cloudflare adapter и `/_image` не используются; slot-имена и spread-атрибуты не берутся из пользовательского ввода |
| `GHSA-jrpj-wcv7-9fh9` | moderate | `astro` | Astro: XSS via Unescaped Attribute Names in Spread Props | Исправлено только в Astro 5 / @astrojs/node 9.2+ (Фаза 2). Server islands, view transitions, Cloudflare adapter и `/_image` не используются; slot-имена и spread-атрибуты не берутся из пользовательского ввода |
| `GHSA-f48w-9m4c-m7f5` | moderate | `astro` | Astro: XSS via unescaped spread attribute names in renderHTMLElement (incomplete fix for CVE-2026-54298) | Исправлено только в Astro 5 / @astrojs/node 9.2+ (Фаза 2). Server islands, view transitions, Cloudflare adapter и `/_image` не используются; slot-имена и spread-атрибуты не берутся из пользовательского ввода |
| `GHSA-7pw4-f3q4-r2p2` | low | `astro` | Astro: Cross-site scripting via unescaped transition:* directive values on hydrated islands | Исправлено только в Astro 5 / @astrojs/node 9.2+ (Фаза 2). Server islands, view transitions, Cloudflare adapter и `/_image` не используются; slot-имена и spread-атрибуты не берутся из пользовательского ввода |
| `GHSA-4g3v-8h47-v7g6` | moderate | `astro` | Astro: Reflected XSS via unescaped View Transition animation properties | Исправлено только в Astro 5 / @astrojs/node 9.2+ (Фаза 2). Server islands, view transitions, Cloudflare adapter и `/_image` не используются; slot-имена и spread-атрибуты не берутся из пользовательского ввода |
| `GHSA-2pvr-wf23-7pc7` | high | `astro` | Astro: Host header SSRF in prerendered error page fetch | Исправлено только в Astro 5 (Фаза 2). Митигировано nginx: чужой Host → 444/отказ TLS, `Host $server_name`, пустой `X-Forwarded-Host`, 404 рендерится SSR без исходящего fetch |
| `GHSA-8hv8-536x-4wqp` | high | `astro` | Astro: Reflected XSS via unescaped slot name | Исправлено только в Astro 5 / @astrojs/node 9.2+ (Фаза 2). Server islands, view transitions, Cloudflare adapter и `/_image` не используются; slot-имена и spread-атрибуты не берутся из пользовательского ввода |
| `GHSA-4x5r-pxfx-6jf8` | low | `@babel/core` | @babel/core: Arbitrary File Read via sourceMappingURL Comment | Только dev/build-toolchain: не попадает в production-образ (`--omit=dev`) и не обрабатывает пользовательский ввод; исправление требует Vite 6/7 вместе с Astro 5 |
| `GHSA-p498-v437-472g` | moderate | `@humanfs/node` | humanfs: Recursive copy follows symlinked files and copies data from outside the source tree | Только dev/build-toolchain: не попадает в production-образ (`--omit=dev`) и не обрабатывает пользовательский ввод; исправление требует Vite 6/7 вместе с Astro 5 |
| `GHSA-xf8x-j4p2-f749` | moderate | `@astrojs/node` | Astro allows unauthorized third-party images in _image endpoint | Исправлено только в Astro 5 / @astrojs/node 9.2+ (Фаза 2). Server islands, view transitions, Cloudflare adapter и `/_image` не используются; slot-имена и spread-атрибуты не берутся из пользовательского ввода |
| `GHSA-9x9c-ghc5-jhw9` | moderate | `@astrojs/node` | @astrojs/node's trailing slash handling causes open redirect issue | Исправлено только в Astro 5 / @astrojs/node 9.2+ (Фаза 2). Server islands, view transitions, Cloudflare adapter и `/_image` не используются; slot-имена и spread-атрибуты не берутся из пользовательского ввода |
| `GHSA-3rmj-9m5h-8fpv` | moderate | `@astrojs/node` | Astro: Memory exhaustion DoS due to missing request body size limit in Server Islands | Исправлено только в Astro 5 / @astrojs/node 9.2+ (Фаза 2). Server islands, view transitions, Cloudflare adapter и `/_image` не используются; slot-имена и spread-атрибуты не берутся из пользовательского ввода |
| `GHSA-qq67-mvv5-fw3g` | moderate | `@astrojs/node` | Astro has Full-Read SSRF in error rendering via Host: header injection | Исправлено только в Astro 5 (Фаза 2). Митигировано nginx: чужой Host → 444/отказ TLS, `Host $server_name`, пустой `X-Forwarded-Host`, 404 рендерится SSR без исходящего fetch |
| `GHSA-c57f-mm3j-27q9` | moderate | `@astrojs/node` | Astro: Cache Poisoning due to incorrect error handling when if-match header is malformed  | Исправлено только в Astro 5 / @astrojs/node 9.2+ (Фаза 2). Server islands, view transitions, Cloudflare adapter и `/_image` не используются; slot-имена и spread-атрибуты не берутся из пользовательского ввода |
| `GHSA-r557-wffq-wvrc` | low | `@astrojs/node` | @astrojs/node: Backslash-prefixed paths not recognized as internal by trailing-slash redirect | Исправлено только в Astro 5 / @astrojs/node 9.2+ (Фаза 2). Server islands, view transitions, Cloudflare adapter и `/_image` не используются; slot-имена и spread-атрибуты не берутся из пользовательского ввода |
| `GHSA-67mh-4wv8-2f99` | moderate | `esbuild` | esbuild enables any website to send any requests to the development server and read the response | Только dev/build-toolchain: не попадает в production-образ (`--omit=dev`) и не обрабатывает пользовательский ввод; исправление требует Vite 6/7 вместе с Astro 5 |

## Пины, которые нельзя снимать до Astro 5

- `@astrojs/sitemap` зафиксирован на `3.1.6`: версии 3.2+ используют хук `astro:build:done` формата Astro 5
  и валят сборку (`Cannot read properties of undefined (reading 'reduce')`).
- `@astrojs/db` остаётся `^0.19`: `0.20+` обращается к `server.config.vite.ssr`, которого нет в Astro 4.
- `@astrojs/tailwind` и `@astrojs/sitemap` переведены в `devDependencies`: они нужны только на этапе
  сборки и не импортируются из `dist/server`.

## Проверка

```bash
sh scripts/audit-dependencies.sh   # должен завершиться кодом 0
bun audit                          # полный список, включая moderate/low
```
