# Деплой на Beget VPS (Ubuntu) из GitHub

Пошаговая инструкция по развёртыванию проекта «Клиника Одинцова» на VPS Beget с Ubuntu: от создания сервера до работающего сайта с HTTPS.

---

## Что понадобится

- **Аккаунт Beget** с доступом к VPS.
- **Домен** - нужен только для доступа по имени и HTTPS; без домена можно поднять сайт по IP по HTTP (см. часть 3А).
- **Репозиторий на GitHub** (публичный или приватный; для приватного - SSH-ключ или токен).
- **Терминал** с SSH-клиентом (на Windows: PowerShell + OpenSSH или PuTTY).

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

Из PowerShell (или терминала):

```bash
ssh root@ВАШ_IP_АДРЕС
```

При первом входе подтвердите отпечаток хоста (`yes`). Введите пароль root.

### 1.2.1. Вход по SSH-ключу (рекомендуется)

Чтобы подключаться без пароля по ключу:

1. **На вашем ПК используется ключ** (например, созданный для Beget):
   - Приватный ключ: `%USERPROFILE%\.ssh\id_ed25519_beget`
   - Публичный ключ: `%USERPROFILE%\.ssh\id_ed25519_beget.pub`

2. **Один раз подключитесь по паролю** (см. 1.2), затем на сервере выполните:

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "ВСТАВЬТЕ_СЮДА_СОДЕРЖИМОЕ_ФАЙЛА_id_ed25519_beget.pub" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Содержимое `id_ed25519_beget.pub` можно скопировать с ПК одной командой (PowerShell, подставьте свой IP):

```powershell
Get-Content $env:USERPROFILE\.ssh\id_ed25519_beget.pub
```

Скопируйте вывод и вставьте его в `echo "..."` на сервере (одной строкой, в кавычках).

3. **Подключение с ПК по ключу:**

```powershell
ssh -i $env:USERPROFILE\.ssh\id_ed25519_beget root@ВАШ_IP_АДРЕС
```

Чтобы не указывать `-i` каждый раз, добавьте в `%USERPROFILE%\.ssh\config`:

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
ASTRO_DB_REMOTE_URL=file:/data/db.sqlite
```

- **ADMIN_PASSWORD** - пароль входа в `/admin`.
- **TOKEN_SECRET** - любая длинная случайная строка (например, сгенерировать: `openssl rand -hex 32`).
- **ASTRO_DB_REMOTE_URL** - не меняйте; база будет в Docker volume `/data`.

### 3.2. Домен и DNS

Перед получением SSL-сертификата домен должен указывать на IP вашего VPS:

- В панели управления доменом (Beget или регистратор) создайте A-записи:
  - `odintsovclinic.ru` → IP вашего VPS
  - `www.odintsovclinic.ru` → IP вашего VPS
- Дождитесь обновления DNS (проверка: `ping odintsovclinic.ru` с вашего ПК или с сервера).

Если используете другой домен - везде в инструкции замените `odintsovclinic.ru` и `www.odintsovclinic.ru` на свой.

---

## Часть 3А. Деплой по IP без домена (только HTTP)

Если домен пока не подключаете, сайт можно поднять по IP: **только HTTP** (без HTTPS и без Certbot). Схема рабочая, меняется только конфиг Nginx и не делаются шаги с доменом и SSL.

**Что сделать после частей 1–2 и пункта 3.1** (без 3.2 и без части 4):

1. **Поставить конфиг Nginx «без домена»:**

```bash
cd /srv/clod
cp nginx.no-domain.conf nginx.conf
```

2. **Сразу запустить весь стек:**

```bash
docker compose up -d --build
```

Контейнер Certbot будет запущен, но для работы по IP он не нужен - можно игнорировать. Nginx слушает только порт 80 и проксирует запросы на приложение при любом `Host` (в т.ч. по IP).

3. **Открыть в браузере:** `http://ВАШ_IP` (подставьте IP вашего VPS).

