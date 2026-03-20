# Сводка — Статус проекта

> Последнее обновление: 2026-03-20

## Что это

Сводка — веб-панель аналитики для контроля сайта (Яндекс.Метрика) и рекламы (Яндекс.Директ). SaaS для руководителей малого бизнеса.

---

## Что сделано (работает на Vercel)

### Ядро
- [x] Next.js 16 App Router + Tailwind v4 + shadcn/ui
- [x] Yandex OAuth авторизация (NextAuth)
- [x] AES-256-GCM шифрование OAuth-токенов
- [x] Turso (LibSQL) + Drizzle ORM — все таблицы, миграции
- [x] Structured logging (`lib/logger.ts`)
- [x] Rate limiting proxy (API 60/мин, Auth 10/мин) — Next 16 `proxy.ts`

### Экраны
- [x] **Обзор** — агрегация Метрика + Директ, проблемы, действия
- [x] **Сайт** — KPI-карточки, сигналы, инсайт, источники трафика, графики (Recharts)
- [x] **Реклама** — KPI, сигналы, инсайт, таблица кампаний, графики расхода/кликов
- [x] **Журнал** — история алертов и событий
- [x] **Настройки** — проекты, алерты, метрики, подписка
- [x] **Демо** — полный демо-дашборд с фейковыми данными

### Фичи
- [x] Кастомизация метрик — пользователь выбирает какие KPI показывать
- [x] Drag-and-drop порядок метрик
- [x] Loading-скелетоны на всех страницах
- [x] Recharts графики в production (данные за 14 дней)
- [x] Server-side access control — платные данные не грузятся без подписки
- [x] Баннер "токен истёк" — жёсткий reconnect UX при протухании OAuth
- [x] Sidebar с навигацией, замками на залоченных экранах, поддержка
- [x] Responsive layout (1200px max-width)
- [x] Dev-баннер управляется через `NEXT_PUBLIC_DEV_BANNER` env

### Инфраструктура
- [x] Cron: сбор snapshots (`/api/cron/collect`) — per-project изоляция ошибок
- [x] Cron: проверка алертов каждые 15 мин 7:00-22:00 (`/api/cron/alerts`)
- [x] Cron: детекция протухших токенов → событие в журнале
- [x] Email: Resend интеграция, шаблоны alert + welcome
- [x] Baseline Метрики: ровно 7 завершённых дней (не пересекается с текущим)
- [x] Онбординг: подключение Метрики + Директа
- [x] `crontab.example` — готовый шаблон cron для Timeweb VPS

### Биллинг (код готов, не активирован)
- [x] Таблица subscriptions (plan, status, trialEndsAt, paidUntil)
- [x] `subscription.ts` — проверка доступа по плану
- [x] `trial.ts` — триал-логика (TRIAL_ENABLED = false → бесконечный триал)
- [x] `subscriptions.ts` — activatePaidSubscription, extendSubscription, cancelSubscription
- [x] Payment webhook — шаблон ЮKassa (metadata-based, plan mapping, email)

---

## Что нужно сделать на Timeweb

### Деплой
- [ ] Настроить VPS на Timeweb (Node.js 18+, PM2 или Docker)
- [ ] Перенести БД Turso или поднять SQLite локально
- [ ] Настроить env-переменные (см. `.env.example`)
- [ ] Настроить cron (см. `crontab.example`)
- [ ] Настроить домен (app.svodka.ru или поддомен)
- [ ] SSL сертификат (Let's Encrypt)

### Активировать функции
- [ ] **Триал 7 дней**: `lib/trial.ts` → `TRIAL_ENABLED = true`
- [ ] **Welcome email**: `lib/email/index.ts` → раскомментировать отправку в `sendWelcomeEmail()`
- [ ] **Dev-баннер**: убрать `NEXT_PUBLIC_DEV_BANNER=true` из env (или не ставить)

### Юридическое + платежи (требует ПНД)
- [ ] Регистрация самозанятого
- [ ] Публичная оферта → `/legal/offer/`
- [ ] Политика ПД (ФЗ-152) → `/legal/privacy/`
- [ ] Подключить ЮKassa → получить credentials
- [ ] Заполнить env: `YUKASSA_SHOP_ID`, `YUKASSA_SECRET_KEY`
- [ ] `YUKASSA_ENABLED=true` в env
- [ ] Настроить webhook URL в ЮKassa → `https://domain/api/webhooks/payment`
- [ ] Создать страницу оплаты (ЮKassa API: создание платежа с metadata userId + plan)
- [ ] Тестовый платёж

### Мониторинг
- [ ] Настроить сбор логов (файл / Datadog)
- [ ] Алерт если cron не выполнился (uptime monitor)
- [ ] Мониторинг истечения OAuth-токенов (уже детектится в cron + UI баннер)

### Контент и маркетинг
- [ ] Обновить лендинг andreyai.ru/svodka/ — CTA на app URL
- [ ] Скриншоты реального дашборда
- [ ] Yandex Metrika на продукте: заполнить `NEXT_PUBLIC_YM_ID` в env
- [ ] Настроить почтовый домен + sender (env: `EMAIL_FROM`)

---

## Тарифы (заложены в код)

| Тариф | Цена | Доступ |
|-------|------|--------|
| Сводка.Сайт | 990 Р/мес | Экран "Сайт" |
| Сводка.Реклама | 990 Р/мес | Экран "Реклама" |
| Сводка.Всё | 1 490 Р/мес | Все экраны включая "Обзор" |
| Триал | 0 Р / 7 дней | Полный доступ (не активирован) |

---

## Ключевые файлы для активации на Timeweb

```
lib/trial.ts                    → TRIAL_ENABLED = true
lib/email/index.ts              → раскомментировать sendWelcomeEmail
.env → YUKASSA_ENABLED=true     → включить платежи
.env → NEXT_PUBLIC_DEV_BANNER   → не ставить (баннер не покажется)
.env → EMAIL_FROM               → настроить sender
.env.example                    → шаблон всех переменных
crontab.example                 → шаблон cron для VPS
```

---

## Архитектура

Подробности: [ARCHITECTURE.md](./ARCHITECTURE.md)
