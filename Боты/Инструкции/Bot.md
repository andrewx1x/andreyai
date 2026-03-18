# БОТ ПОДДЕРЖКИ — Единый Support Inbox

> **Зависимости:** [Shared.md](../Shared.md) — общая архитектура
> **Связь:** Принимает обращения из ботов Метрика и Директ

---

## 1. НАЗНАЧЕНИЕ БОТА

Единый бот поддержки для всех продуктов:
- Приём обращений из ботов Метрика и Директ
- Отдельный чат (топик) с каждым пользователем
- Отображение источника обращения (какой бот, какой экран)
- Ночные уведомления для админа

**Архитектура:**
- Для пользователя — обычный чат с ботом
- Для админа — супергруппа с Topics (темами)

---

## 2. АРХИТЕКТУРА

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         СИСТЕМА ПОДДЕРЖКИ                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ПОЛЬЗОВАТЕЛЬ                        АДМИН                                  │
│  ┌─────────────┐                     ┌──────────────────────────────────┐   │
│  │             │                     │  СУПЕРГРУППА (Topics)            │   │
│  │  Бот        │                     │                                  │   │
│  │  Метрика    │────┐                │  ┌────────────────────────────┐  │   │
│  │             │    │                │  │ Topic: @user1 | Метрика    │  │   │
│  └─────────────┘    │                │  │ Entry: help_token          │  │   │
│                     │                │  └────────────────────────────┘  │   │
│  ┌─────────────┐    │  ┌──────────┐  │                                  │   │
│  │             │    ├─▶│   БОТ    │─▶│  ┌────────────────────────────┐  │   │
│  │  Бот        │────┤  │ ПОДДЕРЖКИ│  │  │ Topic: @user2 | Директ     │  │   │
│  │  Директ     │    │  └──────────┘  │  │ Entry: bug_report          │  │   │
│  │             │    │       ▲        │  └────────────────────────────┘  │   │
│  └─────────────┘    │       │        │                                  │   │
│                     │       │        │  ┌────────────────────────────┐  │   │
│  ┌─────────────┐    │       │        │  │ Topic: @user3 | Метрика    │  │   │
│  │  Deep-link  │────┘       │        │  │ Entry: feature_request     │  │   │
│  │  /start=xxx │            │        │  └────────────────────────────┘  │   │
│  └─────────────┘            │        │                                  │   │
│                             │        └──────────────────────────────────┘   │
│                             │                     │                          │
│                             │                     ▼                          │
│                             │            ОТВЕТ АДМИНА                       │
│                             │            (в топике)                         │
│                             │                     │                          │
│                             └─────────────────────┘                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. ПОЛЬЗОВАТЕЛЬСКИЙ СЦЕНАРИЙ

### 3.1 Для пользователя

```
Пользователь в боте Метрика:
    │
    ▼
Нажимает [❓ Помощь]
    │
    ▼
Переходит в бот поддержки
(deep-link: t.me/SupportBot?start=metrika_help_token)
    │
    ▼
┌─────────────────────────────────────┐
│  Здравствуйте!                      │
│                                     │
│  Вы обратились из: Яндекс.Метрика   │
│  Раздел: Настройка токена           │
│                                     │
│  Опишите ваш вопрос одним           │
│  сообщением (можно прикрепить       │
│  скриншот).                         │
│                                     │
│  Мы ответим в рабочее время:        │
│  Пн–Пт, 10:00–19:00 (МСК)           │
└─────────────────────────────────────┘
    │
    ▼
Пользователь пишет сообщение
    │
    ▼
┌─────────────────────────────────────┐
│  Ваше сообщение получено! ✓         │
│                                     │
│  Мы ответим в ближайшее время.      │
└─────────────────────────────────────┘
    │
    ▼
(Админ отвечает в топике)
    │
    ▼
Пользователь получает ответ
в этом же чате
```

### 3.2 Для админа

