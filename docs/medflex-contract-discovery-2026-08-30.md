# Разведка контракта Medflex clinic-token — 30 августа 2026

## Итог

Живой токен клиники проверен запросами к 18 путям и 19 HTTP-операциям опубликованного контракта `clinic-token`. В отчёте сохранены только статусы, счётчики и имена полей. Значения полей, ФИО, телефоны, токен и тела ошибок не сохранялись.

Критический результат: `GET /direct_appointment/history/` стабильно отвечает `404`. Текущий reconciliation в `src/lib/appointment-booking.js` не может использовать этот метод для восстановления неопределённого результата платного создания записи. Для исправления заведена отдельная задача; до её завершения нельзя считать автоматическое восстановление от повторной платной операции рабочим.

Схема содержит 18 уникальных путей и 19 HTTP-операций, поскольку `/webhooks/` поддерживает одновременно GET и POST. Методы группы `/appointments/`, которых нет в контракте `clinic-token`, не вызывались.

## Условия проверки

- Контракт: `https://api.medflex.ru/schema/clinic-token/?format=json`
- Филиал: `lpu_id = 34871`
- Город: `town_id = 1260`
- Финальный бесплатный запуск: `2026-08-30T17:46:18.087Z`
- Дата пробного расписания: `2026-08-30`
- Команда: `bun run medflex:discover`
- POST создания, отмены и webhook проверялись только пустым JSON-объектом `{}`, невалидным по контракту без обязательных полей и параметров. Эти запросы вернули `400`; запись, отмена и подписка не создавались.
- Обычный discovery допускает один повтор только бесплатного GET после ограниченного `Retry-After`. POST и платный doctor detail не повторяются.

## Результаты операций

| Метод | Путь | Статус | Объектов | Ключи первого объекта |
|---|---|---:|---:|---|
| POST | `/direct_appointment/doctor/cancel/` | 400 | 0 | — |
| POST | `/direct_appointment/doctor/execute/` | 400 | 0 | — |
| GET | `/direct_appointment/history/` | 404 | 0 | — |
| GET | `/models/district/` | 200 | 23 | `id`, `name`, `town_id` |
| GET | `/models/doctor/` | 200 | 1 | `allowed_age`, `doctor_url`, `efio`, `id`, `lpus`, `prices`, `review_count`, `specialities` |
| GET | `/models/doctor/all/` | 200 | 1 | `allowed_age`, `doctor_url`, `efio`, `id`, `lpus`, `prices`, `review_count`, `specialities` |
| GET | `/models/lpu/` | 200 | 1 | `address`, `cancel_appointment_is_supported`, `direct_appointment_is_supported`, `district_id`, `has_prices`, `id`, `insurance_company_priority`, `is_visible`, `lat`, `legal_entity`, `lon`, `lpu_group_id`, `name`, `partner_lpu_id`, `phone`, `second_name_is_required`, `site`, `specialities`, `timedelta`, `town_id`, `town_name`, `user_id`, `uuid` |
| GET | `/models/lpu_group/` | 200 | 1 | `id`, `name` |
| GET | `/models/metro/` | 200 | 70 | `id`, `line_id`, `name`, `town_id` |
| GET | `/models/metro_line/` | 200 | 5 | `color`, `id`, `name`, `town_id` |
| GET | `/models/region/` | 200 | 84 | `id`, `name` |
| GET | `/models/speciality/` | 200 | 230 | `id`, `name` |
| GET | `/models/town/` | 200 | 1235 | `id`, `name`, `region_id` |
| GET | `/schedule/` | 200 | 0 | — |
| GET | `/schedule/lpu/` | 200 | 1 | `lpu_id`, `schedule` |
| GET | `/services/categories/` | 200 | 21 | `id`, `name` |
| GET | `/services/prices/` | 200 | 666 | `category_id`, `doctor_ids`, `duration`, `id`, `name`, `price` |
| GET | `/webhooks/` | 200 | 0 | — |
| POST | `/webhooks/` | 400 | 0 | — |

`/models/doctor/` и `/models/doctor/all/` намеренно фильтровались до одного известного врача, поэтому счётчик `1` не означает размер полного каталога. `/schedule/` проверялся на один день и вернул пустой список; это не является показателем загрузки. `/schedule/lpu/` с минимальным обязательным фильтром филиала вернул один объект филиала.

## Единственная платная проверка doctor detail

`GET /models/doctor/?detailed=true` был вызван ровно один раз для одного известного врача с `size=1` в `2026-08-30T17:44:24.329Z`. Запрос ответил `200` и вернул один объект.

Ключи объекта:

`allowed_age`, `avatar`, `avatar_300`, `description`, `doctor_url`, `education_and_experience`, `efio`, `id`, `lpus`, `prices`, `rating`, `review_count`, `reviews`, `specialities`, `video_card`.

Все отдельно запрошенные поля присутствуют:

- `rating`
- `review_count`
- `reviews`
- `doctor_url`
- `education_and_experience`
- `avatar`
- `description`
- `video_card`

Дополнительно обнаружено поле `avatar_300`. Значения полей намеренно не фиксировались. Обычная команда не вызывает платную опцию. Повторный платный запрос возможен только с явным флагом `--include-paid-doctor-detail`; использовать его повторно без отдельного решения владельца нельзя.

## Расхождения с прежними предположениями

- History endpoint не просто отсутствовал в старом проектировании: живая проверка снова подтвердила `404`, хотя операция остаётся в опубликованной схеме.
- Прайс вернул 666 позиций, а предыдущая проверка в проектной спецификации фиксировала 667. Этап 1 должен исходить из нового снимка и не считать прежнее число постоянным.
- Категории услуг и специальности подтвердили прежние значения: 21 и 230.
- `/schedule/lpu/` доступен и отвечает `200`; для discovery ему достаточно обязательного `lpu_ids` и номера страницы.
- Ни одна GET-операция контракта не вернула `403`. POST-проверки вернули `400` на заведомо неполное тело и не доказывают успешное выполнение валидной мутации.

## Решение по следующим этапам

Этапы 1–5 не начинаются до отдельного исправления стратегии неопределённого исхода записи. После исправления этап 1 должен использовать 666 позиций как текущий наблюдаемый снимок, а не как вечный инвариант. Регулярный `detailed=true` не включается.
