# ОБЩАЯ АРХИТЕКТУРА СИСТЕМЫ БОТОВ

> Этот документ описывает общие компоненты для всех ботов: Метрика, Директ, Лендинг (демо), Поддержка

---

## 1. ОБЗОР СИСТЕМЫ

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ЭКОСИСТЕМА БОТОВ                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐           │
│   │  БОТ        │     │  БОТ        │     │  БОТ                │           │
│   │  МЕТРИКА    │────▶│  ДИРЕКТ     │────▶│  ПОДДЕРЖКА          │           │
│   │             │     │  + Дашборд  │     │  (общий для всех)   │           │
│   └──────┬──────┘     └──────┬──────┘     └──────────┬──────────┘           │
│          │                   │                       │                       │
│          ▼                   ▼                       ▼                       │
│   ┌─────────────────────────────────────────────────────────────┐           │
│   │                    ОБЩАЯ БАЗА ДАННЫХ                         │           │
│   │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────┐ │           │
│   │  │ users   │  │ chats   │  │ tokens  │  │ subscriptions   │ │           │
│   │  └─────────┘  └─────────┘  └─────────┘  └─────────────────┘ │           │
│   └─────────────────────────────────────────────────────────────┘           │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────┐           │
│   │  БОТ ЛЕНДИНГ (ДЕМО)                                          │           │
│   │  • Без API — статические данные                              │           │
│   │  • Демонстрация функционала Метрики и Директа               │           │
│   │  • Кнопка возврата на лендинг → https://andreyai.ru/        │           │
│   └─────────────────────────────────────────────────────────────┘           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.1 Описание ботов

| Бот | Назначение | API | Документация |
|-----|------------|-----|--------------|
| **Метрика** | Отчёты из Яндекс.Метрики | Да | [Metrika.md](Metrika.md) |
| **Директ** | Отчёты из Яндекс.Директа + Дашборд | Да | [Direct.md](Direct.md), [Dashboard.md](Dashboard.md) |
| **Лендинг** | Демо-версия без API | Нет | [Landing.md](Landing.md) |
| **Поддержка** | Помощь пользователям | Нет | [Bot.md](Bot.md) |

---

## 2. ХОСТИНГ И МИГРАЦИЯ

### 2.1 Текущий стек (Cloudflare)
| Компонент      | Технология              |
|----------------|-------------------------|
| Runtime        | Cloudflare Workers      |
| База данных    | Cloudflare D1 (SQLite)  |
| KV-хранилище   | Cloudflare KV           |
| Cron           | Cloudflare Cron Triggers|
| Статика        | Cloudflare Pages        |

### 2.2 Целевой стек (Timeweb)
| Компонент      | Технология              |
|----------------|-------------------------|
| Runtime        | Node.js (Express/Fastify)|
| База данных    | PostgreSQL              |
| Cron           | node-cron / системный cron|
| Статика        | Nginx / встроенный сервер|

### 2.3 Абстракции для миграции

```typescript
// Интерфейс хранилища (реализовать для D1 и Postgres)
interface StorageAdapter {
  // Пользователи
  getUser(telegramId: number): Promise<User | null>
  createUser(data: UserCreate): Promise<User>
  updateUser(telegramId: number, data: UserUpdate): Promise<void>

  // Чаты/сессии
  getChat(botType: BotType, telegramId: number): Promise<Chat | null>
  createChat(data: ChatCreate): Promise<Chat>
  updateChatState(chatId: string, state: string, data: object): Promise<void>

  // Токены (зашифрованные)
  saveToken(userId: string, botType: BotType, encryptedToken: string): Promise<void>
  getToken(userId: string, botType: BotType): Promise<string | null>
  deleteToken(userId: string, botType: BotType): Promise<void>

  // Настройки
  getSettings(userId: string, botType: BotType): Promise<Settings | null>
  saveSettings(userId: string, botType: BotType, settings: Settings): Promise<void>

  // Расписания
  getScheduledReports(time: string, timezone: number): Promise<Schedule[]>
  getActiveAlerts(): Promise<Alert[]>
}

// Интерфейс планировщика
interface SchedulerAdapter {
  scheduleReport(userId: string, cronExpression: string): Promise<void>
  cancelReport(userId: string): Promise<void>
  scheduleAlert(alertId: string, checkInterval: number): Promise<void>
}
```