```
В супергруппе создаётся топик:
┌─────────────────────────────────────────┐
│  📌 ТЕМА: @username | 123456 | Метрика  │
├─────────────────────────────────────────┤
│                                         │
│  🆕 НОВОЕ ОБРАЩЕНИЕ                     │
│  ─────────────────────                  │
│  👤 Пользователь: @username             │
│  🆔 ID: 123456789                       │
│  🔗 Профиль: tg://user?id=123456789     │
│                                         │
│  📦 Продукт: Яндекс.Метрика             │
│  📍 Раздел: Настройка токена            │
│  🏷 Entry: metrika_help_token           │
│                                         │
│  ⏰ Время: 31.01.2026 15:30 (МСК)       │
│  ─────────────────────                  │
│                                         │
│  💬 СООБЩЕНИЕ:                          │
│  Не могу получить токен, выдаёт        │
│  ошибку при авторизации.               │
│                                         │
│  📎 [Скриншот]                          │
│                                         │
└─────────────────────────────────────────┘
    │
    ▼
Админ пишет ответ в топике
    │
    ▼
Бот пересылает ответ пользователю
```

---

## 4. ЭКРАНЫ И СООБЩЕНИЯ

### 4.1 Приветствие при переходе по deep-link

```
═══ ПОДДЕРЖКА ═══

Здравствуйте!

Вы обратились из: {PRODUCT_NAME}
Раздел: {SECTION_NAME}

Опишите ваш вопрос одним сообщением.
Можно прикрепить скриншот или файл.

─────────────────────
⏰ Время работы поддержки:
   Пн–Пт, 10:00–19:00 (МСК)

   Обычно отвечаем в течение
   нескольких часов.
─────────────────────
```

**Переменные:**
| Параметр | Пример значения |
|----------|-----------------|
| {PRODUCT_NAME} | Яндекс.Метрика / Яндекс.Директ |
| {SECTION_NAME} | Настройка токена / Отчёты / Алерты |

### 4.2 Приветствие без контекста (/start без параметров)

```
═══ ПОДДЕРЖКА ═══

Здравствуйте!

Это бот поддержки.
Опишите ваш вопрос одним сообщением.

─────────────────────
💡 Совет: Для быстрого ответа
   используйте кнопку "Помощь"
   в боте Метрика или Директ —
   так мы сразу увидим контекст.
─────────────────────

⏰ Время работы поддержки:
   Пн–Пт, 10:00–19:00 (МСК)
```

### 4.3 Подтверждение получения

```
Ваше сообщение получено! ✓

Мы ответим в ближайшее время.
Следите за этим чатом.
```

### 4.4 Автоответ в нерабочее время

```
⏰ Сейчас нерабочее время.

Ваше сообщение получено!
Мы ответим в рабочие часы:
Пн–Пт, 10:00–19:00 (МСК)

─────────────────────
💡 Если вопрос СРОЧНЫЙ,
   напишите "срочно" —
   мы постараемся ответить
   как можно быстрее.
─────────────────────
```

### 4.5 Закрытие обращения

```
✅ Обращение закрыто.

Спасибо за обратную связь!
Если появятся новые вопросы —
пишите, мы всегда рады помочь.

[🔙 Вернуться в Метрику]
[🔙 Вернуться в Директ]
```

---

## 5. ФОРМАТ ENTRY-POINT

### 5.1 Структура deep-link

```
t.me/SupportBot?start={SOURCE}_{TYPE}_{SCREEN}
```

**Примеры:**
| Deep-link | Описание |
|-----------|----------|
| `metrika_help_start` | Метрика → Помощь → Стартовый экран |
| `metrika_help_token` | Метрика → Помощь → Настройка токена |
| `metrika_bug_report` | Метрика → Баг-репорт → Отчёты |
| `metrika_feature_alerts` | Метрика → Предложение → Алерты |
| `direct_help_auth` | Директ → Помощь → Авторизация |
| `direct_help_campaigns` | Директ → Помощь → Кампании |
| `direct_bug_dashboard` | Директ → Баг-репорт → Дашборд |

