# Архитектура: Сводка (web) и Боты (Telegram)

## Решение: независимые продукты с общим ядром

**Сводка** (web-панель) и **Боты** (Telegram-боты) — это **два независимых продукта**, каждый со своей БД и деплоем.

| | Сводка (web) | Боты (Telegram) |
|---|---|---|
| Runtime | Next.js на Vercel → Timeweb | Cloudflare Workers |
| БД | Turso (LibSQL) | Cloudflare D1 |
| Auth | Yandex OAuth → NextAuth | Yandex OAuth → Telegram |
| Подписка | subscriptions таблица в Turso | Будет отдельно |
| Алерты | Email (Resend) | Telegram messages |
| Cron | Vercel Cron → Timeweb cron | CF Cron Triggers |

## Общий код (engine)

Бизнес-логика (API-клиенты, сигналы, формат) идентична:
- `engine/metrika/api.ts` — клиент Метрики
- `engine/direct/api.ts` — клиент Директа
- `engine/crypto.ts` — шифрование токенов
- `engine/format.ts` — форматирование чисел

**Принцип:** engine — чистые функции без side-effects. Принимают token, возвращают данные.

## Связь между продуктами

- **User ID:** Yandex ID — единый идентификатор пользователя в обеих системах
- **Данные:** каждый продукт хранит свои snapshots независимо
- **Подписки:** пока независимы. На этапе Robokassa — единая подписка через Yandex ID

## Будущее (после Robokassa)

Когда оба продукта станут платными, единый биллинг:
1. Сводка — источник истины по подписке
2. Боты проверяют подписку через API-endpoint Сводки
3. Endpoint: `GET /api/subscription/check?yandexId=XXX` → `{ plan, active }`

Этот контракт будет реализован на Timeweb.
