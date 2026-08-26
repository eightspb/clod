# Эксплуатация интеграции MANGO OFFICE

Интеграция принимает только входящие события `events/call` и `events/summary`, связывает номер звонящего с уже существующим пациентом и показывает звонок в защищённой админ-панели. Она не импортирует историю, не инициирует вызовы и не получает записи или содержание разговоров.

Перед production-активацией владелец клиники должен проверить и утвердить текст `/privacy-policy`, перечень сотрудников с доступом и срок хранения данных.

## 1. Секреты и линии

В личном кабинете MANGO OFFICE откройте «Интеграции → API Коннектор» и подключите отдельный коннектор. MANGO автоматически создаёт уникальный код и ключ подписи. Перенесите их напрямую в untracked `/srv/clod/.env`, не отправляя в чат, Git, тикеты или журналы команд:

```dotenv
MANGO_VPBX_API_KEY=
MANGO_VPBX_API_SALT=
MANGO_CALL_ENCRYPTION_KEY=
MANGO_INBOUND_LINES=+78127482210
```

- `MANGO_VPBX_API_KEY` — уникальный код коннектора из MANGO.
- `MANGO_VPBX_API_SALT` — ключ подписи того же коннектора из MANGO.
- `MANGO_CALL_ENCRYPTION_KEY` — отдельный AES-ключ, создаваемый командой `openssl rand -base64 32`.
- `MANGO_INBOUND_LINES` — обязательный список разрешённых входящих линий через запятую. Каждая линия задаётся в международном формате; неизвестные линии приложение подтверждает, но не сохраняет.
- `CONTACT_FINGERPRINT_KEY` должен оставаться стабильным: он связывает звонок с существующим пациентом по HMAC-отпечатку телефона.

Все четыре MANGO-переменные являются server-only и не должны иметь префикс `PUBLIC_`. API key, salt, ключ звонков и `CONTACT_FINGERPRINT_KEY` должны быть разными значениями. Храните резервную копию ключей отдельно от резервной копии базы.

## 2. Настройка API-коннектора

1. Укажите адрес внешней системы `https://odintsovclinic.ru/api/integrations/mango`.
2. Проверьте итоговые callback URL:
   - `https://odintsovclinic.ru/api/integrations/mango/events/call`;
   - `https://odintsovclinic.ru/api/integrations/mango/events/summary`.
3. Выберите версию событий `1`.
4. Включите отправку событий по звонкам и оставьте разрешёнными промежуточные `events/call` и итоговые `events/summary`.
5. Отключите DTMF, SMS, адресную книгу, статусы пользователей, `events/recording`, `events/record/added`, `events/record/tagged`, распознавание, роботов и кампании. Опцию доступа к записям разговоров не включайте.
6. Не исключайте из отправки номера, перечисленные в `MANGO_INBOUND_LINES`.
7. Нажмите «Проверить подключение», затем сохраните коннектор.

Публичный health-check `GET /api/integrations/mango` возвращает только `{"data":{"available":true}}`: он не подтверждает наличие или значение секретов. Webhook принимает form-urlencoded поля `vpbx_api_key`, `sign` и `json`, проверяет подпись до JSON-разбора и ограничивает поток 300 запросами в минуту на доверенный адрес источника.

## 3. Nginx и сеть

`docker-compose.yml` монтирует только `nginx.conf`. После выпуска сертификата production-деплой должен выполнить `cp nginx.https.conf nginx.conf`; HTTP-шаблон webhook не проксирует.

На 26 августа 2026 года официальная документация MANGO указывает пять адресов API Realtime:

- `81.88.80.132`;
- `81.88.80.133`;
- `81.88.82.36`;
- `81.88.82.44`;
- `81.88.82.45`.