### 5.2 Парсинг entry-point

```typescript
interface EntryPoint {
  source: 'metrika' | 'direct' | 'unknown';
  type: 'help' | 'bug' | 'feature';
  screen: string;
}

function parseEntryPoint(startParam: string): EntryPoint {
  const parts = startParam.split('_');

  if (parts.length < 3) {
    return { source: 'unknown', type: 'help', screen: 'general' };
  }

  return {
    source: parts[0] as 'metrika' | 'direct',
    type: parts[1] as 'help' | 'bug' | 'feature',
    screen: parts.slice(2).join('_')
  };
}
```

### 5.3 Маппинг экранов на понятные названия

```typescript
const SCREEN_NAMES: Record<string, Record<string, string>> = {
  metrika: {
    start: 'Стартовый экран',
    token: 'Настройка токена',
    counter: 'Выбор счётчика',
    goals: 'Выбор целей',
    metrics: 'Выбор показателей',
    schedule: 'Расписание',
    alerts: 'Алерты',
    report: 'Отчёты',
    settings: 'Настройки',
  },
  direct: {
    start: 'Стартовый экран',
    auth: 'Авторизация',
    campaigns: 'Выбор кампаний',
    goals: 'Выбор целей',
    metrics: 'Выбор показателей',
    schedule: 'Расписание',
    alerts: 'Алерты',
    report: 'Отчёты',
    dashboard: 'Дашборд',
    settings: 'Настройки',
  }
};

const TYPE_NAMES: Record<string, string> = {
  help: 'Вопрос',
  bug: 'Баг-репорт',
  feature: 'Предложение',
};

const PRODUCT_NAMES: Record<string, string> = {
  metrika: 'Яндекс.Метрика',
  direct: 'Яндекс.Директ',
  unknown: 'Неизвестный продукт',
};
```

---

## 6. КАРТОЧКА ОБРАЩЕНИЯ (для админа)

### 6.1 Первое сообщение в топике

```
🆕 НОВОЕ ОБРАЩЕНИЕ
═══════════════════════════════

👤 Пользователь
   Имя: {first_name} {last_name}
   Username: @{username}
   ID: {telegram_id}
   Профиль: tg://user?id={telegram_id}

📦 Контекст
   Продукт: {product_name}
   Тип: {type_name}
   Раздел: {screen_name}
   Entry: {entry_point}

⏰ Время
   {datetime} (МСК)
   {is_work_hours ? '✅ Рабочее время' : '🌙 Нерабочее время'}

═══════════════════════════════

💬 СООБЩЕНИЕ:

{user_message}

{attachments}
```

### 6.2 Название топика

```
{emoji} @{username} | {user_id} | {product} | {type}
```

**Примеры:**
- `💬 @ivan_petrov | 123456 | Метрика | Вопрос`
- `🐞 @company_ltd | 789012 | Директ | Баг`
- `💡 @freelancer | 345678 | Метрика | Предложение`
- `🔴 @urgent_user | 901234 | Директ | СРОЧНО`

**Эмодзи по типу:**
| Тип | Эмодзи |
|-----|--------|
| help | 💬 |
| bug | 🐞 |
| feature | 💡 |
| urgent | 🔴 |

---

## 7. ОБРАБОТКА СООБЩЕНИЙ

### 7.1 Сообщение от пользователя

