# ПЛАН ДЛЯ CLAUDE

> Краткий план разработки. Выполнять последовательно.

---

## СТРУКТУРА ПРОЕКТА

```
src/
├── index.ts                 # Entry point (роутинг webhooks)
├── env.ts                   # Типы ENV
├── shared/
│   ├── db.ts                # StorageAdapter (D1)
│   ├── telegram.ts          # sendMessage, createForumTopic, etc.
│   ├── crypto.ts            # encrypt/decrypt токенов
│   └── format.ts            # Форматирование сообщений
├── metrika/
│   ├── handler.ts           # Обработка update
│   ├── states.ts            # State machine
│   ├── api.ts               # Яндекс.Метрика API
│   ├── reports.ts           # Формирование отчётов
│   └── cron.ts              # Отправка по расписанию
├── direct/
│   └── (аналогично)
├── support/
│   ├── handler.ts
│   ├── tickets.ts
│   └── topics.ts
└── dashboard/
    └── api.ts               # API для дашборда
```

---

## ПОРЯДОК РАЗРАБОТКИ

### 1. SHARED (первым)

```
□ env.ts — типы Env
□ db.ts — StorageAdapter:
  - getUser / createUser / updateUser
  - getChat / createChat / updateChatState
  - saveToken / getToken / deleteToken
  - getSettings / saveSettings
  - getAdminTopic / saveAdminTopic
  - getScheduledReports / getUsersWithAlerts
□ telegram.ts:
  - sendMessage
  - editMessage
  - answerCallback
  - createForumTopic
  - editForumTopic
  - copyMessage
  - createKeyboard
□ crypto.ts — AES-256-GCM encrypt/decrypt
□ format.ts — h1, h2, metric, divider
```

### 2. METRIKA

```
□ handler.ts — роутинг по update type
□ states.ts — transitions:
  idle → awaiting_token → selecting_counter → selecting_goals
  → selecting_metrics → selecting_schedule → selecting_alerts
  → confirmation → active
□ api.ts:
  - validateToken (GET /management/v1/counters)
  - getCounters
  - getGoals (GET /management/v1/counter/{id}/goals)
  - getStats (GET /stat/v1/data)
□ reports.ts — formatReport(stats, prevStats, settings)
□ cron.ts — sendScheduledReports, checkAlerts
□ Создание админ-топика при /start
□ Обновление топика при завершении настройки
```

### 3. DIRECT

```
□ Копировать структуру metrika
□ Изменить api.ts:
  - validateToken + login (POST /json/v5/campaigns)
  - getCampaigns
  - getReport (POST /json/v5/reports)
□ Добавить выбор кампаний (all/selected)
□ Добавить период сравнения (day/week/month)
□ Добавить кнопку "Открыть дашборд"
```

### 4. SUPPORT

```
□ handler.ts:
  - /start с deep-link → parseEntryPoint
  - Сообщение от user → forwardToTopic
  - Сообщение от admin → forwardToUser
□ tickets.ts — CRUD tickets
□ topics.ts — createForumTopic, sendTicketCard
□ Автоответ в нерабочее время (10-19 МСК, Пн-Пт)
□ Cooldown 3 часа
□ Ночные уведомления админу
□ /close — закрытие тикета
```

### 5. DASHBOARD

```
□ API endpoint: GET /api/dashboard/data
□ Валидация session token
□ Сбор данных из Директа
□ Frontend (React/Vue):
  - Экран 1: табы + KPI + таблица
  - Экран 2: сводка + графики
□ Telegram WebApp интеграция
□ Деплой на Cloudflare Pages
```

### 5.5 LANDING (демо-бот)

```
□ handler.ts — роутинг по callback_query
□ screens.ts — статические экраны:
  - welcome (приветствие + кнопка видео)
  - video (видео + выбор продукта)
  - report_metrika (демо-отчёт + вывод)
  - report_direct (демо-отчёт + вывод)
  - alert_demo (пример алерта + рекомендация)
  - dashboard_demo (ссылка на статику)
  - finish (CTA + кнопка на лендинг)
□ Кнопки: изменить показатели/время/показать отчёт
□ Кнопка "Вернуться на лендинг" → https://andreyai.ru/
□ Деплой webhook
```

### 6. ФИНАЛ

```
□ Настроить Cron Triggers в wrangler.toml
□ Деплой всех webhooks
□ Тест полного flow каждого бота
□ Тест связей между ботами
□ Тест дашборда
```

---

## КЛЮЧЕВЫЕ ФАЙЛЫ-СПЕЦИФИКАЦИИ

| Что делаю | Смотреть |
|-----------|----------|
| Общая архитектура, БД, API | `Shared.md` |
| Бот Метрика | `Metrika.md` |
| Бот Директ | `Direct.md` |
| Бот Поддержки | `Bot.md` |
| Дашборд | `Dashboard.md` |
| **Бот Лендинг (демо)** | `Landing.md` |
| SQL миграции | `PLAN.md` → Фаза 1 |

---

## API ENDPOINTS

```
POST /webhook/metrika    → metrika/handler.ts
POST /webhook/direct     → direct/handler.ts
POST /webhook/support    → support/handler.ts
POST /webhook/landing    → landing/handler.ts
GET  /api/dashboard/data → dashboard/api.ts
```

---

## ENV (нужны для работы)

```
TELEGRAM_BOT_TOKEN_METRIKA
TELEGRAM_BOT_TOKEN_DIRECT
TELEGRAM_BOT_TOKEN_SUPPORT
TELEGRAM_BOT_TOKEN_LANDING
METRIKA_ADMIN_GROUP_ID
DIRECT_ADMIN_GROUP_ID
SUPPORT_GROUP_ID
ADMIN_IDS
LANDING_URL=https://andreyai.ru/
DASHBOARD_DEMO_URL
YANDEX_OAUTH_CLIENT_ID
YANDEX_DIRECT_CLIENT_ID
ENCRYPTION_KEY
DASHBOARD_SESSION_SECRET
```

---

## ВАЖНО ПОМНИТЬ

1. **Топик для каждого юзера** — создавать при /start в Метрике и Директе
2. **Батчинг** — 25 сообщений, пауза 1.1 сек
3. **Подписка = заглушка** — `return true` везде
4. **Deep-links** — формат `{bot}_{type}_{screen}`
5. **Шифрование токенов** — AES-256-GCM, ключ из ENV
