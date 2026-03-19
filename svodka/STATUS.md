# Сводка — Статус проекта

> Последнее обновление: 2026-03-19

## Что это

Сводка — веб-панель аналитики для контроля сайта (Яндекс.Метрика) и рекламы (Яндекс.Директ). SaaS для руководителей малого бизнеса.

---

## ✅ Что сделано (работает на Vercel)

### Ядро
- [x] Next.js 16 App Router + Tailwind v4 + shadcn/ui
- [x] Yandex OAuth авторизация (NextAuth)
- [x] AES-256-GCM шифрование OAuth-токенов
- [x] Turso (LibSQL) + Drizzle ORM — все таблицы, миграции
- [x] Structured logging (`lib/logger.ts`)

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
- [x] Paywall overlay с разделением по тарифам
- [x] Sidebar с навигацией, замками на залоченных экранах, поддержка
- [x] Responsive layout (1200px max-width)

### Инфраструктура
- [x] Cron: сбор snapshots (`/api/cron/collect`) — per-project изоляция ошибок
- [x] Cron: проверка алертов (`/api/cron/alerts`) — cooldown до API-вызовов
- [x] Email: Resend интеграция, шаблоны alert + welcome
- [x] Rate limiting middleware (API 60/мин, Auth 10/мин)
- [x] Онбординг: подключение Метрики + Директа

### Биллинг (код готов, не активирован)
- [x] Таблица subscriptions (plan, status, trialEndsAt, paidUntil)
- [x] `subscription.ts` — проверка доступа по плану
- [x] `trial.ts` — триал-логика (TRIAL_ENABLED = false → бесконечный триал)
- [x] `subscriptions.ts` — activatePaidSubscription, extendSubscription, cancelSubscription, expireOverdue
- [x] Payment webhook — шаблон Робокассы (MD5 signature, plan mapping, email)

---

## 🔧 Что нужно сделать на Timeweb

### Деплой
- [ ] Настроить VPS на Timeweb (Node.js 18+, PM2 или Docker)
- [ ] Перенести БД Turso или поднять SQLite локально
- [ ] Настроить env-переменные (см. `.env.example`)
- [ ] Настроить cron (`crontab` для `/api/cron/collect` и `/api/cron/alerts`)
- [ ] Настроить домен (svodka.app или поддомен)
- [ ] SSL сертификат (Let's Encrypt)

### Активировать функции
- [ ] **Триал 7 дней**: `lib/trial.ts` → `TRIAL_ENABLED = true`
- [ ] **Welcome email**: `lib/email/index.ts` → раскомментировать отправку в `sendWelcomeEmail()`
- [ ] **Dev-баннер**: `app/layout.tsx` → убрать жёлтый баннер "Сайт в разработке"

### Юридическое + платежи (требует ПНД)
- [ ] Регистрация самозанятого
- [ ] Публичная оферта → `/legal/offer/`
- [ ] Политика ПД (ФЗ-152) → `/legal/privacy/`
- [ ] Подключить Робокассу → получить credentials
- [ ] Заполнить env: `ROBOKASSA_MERCHANT_LOGIN`, `ROBOKASSA_PASSWORD_1`, `ROBOKASSA_PASSWORD_2`
- [ ] `api/webhooks/payment/route.ts` → `ROBOKASSA_ENABLED = true`
- [ ] Настроить Result URL в кабинете Робокассы → `https://domain/api/webhooks/payment`
- [ ] Создать страницу оплаты (формирование URL Робокассы с Shp_userId и Shp_item)
- [ ] Тестовый платёж

### Мониторинг
- [ ] Настроить сбор логов (Vercel Logs / файл / Datadog)
- [ ] Алерт если cron не выполнился (uptime monitor)
- [ ] Мониторинг истечения OAuth-токенов пользователей

### Контент и маркетинг
- [ ] Обновить лендинг andreyai.ru/svodka/ — CTA на app URL
- [ ] Скриншоты реального дашборда
- [ ] Yandex Metrika на продукте: заполнить `NEXT_PUBLIC_YM_ID` в env

---

## 💰 Тарифы (заложены в код)

| Тариф | Цена | Доступ |
|-------|------|--------|
| Сводка.Сайт | 990 ₽/мес | Экран "Сайт" |
| Сводка.Реклама | 990 ₽/мес | Экран "Реклама" |
| Сводка.Всё | 1 490 ₽/мес | Все экраны включая "Обзор" |
| Триал | 0 ₽ / 7 дней | Полный доступ (не активирован) |

---

## 📁 Ключевые файлы для активации на Timeweb

```
lib/trial.ts                    → TRIAL_ENABLED = true
lib/email/index.ts              → раскомментировать sendWelcomeEmail
api/webhooks/payment/route.ts   → ROBOKASSA_ENABLED = true
app/layout.tsx                  → убрать dev-баннер
.env.example                    → шаблон всех переменных
```

---

## Архитектура

Подробности: [ARCHITECTURE.md](./ARCHITECTURE.md)