```typescript
async function handleUserMessage(update: TelegramUpdate, env: Env) {
  const message = update.message;
  const userId = message.from.id;
  const chatId = message.chat.id;

  // 1. Получить или создать тикет
  let ticket = await storage.getTicket(userId);

  if (!ticket) {
    // Получить entry-point из сессии
    const entryPoint = await storage.getActiveEntryPoint(userId);

    // Создать топик в группе
    const topicId = await createForumTopic(env, {
      userId,
      username: message.from.username,
      entryPoint,
    });

    // Сохранить тикет
    ticket = await storage.createTicket({
      user_id: userId,
      topic_id: topicId,
      entry_point: entryPoint,
    });

    // Отправить карточку обращения
    await sendTicketCard(env, topicId, message, entryPoint);
  }

  // 2. Переслать сообщение в топик
  await forwardToTopic(env, ticket.topic_id, message);

  // 3. Проверить рабочее время
  const isWorkHours = checkWorkHours(env);

  // 4. Отправить подтверждение
  if (!isWorkHours && await canSendAutoReply(userId)) {
    await sendMessage(chatId, MESSAGES.OUT_OF_HOURS);
    await storage.updateAutoReplyTime(userId);
  } else if (!ticket.ack_sent) {
    await sendMessage(chatId, MESSAGES.RECEIVED);
    await storage.markAckSent(ticket.id);
  }

  // 5. Проверить на "срочно"
  if (containsUrgent(message.text)) {
    await markAsUrgent(env, ticket);
    await notifyAdmin(env, ticket, 'URGENT');
  }

  // 6. Ночное уведомление админу
  if (!isWorkHours) {
    await notifyAdminNightMessage(env, ticket);
  }
}
```

### 7.2 Сообщение от админа (в топике)

```typescript
async function handleAdminMessage(update: TelegramUpdate, env: Env) {
  const message = update.message;
  const topicId = message.message_thread_id;

  // Игнорировать сообщения не в топиках
  if (!topicId) return;

  // Найти тикет по топику
  const ticket = await storage.getTicketByTopic(topicId);
  if (!ticket) return;

  // Проверить команду /close
  if (message.text?.startsWith('/close')) {
    await closeTicket(env, ticket);
    return;
  }

  // Переслать ответ пользователю
  await forwardToUser(env, ticket.user_id, message);

  // Обновить время последнего ответа
  await storage.updateLastAdminReply(ticket.id);
}
```

### 7.3 Проверка рабочего времени

```typescript
function checkWorkHours(env: Env): boolean {
  const now = new Date();

  // Получить время в МСК (UTC+3)
  const mskHour = (now.getUTCHours() + 3) % 24;
  const dayOfWeek = now.getUTCDay(); // 0 = воскресенье

  // Рабочие дни: Пн-Пт (1-5)
  // Рабочие часы: 10:00 - 19:00
  const isWorkDay = dayOfWeek >= 1 && dayOfWeek <= 5;
  const isWorkHour = mskHour >= 10 && mskHour < 19;

  return isWorkDay && isWorkHour;
}
```

### 7.4 Cooldown автоответа

```typescript
const AUTO_REPLY_COOLDOWN_MS = 3 * 60 * 60 * 1000; // 3 часа

async function canSendAutoReply(userId: number): Promise<boolean> {
  const lastReply = await storage.getLastAutoReplyTime(userId);

  if (!lastReply) return true;

  const elapsed = Date.now() - new Date(lastReply).getTime();
  return elapsed > AUTO_REPLY_COOLDOWN_MS;
}
```

---

## 8. НОЧНЫЕ УВЕДОМЛЕНИЯ

### 8.1 Уведомление админу о ночном сообщении

```typescript
async function notifyAdminNightMessage(env: Env, ticket: Ticket) {
  const notification = `
🌙 НОЧНОЕ СООБЩЕНИЕ

Пользователь написал в нерабочее время.

👤 @${ticket.username} (ID: ${ticket.user_id})
📦 ${PRODUCT_NAMES[ticket.entry_point?.source]}
📍 ${ticket.entry_point?.screen}

[Перейти к обращению](${getTopicLink(ticket.topic_id)})
  `;

  // Отправить в личку админу
  for (const adminId of env.ADMIN_IDS) {
    await sendMessage(adminId, notification);
  }
}
```