---

## 3. МОДЕЛИ ДАННЫХ

### 3.1 Пользователи (users)

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,                    -- UUID
  telegram_id INTEGER UNIQUE NOT NULL,    -- Telegram user ID
  telegram_username TEXT,                 -- @username
  first_name TEXT,
  last_name TEXT,
  language_code TEXT DEFAULT 'ru',
  timezone_offset INTEGER DEFAULT 180,    -- минуты от UTC (180 = +3 Москва)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'active'            -- active | blocked
);
```

### 3.2 Чаты/сессии по продуктам (chats)

```sql
CREATE TABLE chats (
  id TEXT PRIMARY KEY,                    -- UUID
  user_id TEXT NOT NULL REFERENCES users(id),
  bot_type TEXT NOT NULL,                 -- 'metrika' | 'direct' | 'support'
  telegram_chat_id INTEGER NOT NULL,      -- ID чата в Telegram
  state TEXT DEFAULT 'idle',              -- Текущее состояние (wizard step)
  state_data TEXT,                        -- JSON с данными состояния
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_activity_at DATETIME,

  UNIQUE(user_id, bot_type)
);
```

### 3.3 Подписки (заложено, не реализуем)

```sql
-- ЗАГЛУШКА: структура для будущей реализации
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  plan_id TEXT,                           -- 'free' | 'basic' | 'pro'
  status TEXT DEFAULT 'active',           -- active | expired | cancelled
  paid_until DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- Пока всем даём полный доступ
  -- В будущем: проверять paid_until > NOW()
);

-- Функция проверки (заглушка - всегда true)
-- isSubscriptionActive(userId) → true
```

### 3.4 Токены (зашифрованные)

```sql
CREATE TABLE tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  bot_type TEXT NOT NULL,                 -- 'metrika' | 'direct'
  encrypted_token TEXT NOT NULL,          -- AES-256-GCM зашифрованный токен
  token_type TEXT,                        -- 'oauth' | 'api'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, bot_type)
);
```

### 3.5 Настройки ботов

```sql
CREATE TABLE bot_settings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  bot_type TEXT NOT NULL,
  settings_json TEXT NOT NULL,            -- JSON с настройками
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, bot_type)
);
```

---

## 4. СВЯЗЬ С БОТОМ ПОДДЕРЖКИ

### 4.1 Архитектура связи

```
┌─────────────────┐                    ┌─────────────────────────┐
│   Бот Метрика   │                    │                         │
│                 │──── entry_point ──▶│    Бот Поддержки        │
│ [Помощь]        │     "metrika"      │                         │
│ [Поддержка]     │     "metrika:help" │  - Видит откуда пришёл  │
└─────────────────┘                    │  - Видит продукт        │
                                       │  - Создаёт топик        │
┌─────────────────┐                    │                         │
│   Бот Директ    │──── entry_point ──▶│                         │
│                 │     "direct"       │                         │
│ [Помощь]        │     "direct:alert" │                         │
│ [Поддержка]     │                    │                         │
└─────────────────┘                    └─────────────────────────┘
```

### 4.2 Формат entry_point

```typescript
type EntryPoint = {
  source_bot: 'metrika' | 'direct';       // Откуда пришёл
  source_screen: string;                   // Экран: 'start' | 'settings' | 'report' | 'alert'
  source_button: string;                   // Кнопка: 'help' | 'support' | 'bug' | 'feature'
  user_context?: {                         // Контекст пользователя
    counter_id?: string;                   // ID счётчика (Метрика)
    login?: string;                        // Логин (Директ)
    last_error?: string;                   // Последняя ошибка
  };
  timestamp: number;
};
```

### 4.3 Deep-link для перехода

```
https://t.me/SupportBot?start=metrika_help_settings
https://t.me/SupportBot?start=direct_bug_report
https://t.me/SupportBot?start=metrika_feature_request
```

Формат: `{source_bot}_{button_type}_{screen}`

---

## 5. БЕЗОПАСНОСТЬ

### 5.1 Шифрование токенов

```typescript
// Алгоритм: AES-256-GCM
// Ключ: из ENV переменной ENCRYPTION_KEY (32 байта)

async function encryptToken(token: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getEncryptionKey();
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(token)
  );
  // Возвращаем: base64(iv + encrypted)
}

