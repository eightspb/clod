# Деплой на Beget VPS (Ubuntu) из GitHub

Пошаговая инструкция по развёртыванию проекта «Клиника Одинцова» на VPS Beget с Ubuntu: от создания сервера до работающего сайта с HTTPS.

---

## Что понадобится

- **Аккаунт Beget** с доступом к VPS.
- **Домен** - нужен только для доступа по имени и HTTPS; без домена можно поднять сайт по IP по HTTP (см. часть 3А).
- **Репозиторий на GitHub** (публичный или приватный; для приватного - SSH-ключ или токен).
- **Терминал** с SSH-клиентом (OpenSSH встроен в macOS и большинство дистрибутивов Linux).

---

## Часть 1. Подготовка VPS на Beget

### 1.1. Создание VPS

1. Зайдите в [панель Beget](https://cp.beget.com/).
2. Раздел **VPS** → **Заказать VPS** (или **Создать сервер**).
3. Выберите:
   - **ОС**: Ubuntu 22.04 LTS (рекомендуется).
   - Тариф с минимум 1 GB RAM (для Docker и Node-приложения лучше 2 GB).
4. Укажите пароль root или сохраните выданный ключ.
5. Дождитесь создания сервера. В панели появится **IP-адрес** и данные для входа.

### 1.2. Подключение по SSH

Из терминала на Mac или Linux:

```bash
ssh root@ВАШ_IP_АДРЕС
```

При первом входе подтвердите отпечаток хоста (`yes`). Введите пароль root.

### 1.2.1. Вход по SSH-ключу (рекомендуется)

Чтобы подключаться без пароля по ключу:

1. **На вашем Mac используется ключ** (например, созданный для Beget):
   - Приватный ключ: `~/.ssh/id_ed25519_beget`
   - Публичный ключ: `~/.ssh/id_ed25519_beget.pub`

2. **Один раз подключитесь по паролю** (см. 1.2), затем на сервере выполните:

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "ВСТАВЬТЕ_СЮДА_СОДЕРЖИМОЕ_ФАЙЛА_id_ed25519_beget.pub" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Содержимое `id_ed25519_beget.pub` можно вывести в терминале на Mac:

```bash
cat ~/.ssh/id_ed25519_beget.pub
```

Скопируйте вывод и вставьте его в `echo "..."` на сервере (одной строкой, в кавычках).

3. **Подключение с Mac по ключу:**

```bash
ssh -i ~/.ssh/id_ed25519_beget root@ВАШ_IP_АДРЕС
```

Чтобы не указывать `-i` каждый раз, добавьте в `~/.ssh/config`:

```
Host clod
    HostName ВАШ_IP_АДРЕС
    User root
    IdentityFile ~/.ssh/id_ed25519_beget
```

После этого подключение к VPS: **`ssh clod`**.

### 1.3. Базовая настройка Ubuntu (рекомендуется)

```bash
# Обновление пакетов
apt update && apt upgrade -y

# Опционально: создать пользователя без root (безопаснее для деплоя)
# adduser deploy
# usermod -aG sudo deploy
# Далее можно работать под deploy и использовать sudo
```

Дальнейшие команды в инструкции предполагают, что вы подключаетесь как **root** (или под пользователем с `sudo`).

---

## Часть 2. Установка необходимого ПО

### 2.1. Docker и Docker Compose

```bash
# Установка Docker
apt install -y ca-certificates curl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Проверка
docker --version
docker compose version
```

### 2.2. Git (если не установлен)

```bash
apt install -y git
```

### 2.3. Подготовка к клонированию с GitHub

**Публичный репозиторий** - достаточно клонировать по HTTPS:

```bash
git clone https://github.com/eightspb/clod.git /srv/clod
cd /srv/clod
```

**Приватный репозиторий** - один из вариантов:

- **Вариант A: SSH-ключ**
  1. На сервере: `ssh-keygen -t ed25519 -C "vps-deploy" -f ~/.ssh/id_ed25519 -N ""`
  2. Вывести публичный ключ: `cat ~/.ssh/id_ed25519.pub`
  3. В GitHub: **Settings** репозитория → **Deploy keys** → **Add deploy key** - вставить ключ.
  4. Клонировать:
     ```bash
     git clone git@github.com:ВАШ_ЛОГИН/ИМЯ_РЕПОЗИТОРИЯ.git /srv/clod
     cd /srv/clod
     ```
- **Вариант B: Personal Access Token (HTTPS)**  
  При запросе пароля ввести токен вместо пароля GitHub.

---

## Часть 3. Переменные окружения и конфигурация

### 3.1. Создание `.env`

```bash
cd /srv/clod
cp .env.example .env
nano .env
```

Заполните (сохраните: Ctrl+O, Enter, выход: Ctrl+X):

```env
ADMIN_PASSWORD=надёжный_пароль_для_админки
TOKEN_SECRET=длинная_случайная_строка_для_HMAC
MEDFLEX_CLINIC_TOKEN=
BOOKING_INTENT_SECRET=
ASTRO_DB_REMOTE_URL=file:/data/db.sqlite
```

- **ADMIN_PASSWORD** - пароль входа в `/admin`.
- **TOKEN_SECRET** - отдельная длинная случайная строка для админ-сессий; создайте и храните её в менеджере секретов.
- **MEDFLEX_CLINIC_TOKEN** - server-only токен клиники. Перед production отзовите любой токен, который ранее попадал в чат, лог или историю команд, и вставьте новый токен непосредственно в `nano .env`. Не используйте префикс `PUBLIC_`.
- **BOOKING_INTENT_SECRET** - отдельный сильный server-only HMAC-секрет. Он не должен совпадать с `TOKEN_SECRET` или токеном Medflex и должен оставаться стабильным при перезапусках контейнера и деплоях. Плановую ротацию выполняйте отдельно после завершения или контролируемого сброса незакрытых booking intents.
- **ASTRO_DB_REMOTE_URL** - не меняйте; база будет в Docker volume `/data`.

После сохранения ограничьте чтение файла владельцем:

```bash
chmod 600 /srv/clod/.env
```

Токен и секрет вставляйте в интерактивном редакторе из менеджера секретов. Не передавайте их аргументами CLI, не добавляйте в shell history, Docker build args, `Dockerfile`, `docker-compose.yml`, CI variables для build-time, Git или диагностические логи. Не публикуйте вывод команд, которые разворачивают содержимое `.env` или окружение контейнера. `docker-compose.yml` уже передаёт эти значения приложению только во время запуска через `env_file`.

URL запросов и access logs не должны содержать телефон, ФИО или другие данные пациента. Reconciliation через [Medflex Clinic Token API](https://developer.medflex.ru/clinic-token/) ограничивает history-запрос датой и LPU, выполняет точное сопоставление в памяти и оставляет результат `uncertain`, если безопасная выборка превышает 200 записей. Не включайте диагностическое логирование query/body для booking routes.

По [официальной справке Medflex](https://help.medflex.me/integraciya-cherez-api-so-storonnimi-servisami/) открытый токен клиники даёт доступ к группам Models, Schedule, Online booking и Services для всех филиалов клиники. Считайте его высокопривилегированным. Успешно созданная через API запись тарифицируется: до включения production проверьте условия и баланс, а deploy-smoke ограничьте открытием интерфейса и чтением расписания без отправки `POST /api/appointments/book`.

Перед production:

- подтвердите отзыв ранее раскрытого токена и выпуск нового токена;
- обновите только `MEDFLEX_CLINIC_TOKEN`, сохранив текущий `BOOKING_INTENT_SECRET`;
- повторно проверьте права `600`, отсутствие `.env` в Git и отсутствие секретов в build args, shell history, CI/build logs и выводе `docker compose config`;
- пересоздайте контейнер приложения, затем проверьте загрузку расписания и наличие телефонного fallback `+7 (812) 748-22-10`, не подтверждая тестовую запись;
- проверьте баланс и согласуйте момент включения платного Online booking.

### 3.2. Домен и DNS

Перед получением SSL-сертификата домен должен указывать на IP вашего VPS:

- В панели управления доменом (Beget или регистратор) создайте A-записи:
  - `odintsovclinic.ru` → IP вашего VPS
  - `www.odintsovclinic.ru` → IP вашего VPS
- Дождитесь обновления DNS (проверка: `ping odintsovclinic.ru` с вашего ПК или с сервера).

Если используете другой домен - везде в инструкции замените `odintsovclinic.ru` и `www.odintsovclinic.ru` на свой.

---

## Часть 3А. Деплой по IP без домена (только HTTP)

Если домен пока не подключаете, сайт можно поднять по IP: **только HTTP** (без HTTPS и без Certbot).

Рабочий `nginx.conf` не хранится в git — его генерирует `scripts/render-nginx.sh` из шаблона. Для режима «только HTTP» после `git clone` и настройки `.env` достаточно:

```bash
cd /srv/clod
sh scripts/render-nginx.sh http
docker compose up -d --build
```

Контейнер Certbot будет запущен, но для работы по IP он не нужен — можно игнорировать. Nginx слушает порт 80 и проксирует запросы при любом `Host` (в т.ч. по IP).

**Открыть в браузере:** `http://ВАШ_IP` (подставьте IP вашего VPS).

**Позже, когда появится домен:** настройте DNS (3.2), затем часть 4: `render-nginx.sh bootstrap` → Certbot → `render-nginx.sh https` и `docker compose up -d --build`.

> Если nginx уходит в `restarting`, проверьте, какой шаблон был отрендерен: HTTPS-шаблон без сертификатов в `/etc/letsencrypt/live/${SITE_DOMAIN}/` не стартует. `docker compose run --rm --no-deps nginx nginx -t` покажет причину.

---

## Часть 4. Первый запуск и получение SSL (Bootstrap)

Сначала поднимаем только Nginx в режиме «только HTTP», чтобы Let's Encrypt мог выдать сертификат.

### 4.1. Включить bootstrap-конфиг Nginx

Укажите домен в `.env` (`SITE_DOMAIN=new.odintsovclinic.ru`; production сейчас живёт именно на поддомене `new.`, а `odintsovclinic.ru` — отдельный сайт на Tilda) и отрендерите bootstrap-конфиг:

```bash
cd /srv/clod
sh scripts/render-nginx.sh bootstrap
```

### 4.2. Запустить только Nginx (без приложения)

```bash
docker compose up -d nginx
```

Проверьте: `docker compose ps` - контейнер `nginx` должен быть в состоянии running.

### 4.3. Получить SSL-сертификат Let's Encrypt

Подставьте свой домен и email:

```bash
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d "${SITE_DOMAIN}" \
  --email admin@odintsovclinic.ru \
  --agree-tos --no-eff-email
```

При успехе появится сообщение о сохранении сертификата в `/etc/letsencrypt/live/${SITE_DOMAIN}/`.

### 4.4. Переключиться на финальный Nginx с HTTPS

Шаблон **`nginx.https.conf`** содержит редирект HTTP→HTTPS, SSL, security headers и лимиты. Отрендерите его и проверьте вместе с реальными сертификатами:

```bash
cd /srv/clod
sh scripts/render-nginx.sh https
docker compose run --rm --no-deps nginx nginx -t
```

Домен и пути к сертификатам подставляются из `SITE_DOMAIN`; ничего редактировать вручную не нужно.

### 4.5. Запустить весь стек (приложение + Nginx + Certbot)

```bash
docker compose pull app && docker compose up -d --no-build
```

Образ приложения приходит из GHCR (`ghcr.io/eightspb/clod:latest` или `sha-<коммит>` через `CLOD_IMAGE_TAG` в `.env`). Если доступа к реестру ещё нет, один раз соберите на хосте: `docker compose up -d --build`.

Проверка:

```bash
docker compose ps
docker compose logs app -f
```

Откройте в браузере: `https://odintsovclinic.ru`. Должна открыться главная страница сайта.

---

## Часть 5. Обновление сайта (деплой новой версии из GitHub)

Подключение к VPS: **`ssh clod`** (хост `clod` настраивается в `~/.ssh/config`, см. п. 1.2.1).

### 5.1. С ПК одной командой (скрипт)

После пуша изменений в GitHub выполните в корне проекта:

```bash
bun run deploy
```

Скрипт подключится к серверу по `ssh clod`, проверит свободное место, выполнит `git pull`, отрендерит и проверит `nginx.conf`, дождётся образа `ghcr.io/eightspb/clod:sha-<HEAD>` из GitHub Actions, затем `docker compose pull app && docker compose up -d --no-build` и перезагрузку Nginx (`nginx -s reload`). Образ на сервере не собирается; аварийная сборка на хосте — `DEPLOY_BUILD_ON_HOST=1 bun run deploy`. Хосту нужен доступ к пакету GHCR (публичный пакет или `docker login ghcr.io` с PAT `read:packages`). Либо запустите напрямую:

```bash
sh scripts/deploy.sh
```

### 5.2. Вручную на сервере

Если вы уже подключены к VPS (`ssh clod`):

```bash
cd /srv/clod
git pull
CLOD_IMAGE_TAG=sha-$(git rev-parse --short=7 HEAD) docker compose pull app
docker compose up -d --no-build
docker compose exec -T nginx nginx -s reload
```

Pull скачает образ, который CI собрал для этого коммита, и перезапустит контейнер приложения. Перезагрузка Nginx сбрасывает кэш соединений; если страница всё ещё отдаёт старое - сделайте жёсткое обновление в браузере (Ctrl+F5). Nginx и certbot продолжат работать без изменений.

---

## Часть 6. Дополнительно

### 6.1. Обновление SSL-сертификата

Контейнер `certbot` в этом проекте запущен с циклом `certbot renew` каждые 12 часов. Чтобы Nginx подхватил обновлённые сертификаты, можно добавить cron на хосте:

```bash
crontab -e
```

Добавьте строку (перезагрузка Nginx раз в сутки):

```
0 3 * * * docker compose -f /srv/clod/docker-compose.yml exec -T nginx nginx -s reload
```

Либо после ручного обновления сертификатов выполните на сервере:

```bash
cd /srv/clod && docker compose exec nginx nginx -s reload
```

### 6.2. Логи и отладка

```bash
cd /srv/clod
docker compose logs app    # логи приложения
docker compose logs nginx  # логи Nginx
docker compose logs -f    # все логи в реальном времени
```

### 6.3. Остановка и удаление

```bash
cd /srv/clod
docker compose down
```

Данные в томах (`db-data`, `uploads`, `certbot-certs`) сохранятся. Полное удаление с томами:

```bash
docker compose down -v
```

### 6.4. Другой домен

Если деплоите на другой домен:

1. Укажите новый домен в `.env` как `SITE_DOMAIN` и заново выполните `sh scripts/render-nginx.sh bootstrap`.
2. После Certbot выполните `sh scripts/render-nginx.sh https` — домен и пути к сертификатам подставятся автоматически.
3. В команде `certbot certonly` укажите тот же домен.
4. В `astro.config.mjs` при необходимости измените `site: 'https://...'` на ваш домен (для sitemap и canonical).

---

## Краткая шпаргалка (после первой настройки)

| Действие | Команды |
|----------|--------|
| Подключиться к серверу | `ssh clod` |
| Обновить сайт с ПК (скрипт) | `bun run deploy` |
| Обновить сайт на сервере | `bun run deploy` с ПК; вручную — `git pull`, `docker compose pull app`, `docker compose up -d --no-build` |
| Посмотреть логи | `cd /srv/clod && docker compose logs -f` |
| Перезагрузить Nginx | `cd /srv/clod && docker compose exec nginx nginx -s reload` |
| Остановить всё | `cd /srv/clod && docker compose down` |

---

Готово. После выполнения всех шагов сайт работает на Beget VPS по HTTPS. Обновление: с ПК - `bun run deploy` (скрипт подключается по `ssh clod`, выполняет `git pull`, ждёт образ из GHCR и делает `docker compose pull` + `up -d --no-build`).