**Позже, когда появится домен:** верните конфиг с доменом и HTTPS по части 4: настройте DNS (3.2), затем шаги 4.1–4.5 с `nginx.bootstrap.conf` и Certbot, в конце `git checkout nginx.conf` и `docker compose up -d --build`.

---

## Часть 4. Первый запуск и получение SSL (Bootstrap)

Сначала поднимаем только Nginx в режиме «только HTTP», чтобы Let's Encrypt мог выдать сертификат.

### 4.1. Включить bootstrap-конфиг Nginx

```bash
cd /srv/clod
cp nginx.bootstrap.conf nginx.conf
```

Если домен другой - отредактируйте `nginx.conf` и замените `server_name` на ваш домен:

```bash
nano nginx.conf
# server_name ваш-домен.ru www.ваш-домен.ru;
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
  -d odintsovclinic.ru -d www.odintsovclinic.ru \
  --email admin@odintsovclinic.ru \
  --agree-tos --no-eff-email
```

При успехе появится сообщение о сохранении сертификата в `/etc/letsencrypt/live/odintsovclinic.ru/`.

### 4.4. Переключиться на финальный Nginx с HTTPS

В репозитории уже есть финальный `nginx.conf` с HTTPS. Если вы его перезаписали на bootstrap - верните из git:

```bash
git checkout nginx.conf
```

Если правили домен вручную - отредактируйте финальный `nginx.conf`: замените все вхождения `odintsovclinic.ru` на ваш домен (в `server_name` и путях к `ssl_certificate` / `ssl_certificate_key`).

### 4.5. Запустить весь стек (приложение + Nginx + Certbot)

```bash
docker compose up -d --build
```

Первый запуск может занять несколько минут (сборка образа, установка зависимостей Bun, сборка Astro).

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

Скрипт подключится к серверу по `ssh clod`, выполнит `git pull`, `docker compose up -d --build` и перезагрузку Nginx (`nginx -s reload`) для сброса кэша. Либо запустите напрямую:

```powershell
.\scripts\deploy.ps1
```

### 5.2. Вручную на сервере

Если вы уже подключены к VPS (`ssh clod`):

```bash
cd /srv/clod
git pull
docker compose up -d --build
docker compose exec -T nginx nginx -s reload
```

Сборка пересоберёт образ и перезапустит контейнер приложения. Перезагрузка Nginx сбрасывает кэш соединений; если страница всё ещё отдаёт старое - сделайте жёсткое обновление в браузере (Ctrl+F5). Nginx и certbot продолжат работать без изменений.

---

## Часть 6. Дополнительно

### 6.1. Обновление SSL-сертификата

Контейнер `certbot` в этом проекте запущен с циклом `certbot renew` каждые 12 часов. Чтобы Nginx подхватил обновлённые сертификаты, можно добавить cron на хосте:

```bash
crontab -e
```

Добавьте строку (перезагрузка Nginx раз в сутки):

```
0 3 * * * docker compose -f /srv/clod/docker-compose.yml exec nginx nginx -s reload
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

1. В `nginx.bootstrap.conf` и `nginx.conf` замените `odintsovclinic.ru` и `www.odintsovclinic.ru` на ваш домен.
2. В команде `certbot certonly` укажите ваш домен и `www.ваш-домен`.
3. В `astro.config.mjs` при необходимости измените `site: 'https://...'` на ваш домен (для sitemap и canonical).

---

## Краткая шпаргалка (после первой настройки)

| Действие | Команды |
|----------|--------|
| Подключиться к серверу | `ssh clod` |
| Обновить сайт с ПК (скрипт) | `bun run deploy` |
| Обновить сайт на сервере | `cd /srv/clod && git pull && docker compose up -d --build` |
| Посмотреть логи | `cd /srv/clod && docker compose logs -f` |
| Перезагрузить Nginx | `cd /srv/clod && docker compose exec nginx nginx -s reload` |
| Остановить всё | `cd /srv/clod && docker compose down` |

---

Готово. После выполнения всех шагов сайт работает на Beget VPS по HTTPS. Обновление: с ПК - `bun run deploy` (скрипт подключается по `ssh clod` и выполняет `git pull` + `docker compose up -d --build`).
