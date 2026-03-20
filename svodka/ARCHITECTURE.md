# Архитектура: Сводка

## Единый продукт

**Сводка** — веб-панель аналитики для контроля сайта и рекламы. Один продукт, один деплой.

Telegram-боты были предыдущей версией продукта. Из них взят engine (API-клиенты, сигналы, шифрование). Боты больше не развиваются и не деплоятся.

## Стек

| Слой | Технология |
|---|---|
| Frontend | Next.js App Router + Tailwind + shadcn/ui + Recharts |
| Backend | Next.js Server Components + Server Actions |
| Auth | NextAuth + Yandex OAuth |
| БД | Turso (LibSQL) + Drizzle ORM |
| Email | Resend + HTML шаблоны |
| Cron | Vercel Cron (→ Timeweb cron) |
| Hosting | Vercel (тест) → Timeweb (прод) |
| Платежи | ЮKassa (заложена, не активирована) |

## Структура кода

```
src/
├── app/           # Next.js pages + API routes
├── components/    # UI компоненты
├── lib/
│   ├── engine/    # Бизнес-логика (из ботов): API-клиенты, сигналы, crypto, format
│   ├── db/        # Drizzle schema + queries
│   ├── email/     # Resend + шаблоны
│   ├── auth.ts    # NextAuth + Yandex OAuth
│   ├── subscription.ts  # Проверка доступа по подписке
│   ├── trial.ts   # Триал-логика (не активирована)
│   ├── rate-limit.ts    # Rate limiting
│   └── logger.ts  # Structured logging
```

## Принцип engine

`lib/engine/` — чистые функции без side-effects. Принимают token, возвращают типизированные данные. Не знают про БД, auth, UI.

## Что заложено, но не активировано

| Функциональность | Где | Когда активировать |
|---|---|---|
| 7-дневный триал | `lib/trial.ts` → `TRIAL_ENABLED` | На Timeweb |
| Welcome email | `lib/email/index.ts` → `sendWelcomeEmail` | На Timeweb |
| ЮKassa | `api/webhooks/payment` → `YUKASSA_ENABLED` | После ПНД + юрдоки |