HTTPS-шаблон разрешает webhook только этим адресам, ограничивает тело 64 КиБ и использует короткие proxy timeout. IP-allowlist не заменяет подпись приложения. Перед каждым production-деплоем повторно сверьте список с [общими требованиями API Realtime](https://docs.mango-office.ru/ru/5_api-i-razrabotka/1_api-mango-office/5_opisanie_metodov_api_virtualnoy_ats_mango/1_1_api_realtime/3_1_1_obschee.html).

Проверки конфигурации:

```bash
docker compose config --quiet
docker compose run --rm --no-deps nginx nginx -t
```

Вторая команда проверяет фактически смонтированный `nginx.conf`. На production запускайте её после копирования HTTPS-шаблона и до `docker compose up -d` или `nginx -s reload`.

## 4. Безопасный smoke-test

Сначала проверьте data-free маршрут извне:

```bash
curl --fail --silent --show-error https://odintsovclinic.ru/api/integrations/mango
```

Для проверки подписи и сохранения используйте только вымышленный номер `+7 900 000-00-00`. Запускайте тест из контейнера `app`, чтобы не ослаблять публичный IP-allowlist. Команда ниже отправляет live-событие и сразу финальный missed-summary с тем же `entry_id`; она выводит только тип события, HTTP-статус и безопасный outcome:

```bash
docker compose exec -T app bun -e '
import { createHash } from "node:crypto";
const key = process.env.MANGO_VPBX_API_KEY;
const salt = process.env.MANGO_VPBX_API_SALT;
if (!key || !salt) throw new Error("MANGO smoke configuration is missing");
const now = Math.floor(Date.now() / 1000);
const entry = `synthetic-smoke-${Date.now()}`;
const events = [
  ["call", { entry_id: entry, call_id: `${entry}-leg`, timestamp: now, seq: 1, call_state: "Appeared", location: "ivr", from: { number: "79000000000" }, to: { line_number: "78127482210" } }],
  ["summary", { entry_id: entry, call_direction: 1, from: { number: "79000000000" }, to: {}, line_number: "78127482210", create_time: now, forward_time: now + 1, talk_time: 0, end_time: now + 2, entry_result: 0, disconnect_reason: 1170 }],
];
for (const [type, event] of events) {
  const json = JSON.stringify(event);
  const sign = createHash("sha256").update(`${key}${json}${salt}`, "utf8").digest("hex");
  const response = await fetch(`http://127.0.0.1:4321/api/integrations/mango/events/${type}`, { method: "POST", body: new URLSearchParams({ vpbx_api_key: key, sign, json }) });
  const result = await response.json();
  console.log(`${type}: ${response.status} ${result.data?.outcome || result.error || "UNKNOWN"}`);
  if (!response.ok) process.exitCode = 1;
}
'
```

Ожидаемый результат обоих запросов — HTTP `200` и outcome `applied`; затем запись должна появиться в `/admin/calls` как пропущенная с маскированным номером. Команда не печатает тело формы, подпись или переменные среды. Если production-линия отличается, замените только вымышленное значение `line_number` на линию из `MANGO_INBOUND_LINES`.

Не используйте для smoke-test настоящий номер пациента. Не выполняйте synthetic smoke через публичный Nginx с временным расширением allowlist.

## 5. Наблюдение и диагностика

Контролируйте вкладку «История запросов к API» в MANGO и `/admin/calls`:

| Симптом | Вероятная причина | Действие |
|---|---|---|
| `403` | IP MANGO отсутствует в allowlist или запрос пришёл по HTTP | Сверить официальный список и активный `nginx.conf`; не открывать путь всему интернету |
| `401` | API key/salt рассинхронизированы или подпись повреждена | Сверить пару коннектора с server-only `.env`, затем пересоздать только `app` |
| `400`/`413` | Неверный контракт или слишком большое событие | Проверить тип события и историю запроса в MANGO; не увеличивать лимит без анализа |
| `429` | Более 300 доставок в минуту с одного IP | Проверить шторм повторов и состояние БД; дождаться окна или устранить причину `5xx` |
| `503` | Нет конфигурации, недоступна БД или запись не выполнена | Проверить health контейнера, volume и безопасные stage-коды в логах |
| Звонок долго активен | Не пришёл `events/summary` | Проверить, что итоговые события не отключены, и историю callback в MANGO |
| Нет связи с пациентом | Телефон пациента отсутствует/уничтожен или изменён fingerprint-ключ | Не менять ключ; проверить профиль только через защищённую админку |

Приложение пишет только фиксированные stage-коды и не журналирует raw webhook, номер или секрет. История запросов MANGO может содержать номер звонящего, поэтому доступ к ней также должен быть ограничен.

## 6. Backup, восстановление и ротация

`/data/db.sqlite` содержит зашифрованные номера звонящих и обезличенную статистику. Для согласованного backup остановите запись, сохраните volume `db-data`, отдельно сохраните `MANGO_CALL_ENCRYPTION_KEY` и `CONTACT_FINGERPRINT_KEY`, затем возобновите сервис. При восстановлении сначала верните согласованные версии базы и ключей, запустите строгую миграцию, выполните health-check и только затем откройте трафик.

Ротация API-коннектора:

1. Сохранить backup и зафиксировать окно работ.
2. Приостановить отправку событий или предупредить о коротком окне недоставки.
3. Сгенерировать новую пару code/key в MANGO.
4. Сразу заменить `MANGO_VPBX_API_KEY` и `MANGO_VPBX_API_SALT` в server-only `.env`.
5. Выполнить `docker compose up -d --force-recreate app`, затем health-check и «Проверить подключение».
6. Выполнить контролируемые звонки из чек-листа и проверить отсутствие `401`/`503`.

`MANGO_CALL_ENCRYPTION_KEY` и `CONTACT_FINGERPRINT_KEY` нельзя просто заменить: существующие номера перестанут расшифровываться или связываться с пациентами. Их ротация требует отдельной offline-миграции с повторным шифрованием/пересчётом отпечатков. До появления и проверки такой миграции храните исходные ключи неизменными.

## 7. Rollback

1. Отключить отправку `events/call` и `events/summary` в коннекторе MANGO.
2. Вернуть предыдущие согласованные версии приложения, `nginx.conf`, базы и server-only секретов.
3. Выполнить `docker compose config --quiet` и `docker compose run --rm --no-deps nginx nginx -t`.
4. Запустить стек, проверить публичный health и админ-панель.
5. Включить события и выполнить один контролируемый звонок.

Откат кода не должен сопровождаться удалением volume или заменой стабильных ключей. Если нужно временно остановить приём, отключите события в коннекторе; не снимайте HMAC-проверку и не открывайте Nginx allowlist.

## 8. Ручная активация с явным разрешением владельца

Автоматические тесты не создают платную запись Medflex и не совершают реальные звонки. После отдельного явного разрешения владельца клиники выполните вручную:

- одну запись на свободный слот через публичную форму и проверку единственной локальной/Medflex-записи;
- отмену этой записи через админку и проверку результата в Medflex;
- принятый входящий звонок на разрешённую линию;
- пропущенный входящий звонок;
- повторный звонок с того же согласованного тестового номера;
- проверку маски, временного reveal, журнала доступа, связи с пациентом и агрегатов Dashboard;
- проверку, что `events/recording`, `events/record/added`, аудиофайлы и исторические звонки отсутствуют.

Фиксируйте только outcome и время проверки. Не включайте номер, ФИО, raw payload, подпись или секреты в отчёт.

## Официальные контракты

- [Настройка API-коннектора](https://docs.mango-office.ru/ru/3_produkty-i-prilozheniya/1_virtualnaya-ats-i-lichnyi-kabinet/3_6_nastroyka_ats/2_6_7_integratsii/4_6_7_3_api_konnektor.html)
- [`events/call`](https://docs.mango-office.ru/ru/5_api-i-razrabotka/1_api-mango-office/5_opisanie_metodov_api_virtualnoy_ats_mango/1_1_api_realtime/3_1_2_uvedomlenie_o_vyzove.html)
- [`events/summary`](https://docs.mango-office.ru/ru/5_api-i-razrabotka/1_api-mango-office/5_opisanie_metodov_api_virtualnoy_ats_mango/1_1_api_realtime/3_1_6_uvedomlenie_o_zavershenii_vyzova.html)