### 8.2 Срочное уведомление

```typescript
async function notifyAdmin(env: Env, ticket: Ticket, type: 'URGENT') {
  const notification = `
🔴 СРОЧНОЕ ОБРАЩЕНИЕ

Пользователь отметил сообщение как срочное!

👤 @${ticket.username} (ID: ${ticket.user_id})
📦 ${PRODUCT_NAMES[ticket.entry_point?.source]}

[Перейти к обращению](${getTopicLink(ticket.topic_id)})
  `;

  // Отправить в личку админу и упомянуть в группе
  for (const adminId of env.ADMIN_IDS) {
    await sendMessage(adminId, notification);
  }

  // Обновить название топика
  await editForumTopic(env, ticket.topic_id, {
    name: `🔴 @${ticket.username} | ${ticket.user_id} | СРОЧНО`,
  });
}
```

---

## 9. СТРУКТУРА ДАННЫХ

### 9.1 Таблица tickets

```sql
CREATE TABLE tickets (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  username TEXT,
  first_name TEXT,
  topic_id INTEGER NOT NULL,
  entry_point TEXT,                       -- JSON: {source, type, screen}
  status TEXT DEFAULT 'open',             -- open | waiting | closed
  ack_sent BOOLEAN DEFAULT FALSE,
  is_urgent BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_user_msg_at DATETIME,
  last_admin_msg_at DATETIME,

  UNIQUE(user_id)
);

CREATE INDEX idx_tickets_topic ON tickets(topic_id);
CREATE INDEX idx_tickets_status ON tickets(status);
```

### 9.2 Таблица entry_sessions

```sql
CREATE TABLE entry_sessions (
  user_id INTEGER PRIMARY KEY,
  entry_point TEXT NOT NULL,              -- JSON
  set_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ttl_seconds INTEGER DEFAULT 1800        -- 30 минут
);
```

### 9.3 Таблица auto_reply_state

```sql
CREATE TABLE auto_reply_state (
  user_id INTEGER PRIMARY KEY,
  last_reply_at DATETIME
);
```

---

## 10. TELEGRAM API

### 10.1 Создание топика

```typescript
async function createForumTopic(
  env: Env,
  data: { userId: number; username?: string; entryPoint?: EntryPoint }
): Promise<number> {
  const emoji = getEmojiForType(data.entryPoint?.type);
  const product = data.entryPoint?.source || 'unknown';
  const type = TYPE_NAMES[data.entryPoint?.type] || 'Вопрос';

  const name = `${emoji} @${data.username || 'id:' + data.userId} | ${data.userId} | ${product} | ${type}`;

  const response = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN_SUPPORT}/createForumTopic`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.SUPPORT_GROUP_ID,
        name: name.slice(0, 128), // Лимит Telegram
      }),
    }
  );

  const result = await response.json();
  return result.result.message_thread_id;
}
```

### 10.2 Отправка в топик

```typescript
async function sendToTopic(
  env: Env,
  topicId: number,
  text: string,
  options?: { parseMode?: string }
): Promise<void> {
  await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN_SUPPORT}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.SUPPORT_GROUP_ID,
        message_thread_id: topicId,
        text,
        parse_mode: options?.parseMode || 'HTML',
      }),
    }
  );
}
```

### 10.3 Пересылка медиа

```typescript
async function forwardToTopic(
  env: Env,
  topicId: number,
  message: TelegramMessage
): Promise<void> {
  // Используем copyMessage для сохранения форматирования
  await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN_SUPPORT}/copyMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.SUPPORT_GROUP_ID,
        from_chat_id: message.chat.id,
        message_id: message.message_id,
        message_thread_id: topicId,
      }),
    }
  );
}