async function decryptToken(encrypted: string): Promise<string> {
  // Обратная операция
}
```

### 5.2 ENV переменные

```bash
# Telegram боты
TELEGRAM_BOT_TOKEN_METRIKA=xxx
TELEGRAM_BOT_TOKEN_DIRECT=xxx
TELEGRAM_BOT_TOKEN_SUPPORT=xxx
SUPPORT_GROUP_ID=-100xxxxxxxxxx

# Безопасность
ENCRYPTION_KEY=xxx                        # 32 байта для AES-256
WEBHOOK_SECRET=xxx                        # Секрет для проверки webhook

# Яндекс API
YANDEX_OAUTH_CLIENT_ID=xxx               # Client ID для OAuth

# Настройки
DEFAULT_TIMEZONE=180                      # UTC+3 (Москва)
WORK_HOURS_START=10                       # Начало рабочего дня
WORK_HOURS_END=19                         # Конец рабочего дня
```

---

## 6. API ENDPOINTS (Cloudflare Workers)

### 6.1 Webhook endpoints

```
POST /webhook/metrika    — Webhook бота Метрики
POST /webhook/direct     — Webhook бота Директа
POST /webhook/support    — Webhook бота Поддержки
```

### 6.2 Внутренние endpoints

```
GET  /api/health         — Проверка работоспособности
POST /api/cron/reports   — Триггер отправки отчётов (Cron)
POST /api/cron/alerts    — Триггер проверки алертов (Cron)
```

---

## 7. СОСТОЯНИЯ И ПЕРЕХОДЫ (State Machine)

### 7.1 Общая структура состояний

```typescript
type BotState = {
  current: string;           // Текущий шаг
  data: Record<string, any>; // Накопленные данные
  history: string[];         // История переходов (для "Назад")
};

// Пример для Метрики
type MetrikaStates =
  | 'idle'                   // Ожидание
  | 'awaiting_token'         // Ждём токен
  | 'selecting_counter'      // Выбор счётчика
  | 'selecting_goals'        // Выбор целей
  | 'selecting_metrics'      // Выбор метрик
  | 'selecting_schedule'     // Выбор расписания
  | 'selecting_alerts'       // Настройка алертов
  | 'confirmation'           // Подтверждение
  | 'active';                // Настройка завершена
```

### 7.2 Переход между состояниями

```typescript
async function transition(
  chat: Chat,
  action: string,
  payload?: any
): Promise<{ nextState: string; message: TelegramMessage }> {
  const transitions: Record<string, Record<string, Function>> = {
    'idle': {
      'start_setup': () => ({ nextState: 'awaiting_token', message: tokenInstructions }),
    },
    'awaiting_token': {
      'token_received': async (token) => {
        if (await validateToken(token)) {
          return { nextState: 'selecting_counter', message: counterList };
        }
        return { nextState: 'awaiting_token', message: invalidTokenError };
      },
      'back': () => ({ nextState: 'idle', message: startMessage }),
    },
    // ... остальные переходы
  };

  return transitions[chat.state][action](payload);
}
```

---

## 8. TELEGRAM API HELPERS

### 8.1 Отправка сообщений

```typescript
async function sendMessage(
  chatId: number,
  text: string,
  options?: {
    keyboard?: InlineKeyboard;
    parseMode?: 'HTML' | 'Markdown';
    disablePreview?: boolean;
  }
): Promise<Message> {
  return fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: options?.parseMode ?? 'HTML',
      disable_web_page_preview: options?.disablePreview ?? true,
      reply_markup: options?.keyboard,
    }),
  }).then(r => r.json());
}
```

### 8.2 Inline-кнопки

```typescript
function createKeyboard(buttons: Array<Array<{text: string; data?: string; url?: string}>>): InlineKeyboard {
  return {
    inline_keyboard: buttons.map(row =>
      row.map(btn => ({
        text: btn.text,
        callback_data: btn.data,
        url: btn.url,
      }))
    ),
  };
}

// Пример
const mainMenu = createKeyboard([
  [{ text: '📊 Отчёт сейчас', data: 'report_now' }],
  [{ text: '⚙️ Настройки', data: 'settings' }],
  [{ text: '❓ Помощь', url: 'https://t.me/SupportBot?start=metrika_help' }],
]);
```

---

## 9. ФОРМАТИРОВАНИЕ СООБЩЕНИЙ

### 9.1 Стили текста

```typescript
// Заголовки
const h1 = (text: string) => `<b>═══ ${text} ═══</b>`;
const h2 = (text: string) => `<b>▸ ${text}</b>`;

