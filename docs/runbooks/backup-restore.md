# Runbook: резервное копирование и восстановление

Production: VPS `clod`, каталог `/srv/clod`, база SQLite в Docker volume `clod_db-data`
(`/var/lib/docker/volumes/clod_db-data/_data/db.sqlite`), загрузки в `clod_uploads`,
сертификаты в `clod_certbot-certs`.

## Что делает бэкап

`scripts/backup.sh` запускается systemd-таймером `clod-backup.timer` ежедневно в 03:30 по Москве:

1. Согласованный снимок базы через `sqlite3 .backup` без остановки трафика.
2. `PRAGMA integrity_check` снимка и подсчёт `Patient` / `HistoricalVisit`; любое отклонение останавливает бэкап.
3. Архивы volume `clod_uploads` и `clod_certbot-certs`.
4. Единый `clod-<UTC stamp>.tar.gz` (или `.tar.gz.age`, если задан `BACKUP_AGE_RECIPIENT`) в `/srv/backups/clod/daily/` + `.sha256`.
5. По воскресеньям копия в `/srv/backups/clod/weekly/`; хранится 7 daily и 4 weekly.
6. При заданном `BACKUP_REMOTE` копия уходит через `rclone copy` в объектное хранилище.

Конфигурация — `/etc/clod-backup.env` (режим 600):

```sh
BACKUP_AGE_RECIPIENT=age1...      # публичный ключ; приватный ключ хранится ВНЕ сервера
BACKUP_REMOTE=s3:clinic-backups/clod
```

Без `BACKUP_AGE_RECIPIENT` архив не шифруется, без `BACKUP_REMOTE` копия остаётся на том же диске, что и база; скрипт печатает предупреждение в журнал.

## Установка на новом хосте

```sh
cd /srv/clod && sh scripts/install-backup-timer.sh
systemctl list-timers clod-backup.timer
journalctl -u clod-backup.service -n 50
```

## Ключи

Архив содержит шифртекст пациентов, который бесполезен без `PATIENT_ENCRYPTION_KEY`,
`CONTACT_FINGERPRINT_KEY` и `MANGO_CALL_ENCRYPTION_KEY` из `/srv/clod/.env`.
Эти ключи хранятся в парольном менеджере клиники и в запечатанной бумажной копии в сейфе —
никогда рядом с архивом. Копия `.env` на сервере рядом с бэкапом (`environment.*`, `.env.backup-*`)
обнуляет шифрование и должна быть удалена после переноса значений в менеджер.

## Проверка восстановления (ежемесячно)

```sh
sh /srv/clod/scripts/restore-check.sh /srv/backups/clod/daily/clod-<stamp>.tar.gz
# для зашифрованного архива:
sh /srv/clod/scripts/restore-check.sh /srv/backups/clod/daily/clod-<stamp>.tar.gz.age /path/to/age-key.txt
```

Ожидается `restored_integrity=ok`, совпадение `patients`/`visits` с MANIFEST и время `restore_seconds` —
это измеренный RTO восстановления файла; полное восстановление добавляет остановку и старт контейнера (около минуты). Первое измерение 4 сентября 2026 года — в разделе «Журнал учений» ниже.

## Восстановление после потери базы

1. Остановить запись: `cd /srv/clod && docker compose stop app`.
2. Получить архив (локальный или `rclone copy remote:... /srv/backups/restore/`) и проверить `sha256sum -c`.
3. Распаковать во временный каталог: `mkdir -p /srv/restore && tar -xzf clod-<stamp>.tar.gz -C /srv/restore`
   (для `.age`: `age -d -i key.txt clod-<stamp>.tar.gz.age | tar -xzf - -C /srv/restore`).
4. `sqlite3 /srv/restore/db.sqlite 'PRAGMA integrity_check'` должен вернуть `ok`.
5. Положить базу в volume: `install -o $(stat -c %u /var/lib/docker/volumes/clod_db-data/_data) -m 600 /srv/restore/db.sqlite /var/lib/docker/volumes/clod_db-data/_data/db.sqlite`
   (никаких `-wal`/`-shm` рядом быть не должно).
6. Загрузки: `tar -xzf /srv/restore/uploads.tgz -C /var/lib/docker/volumes/clod_uploads/_data`.
7. Убедиться, что `/srv/clod/.env` содержит те же ключи шифрования, что были на момент бэкапа.
8. `docker compose up -d app` — entrypoint проверит env и строго проверит схему; затем открыть трафик.
9. Проверить `https://new.odintsovclinic.ru/admin/patients` и число пациентов.

Копия базы без исходного `PATIENT_ENCRYPTION_KEY` сохраняет обезличенную историю, но профили
восстановить невозможно.

## Журнал учений

| Дата | Архив | integrity | Patient | HistoricalVisit | RTO, с | Кто |
|---|---|---|---|---|---|---|
| 2026-09-04 | `clod-20260904T223654Z.tar.gz` (216 МБ, без шифрования и off-host копии — ключ и remote ещё не настроены) | ok | 16 173 | 49 768 | 6 (распаковка + проверка; снимок занял 28 с) | Claude Code по roadmap Фазы 0 |