async function forwardToUser(
  env: Env,
  userId: number,
  message: TelegramMessage
): Promise<void> {
  await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN_SUPPORT}/copyMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: userId,
        from_chat_id: message.chat.id,
        message_id: message.message_id,
      }),
    }
  );
}
```

---

## 11. КОМАНДЫ АДМИНА

### 11.1 Команда /close

Закрыть обращение:

```typescript
async function closeTicket(env: Env, ticket: Ticket): Promise<void> {
  // 1. Отправить пользователю сообщение о закрытии
  await sendMessage(ticket.user_id, MESSAGES.CLOSED, {
    keyboard: createReturnKeyboard(ticket.entry_point?.source),
  });

  // 2. Обновить статус тикета
  await storage.updateTicketStatus(ticket.id, 'closed');

  // 3. Обновить название топика
  const newName = ticket.topic_name.replace(/^./, '✅');
  await editForumTopic(env, ticket.topic_id, { name: newName });

  // 4. Отправить подтверждение в топик
  await sendToTopic(env, ticket.topic_id, '✅ Обращение закрыто.');
}
```

### 11.2 Клавиатура возврата

```typescript
function createReturnKeyboard(source?: string): InlineKeyboard {
  const buttons = [];

  if (source === 'metrika' || !source) {
    buttons.push([{
      text: '🔙 Вернуться в Метрику',
      url: 'https://t.me/MetrikaBot',
    }]);
  }

  if (source === 'direct' || !source) {
    buttons.push([{
      text: '🔙 Вернуться в Директ',
      url: 'https://t.me/DirectBot',
    }]);
  }

  return { inline_keyboard: buttons };
}
```

---

## 12. НАСТРОЙКА ГРУППЫ

### 12.1 Требования к группе

1. **Тип:** Супергруппа (supergroup)
2. **Topics:** Включены (Forum mode)
3. **Боты:** Добавить бота поддержки как админа
4. **Права бота:**
   - Manage Topics (создание топиков)
   - Post Messages (отправка сообщений)
   - Read Messages (чтение, privacy mode OFF)

### 12.2 Настройка бота

```bash
# В BotFather
/setprivacy
# Выбрать бота
# Disable — чтобы бот видел все сообщения в группе
```

### 12.3 Получение SUPPORT_GROUP_ID

```bash
# Добавить бота в группу
# Отправить любое сообщение
# Вызвать getUpdates или посмотреть в webhook
# ID будет отрицательным: -100xxxxxxxxxx
```

---

## 13. ENV ПЕРЕМЕННЫЕ

```bash
# Telegram
TELEGRAM_BOT_TOKEN_SUPPORT=xxx
SUPPORT_GROUP_ID=-100xxxxxxxxxx

# Админы (через запятую)
ADMIN_IDS=123456789,987654321

# Рабочее время (МСК)
WORK_HOURS_START=10
WORK_HOURS_END=19
WORK_DAYS=1,2,3,4,5            # Пн-Пт

# Cooldown
AUTO_REPLY_COOLDOWN_HOURS=3

# Ссылки на боты (для кнопок возврата)
METRIKA_BOT_URL=https://t.me/MetrikaBot
DIRECT_BOT_URL=https://t.me/DirectBot
```

---

## 14. МИГРАЦИЯ НА TIMEWEB

Бот поддержки использует те же абстракции из [Shared.md](../Shared.md):
- `StorageAdapter` для работы с БД
- Webhook endpoints остаются те же
- ENV переменные переносятся 1:1

```typescript
// Структура проекта
src/
├── bots/
│   └── support/
│       ├── handlers.ts       // Обработчики сообщений
│       ├── tickets.ts        // Работа с тикетами
│       ├── topics.ts         // Работа с топиками
│       ├── notifications.ts  // Уведомления
│       └── messages.ts       // Тексты сообщений
├── adapters/
│   └── storage/
│       ├── interface.ts
│       ├── d1.ts
│       └── postgres.ts
└── index.ts
```