// Метрики
const metric = (label: string, value: string | number, change?: number) => {
  const arrow = change === undefined ? '' : change > 0 ? ' ↑' : change < 0 ? ' ↓' : ' →';
  const changeText = change === undefined ? '' : ` (${change > 0 ? '+' : ''}${change}%)`;
  return `${label}: <b>${value}</b>${arrow}${changeText}`;
};

// Разделители
const divider = '─'.repeat(20);
const thinDivider = '·'.repeat(20);
```

### 9.2 Пример отформатированного отчёта

```
═══ ОТЧЁТ ЯНДЕКС.МЕТРИКА ═══
📅 29.01.2026 vs 28.01.2026
🌐 Счётчик: example.com (12345678)

▸ ОСНОВНЫЕ ПОКАЗАТЕЛИ
─────────────────────
Визиты: 1 234 ↑ (+12%)
Посетители: 987 ↑ (+8%)
Отказы: 32.5% ↓ (-5%)
Глубина: 2.3 → (0%)

▸ ЦЕЛИ
─────────────────────
Заявка: 45 ↑ (+15%)
Звонок: 23 → (0%)

─────────────────────
[📊 Отчёт сейчас] [⚙️ Настройки]
[❓ Помощь]
```

---

## 10. АВТОМАТИЧЕСКИЕ ВЫВОДЫ В ОТЧЁТАХ

Каждый отчёт содержит блок `▸ ВЫВОД` с краткой интерпретацией данных (1-2 предложения).

### 10.1 Зачем нужны выводы

- **Экономия времени** — пользователю не нужно анализировать цифры
- **Фокус на действии** — сразу понятно, что делать
- **Ценность бота** — не просто данные, а готовые инсайты

### 10.2 Структура вывода

```
▸ ВЫВОД
─────────────────────
[Статус] [Описание ситуации]
[Причина, если известна]
👉 [Рекомендация что проверить]
```

**Статусы:**
- ✅ — всё хорошо, позитивная динамика
- ⚠️ — требует внимания, негативная динамика
- ℹ️ — нейтральная информация

### 10.3 Примеры выводов

**Метрика — позитивный:**
```
✅ Трафик и заявки растут — сайт
работает лучше прошлого периода.
```

**Метрика — с проблемой:**
```
⚠️ Заказы упали на 8%. Возможно,
проблема на этапе оформления.
👉 Проверьте страницу оформления
заказа и форму оплаты.
```

**Директ — с виновником:**
```
⚠️ CPA вырос на 24% при падении
конверсий на 7%. Основная причина —
кампания «Поиск — Конкуренты»:
высокий расход, мало конверсий.
👉 Проверьте ставки и ключи в этой
кампании первым делом.
```

### 10.4 Логика формирования

```typescript
interface InsightData {
  status: 'positive' | 'warning' | 'neutral';
  message: string;
  cause?: string;        // Причина (кампания, канал)
  recommendation?: string; // Что проверить
}

function generateInsight(report: Report): InsightData {
  // 1. Определяем общую динамику
  const trend = analyzeTrend(report);

  // 2. Находим проблемное место (если есть)
  const problemArea = findProblemArea(report);

  // 3. Формируем рекомендацию
  const recommendation = getRecommendation(trend, problemArea);

  return {
    status: trend.isPositive ? 'positive' : 'warning',
    message: trend.description,
    cause: problemArea?.name,
    recommendation
  };
}
```

### 10.5 Таблица рекомендаций

| Метрика | Изменение | Рекомендация |
|---------|-----------|--------------|
| CPA | >+20% | Проверьте ставки и ключи |
| CTR | <-20% | Обновите тексты объявлений |
| Конверсии | <-15% | Проверьте воронку и сайт |
| Отказы | >+5% | Проверьте скорость и релевантность |
| Трафик | <-10% | Проверьте рекламу и SEO |

> Подробная логика выводов описана в [Direct.md](Direct.md#312-автоматические-выводы-в-отчёте) и [Metrika.md](Metrika.md#312-автоматические-выводы-в-отчёте)

---

## 11. CRON ЗАДАЧИ

### 10.1 Cloudflare Cron Triggers

```toml
# wrangler.toml
[triggers]
crons = [
  "*/15 * * * *",  # Каждые 15 минут — проверка расписаний
  "0 * * * *",     # Каждый час — проверка алертов
]
```

### 10.2 Обработчик Cron

```typescript
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    switch (event.cron) {
      case '*/15 * * * *':
        await sendScheduledReports(env);
        break;
      case '0 * * * *':
        await checkAlerts(env);
        break;
    }
  },
};
```

---

## 12. МАСШТАБИРОВАНИЕ (до 100+ пользователей)

### 12.1 Батчинг отправки сообщений

Telegram API имеет лимит: **30 сообщений/сек** на бота.
При массовой отправке используем батчинг:

```typescript
const BATCH_SIZE = 25;           // Сообщений за раз
const BATCH_DELAY_MS = 1100;     // Пауза между батчами (> 1 сек)

