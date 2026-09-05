# Dependency exposure: обоснование исключений аудита

`scripts/audit-dependencies.sh` (job **Security audit** в CI) выполняет `bun audit --audit-level=high`
и падает на любом high/critical advisory, кроме перечисленных в `dependency-exposure.ignore`.
Каждая строка ignore-файла — осознанное решение с обоснованием и условием снятия.

Состояние на 5 сентября 2026 (после апгрейда на Astro 7.3 / Vite 8 / `@astrojs/node` 11, замены
`@astrojs/db` на `drizzle-orm` + `@libsql/client` и `vitest@5`): ignore-файл пуст, high/critical advisories нет.
`bun audit` без фильтра показывает два advisory ниже порога, оба только в dev/build-toolchain и не попадают
в production-образ (`bun install --omit=dev`): `GHSA-4x5r-pxfx-6jf8` (low, `@babel/core`) и
`GHSA-p498-v437-472g` (moderate, `@humanfs/node`).

## Правила

- Исключение допустимо только для advisory без исправления в текущем мажоре либо для пакета,
  который не попадает в production-образ (`bun install --omit=dev`) и не обрабатывает пользовательский ввод.
- Новый advisory на runtime-пакет (`astro`, `@astrojs/node`, `drizzle-orm`, `@libsql/client`, `nodemailer`,
  `sharp`, `react`, `react-dom`, `lucide-react`, `cheerio`) нельзя добавлять в ignore без митигации
  на уровне nginx/middleware, описанной здесь.
- Ветка Astro 6.x не получает security-релизов после 6.4.8 (июнь 2026); поддерживаемой считается только
  текущий мажор, поэтому патчи `astro` и `@astrojs/node` ставятся без задержки.

## Проверка

```bash
sh scripts/audit-dependencies.sh   # должен завершиться кодом 0
bun audit                          # полный список, включая moderate/low
```