async function sendScheduledReports(env: Env) {
  const now = new Date();
  const users = await storage.getScheduledReports(formatTime(now));

  // Разбиваем на батчи
  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);

    // Отправляем батч параллельно
    await Promise.allSettled(
      batch.map(user => sendReportToUser(user).catch(err => {
        console.error(`Failed to send report to ${user.id}:`, err);
        // Логируем ошибку, но не останавливаем остальных
      }))
    );

    // Пауза перед следующим батчем
    if (i + BATCH_SIZE < users.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### 12.2 Обработка ошибок и ретраи

```typescript
async function sendWithRetry(
  chatId: number,
  text: string,
  maxRetries = 3
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await sendMessage(chatId, text);

      if (result.ok) return true;

      // Обработка специфичных ошибок Telegram
      if (result.error_code === 403) {
        // Пользователь заблокировал бота
        await storage.markUserBlocked(chatId);
        return false;
      }

      if (result.error_code === 429) {
        // Too Many Requests — ждём
        const retryAfter = result.parameters?.retry_after || 30;
        await sleep(retryAfter * 1000);
        continue;
      }

    } catch (err) {
      if (attempt === maxRetries) throw err;
      await sleep(1000 * attempt); // Exponential backoff
    }
  }

  return false;
}
```

### 12.3 Индексы БД для производительности

```sql
-- Быстрый поиск по времени отправки
CREATE INDEX idx_settings_schedule
ON bot_settings(bot_type, (settings_json->>'schedule.time'));

-- Быстрый поиск активных пользователей
CREATE INDEX idx_users_active
ON users(status) WHERE status = 'active';

-- Быстрый поиск по токену сессии (для дашборда)
CREATE INDEX idx_sessions_token ON dashboard_sessions(token);
```

### 12.4 Лимиты Telegram API

| Метод | Лимит |
|-------|-------|
| sendMessage | 30/сек на бота |
| Inline-кнопки | 100 кнопок на сообщение |
| Текст сообщения | 4096 символов |
| createForumTopic | 5/мин на группу |

---

## 13. МИГРАЦИЯ НА TIMEWEB

### 13.1 Checklist миграции

- [ ] Экспортировать данные из D1 в SQL
- [ ] Создать PostgreSQL базу на Timeweb
- [ ] Импортировать данные
- [ ] Заменить `StorageAdapter` реализацию
- [ ] Настроить systemd/pm2 для Node.js
- [ ] Настроить cron задачи
- [ ] Обновить webhook URLs в Telegram
- [ ] Перенести ENV переменные

### 13.2 Структура проекта для Node.js

```
src/
├── adapters/
│   ├── storage/
│   │   ├── interface.ts      # StorageAdapter интерфейс
│   │   ├── d1.ts             # Cloudflare D1 реализация
│   │   └── postgres.ts       # PostgreSQL реализация
│   └── scheduler/
│       ├── interface.ts
│       ├── cron-triggers.ts  # Cloudflare
│       └── node-cron.ts      # Node.js
├── bots/
│   ├── metrika/
│   │   ├── handlers.ts
│   │   ├── states.ts
│   │   └── api.ts
│   ├── direct/
│   │   └── ...
│   └── support/
│       └── ...
├── shared/
│   ├── telegram.ts           # Telegram API helpers
│   ├── formatting.ts         # Форматирование сообщений
│   └── crypto.ts             # Шифрование
└── index.ts                  # Entry point
```
