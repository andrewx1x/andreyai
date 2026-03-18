# ПЛАН РАЗРАБОТКИ

> Порядок разработки системы ботов: Метрика, Директ, Поддержка, Дашборд

---

## ИТОГОВЫЙ ПРОДУКТ

После завершения разработки будет готовый продукт для продажи:

| Компонент | Статус |
|-----------|--------|
| Бот Метрика | Полностью функционален |
| Бот Директ | Полностью функционален |
| Бот Поддержки | Полностью функционален |
| Дашборд | Полностью функционален |
| Оплата | Заглушка (добавить позже) |
| Миграция на Timeweb | Подготовлено (выполнить позже) |

---

## ФАЗА 1: ИНФРАСТРУКТУРА

**Цель:** Настроить базу, окружение, деплой

### Задачи

- [ ] **1.1** Создать Cloudflare аккаунт (если нет)
- [ ] **1.2** Создать D1 базу данных
- [ ] **1.3** Выполнить миграции (таблицы из Shared.md)
- [ ] **1.4** Настроить Cloudflare KV для кэша
- [ ] **1.5** Создать 3 бота в BotFather:
  - `@YourMetrikaBot`
  - `@YourDirectBot`
  - `@YourSupportBot`
- [ ] **1.6** Создать 3 супергруппы с Topics:
  - "Метрика — Пользователи"
  - "Директ — Пользователи"
  - "Support Inbox"
- [ ] **1.7** Добавить ботов в группы, дать права админа
- [ ] **1.8** Отключить Privacy Mode у всех ботов
- [ ] **1.9** Создать Yandex OAuth приложение (client_id)
- [ ] **1.10** Настроить ENV переменные в Cloudflare

### SQL миграции

```sql
-- Выполнить в D1 Console

-- Пользователи
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  telegram_id INTEGER UNIQUE NOT NULL,
  telegram_username TEXT,
  first_name TEXT,
  last_name TEXT,
  language_code TEXT DEFAULT 'ru',
  timezone_offset INTEGER DEFAULT 180,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'active'
);

-- Чаты/сессии
CREATE TABLE chats (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  bot_type TEXT NOT NULL,
  telegram_chat_id INTEGER NOT NULL,
  state TEXT DEFAULT 'idle',
  state_data TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_activity_at DATETIME,
  UNIQUE(user_id, bot_type)
);

-- Токены
CREATE TABLE tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  bot_type TEXT NOT NULL,
  encrypted_token TEXT NOT NULL,
  token_type TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, bot_type)
);

-- Настройки
CREATE TABLE bot_settings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  bot_type TEXT NOT NULL,
  settings_json TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, bot_type)
);

-- Админские топики
CREATE TABLE admin_topics (
  id TEXT PRIMARY KEY,
  bot_type TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  topic_id INTEGER NOT NULL,
  topic_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(bot_type, user_id)
);

-- Тикеты поддержки
CREATE TABLE tickets (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  username TEXT,
  first_name TEXT,
  topic_id INTEGER NOT NULL,
  entry_point TEXT,
  status TEXT DEFAULT 'open',
  ack_sent BOOLEAN DEFAULT FALSE,
  is_urgent BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_user_msg_at DATETIME,
  last_admin_msg_at DATETIME,
  UNIQUE(user_id)
);

-- Entry sessions
CREATE TABLE entry_sessions (
  user_id INTEGER PRIMARY KEY,
  entry_point TEXT NOT NULL,
  set_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ttl_seconds INTEGER DEFAULT 1800
);

-- Auto reply state
CREATE TABLE auto_reply_state (
  user_id INTEGER PRIMARY KEY,
  last_reply_at DATETIME
);

-- Подписки (заглушка)
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  plan_id TEXT DEFAULT 'free',
  status TEXT DEFAULT 'active',
  paid_until DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Сессии дашборда
CREATE TABLE dashboard_sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

-- Индексы
CREATE INDEX idx_users_telegram ON users(telegram_id);
CREATE INDEX idx_chats_user_bot ON chats(user_id, bot_type);
CREATE INDEX idx_tokens_user_bot ON tokens(user_id, bot_type);
CREATE INDEX idx_settings_user_bot ON bot_settings(user_id, bot_type);
CREATE INDEX idx_admin_topics_lookup ON admin_topics(bot_type, user_id);
CREATE INDEX idx_tickets_topic ON tickets(topic_id);
CREATE INDEX idx_sessions_token ON dashboard_sessions(token);
```

---

## ФАЗА 2: БОТ МЕТРИКА

**Цель:** Полностью работающий бот отчётов Метрики

### Задачи

- [ ] **2.1** Структура проекта (Worker)
- [ ] **2.2** Storage adapter (D1)
- [ ] **2.3** Telegram API helpers
- [ ] **2.4** Шифрование токенов
- [ ] **2.5** Обработчик /start
- [ ] **2.6** State machine (переходы между шагами)
- [ ] **2.7** Шаг 1: Получение токена + валидация
- [ ] **2.8** Шаг 2: Выбор счётчика (API Метрики)
- [ ] **2.9** Шаг 3: Выбор целей (API Метрики)
- [ ] **2.10** Шаг 4: Выбор показателей
- [ ] **2.11** Шаг 5: Расписание
- [ ] **2.12** Шаг 6: Алерты
- [ ] **2.13** Шаг 7: Подтверждение
- [ ] **2.14** Главное меню
- [ ] **2.15** Кнопка "Отчёт сейчас"
- [ ] **2.16** Меню настроек (изменение любого шага)
- [ ] **2.17** Cron: отправка отчётов по расписанию
- [ ] **2.18** Cron: проверка алертов
- [ ] **2.19** Форматирование отчётов
- [ ] **2.20** Админские топики (создание при регистрации)
- [ ] **2.21** Обновление топиков при действиях
- [ ] **2.22** Связь с ботом поддержки (deep-links)
- [ ] **2.23** Тестирование полного flow
- [ ] **2.24** Деплой webhook

### Тест-кейсы

```
1. /start → Приветствие → Начать настройку
2. Ввод невалидного токена → Ошибка → Повторный ввод
3. Ввод валидного токена → Список счётчиков
4. Выбор счётчика → Список целей
5. Выбор целей → Выбор показателей
6. Выбор показателей → Расписание
7. Расписание → Алерты → Подтверждение
8. Подтверждение → Главное меню
9. "Отчёт сейчас" → Получение отчёта
10. Настройки → Изменить цели → Сохранить
11. Кнопка "Помощь" → Переход в бот поддержки
12. Автоматический отчёт по расписанию
```

---

## ФАЗА 3: БОТ ДИРЕКТ

**Цель:** Полностью работающий бот отчётов Директа

### Задачи

- [ ] **3.1** Копировать структуру из Метрики
- [ ] **3.2** Адаптировать шаг авторизации (токен + логин)
- [ ] **3.3** Шаг 2: Выбор кампаний (API Директа)
- [ ] **3.4** Шаг 3: Выбор целей (API Метрики)
- [ ] **3.5** Шаг 4: Показатели Директа
- [ ] **3.6** Шаг 5: Расписание + период сравнения
- [ ] **3.7** Шаг 6: Алерты
- [ ] **3.8** Шаг 7: Подтверждение
- [ ] **3.9** Главное меню + кнопка "Дашборд"
- [ ] **3.10** Cron: отправка отчётов
- [ ] **3.11** Cron: проверка алертов
- [ ] **3.12** Форматирование отчётов Директа
- [ ] **3.13** Админские топики
- [ ] **3.14** Тестирование
- [ ] **3.15** Деплой webhook

---

## ФАЗА 4: БОТ ПОДДЕРЖКИ

**Цель:** Единый support inbox для всех ботов

### Задачи

- [ ] **4.1** Обработчик /start с deep-link
- [ ] **4.2** Парсинг entry-point
- [ ] **4.3** Создание топика в группе
- [ ] **4.4** Карточка обращения
- [ ] **4.5** Пересылка сообщений user → topic
- [ ] **4.6** Пересылка ответов topic → user
- [ ] **4.7** Автоответ в нерабочее время
- [ ] **4.8** Cooldown автоответа (3 часа)
- [ ] **4.9** Ночные уведомления админу
- [ ] **4.10** Команда /close
- [ ] **4.11** Обработка "срочно"
- [ ] **4.12** Пересылка медиа
- [ ] **4.13** Тестирование
- [ ] **4.14** Деплой webhook

---

## ФАЗА 5: ДАШБОРД

**Цель:** Интерактивный дашборд статистики Директа

### Задачи

- [ ] **5.1** Создать React/Vue проект
- [ ] **5.2** Интеграция Telegram WebApp SDK
- [ ] **5.3** API endpoint для данных
- [ ] **5.4** Аутентификация по session token
- [ ] **5.5** Экран 1: Статистика по кампаниям
  - [ ] Табы (Поиск / РСЯ / Карты)
  - [ ] KPI-карточки
  - [ ] Таблица детализации
- [ ] **5.6** Экран 2: Сводная статистика
  - [ ] Таблица сравнения
  - [ ] Блок экспертного анализа
  - [ ] Графики по месяцам
- [ ] **5.7** Стилизация (как на скрине)
- [ ] **5.8** Адаптив для мобильных
- [ ] **5.9** Деплой на Cloudflare Pages
- [ ] **5.10** Интеграция кнопки в бота Директ
- [ ] **5.11** Тестирование в Telegram

---

## ФАЗА 5.5: БОТ ЛЕНДИНГ (ДЕМО)

**Цель:** Демо-бот для лендинга — показывает функционал без API

### Особенности
- Без реальных запросов к API
- Статические данные
- Кнопка возврата на лендинг https://andreyai.ru/

### Задачи

- [ ] **5.5.1** Создать Worker для демо-бота
- [ ] **5.5.2** Обработчик /start с приветствием
- [ ] **5.5.3** Отправка видео с инструкцией
- [ ] **5.5.4** Выбор продукта (Метрика / Директ)
- [ ] **5.5.5** Статический демо-отчёт Метрики (с выводом)
- [ ] **5.5.6** Статический демо-отчёт Директа (с выводом)
- [ ] **5.5.7** Пример алерта с рекомендацией
- [ ] **5.5.8** Демо-дашборд (статическая страница)
- [ ] **5.5.9** Кнопки управления (изменить показатели/время/показать отчёт)
- [ ] **5.5.10** Кнопка "Вернуться на лендинг" на всех экранах
- [ ] **5.5.11** Финальный экран с CTA
- [ ] **5.5.12** Деплой webhook

### Тест-кейсы

```
1. /start → Приветствие → Смотреть видео
2. После видео → Выбор продукта (Метрика/Директ)
3. Метрика → Демо-отчёт с выводом → Кнопки управления
4. Директ → Демо-отчёт с выводом → Кнопки + Дашборд
5. Пример алерта → Рекомендация
6. Кнопка "Вернуться на лендинг" → Открывает https://andreyai.ru/
7. Финальный экран → CTA для покупки
```

---

## ФАЗА 6: ФИНАЛИЗАЦИЯ

**Цель:** Полировка перед запуском

### Задачи

- [ ] **6.1** Тестирование всего flow (Метрика)
- [ ] **6.2** Тестирование всего flow (Директ)
- [ ] **6.3** Тестирование поддержки
- [ ] **6.4** Тестирование дашборда
- [ ] **6.5** Проверка связей между ботами
- [ ] **6.6** Проверка админских топиков
- [ ] **6.7** Проверка Cron задач
- [ ] **6.8** Нагрузочный тест (10 пользователей)
- [ ] **6.9** Исправление багов
- [ ] **6.10** Документация для себя

---

## ПОСЛЕ ЗАПУСКА

### Добавить оплату (когда нужно)

- [ ] Интеграция с платёжной системой
- [ ] Webhook для приёма платежей
- [ ] Управление подписками
- [ ] Уведомления об окончании
- [ ] Убрать заглушку `return true`

### Миграция на Timeweb (когда лимиты CF)

- [ ] Экспорт D1 → PostgreSQL
- [ ] Развернуть Node.js на VPS
- [ ] Заменить StorageAdapter
- [ ] Настроить cron
- [ ] Перенести дашборд
- [ ] Обновить webhooks

---

## ПОРЯДОК ФАЙЛОВ ДЛЯ РАЗРАБОТКИ

```
1. src/shared/
   ├── config.ts          — ENV переменные
   ├── db.ts              — StorageAdapter
   ├── telegram.ts        — Telegram API
   ├── crypto.ts          — Шифрование
   └── formatting.ts      — Форматирование

2. src/bots/metrika/
   ├── index.ts           — Entry point
   ├── handlers.ts        — Обработчики
   ├── states.ts          — State machine
   ├── api.ts             — Яндекс.Метрика API
   ├── reports.ts         — Формирование отчётов
   └── cron.ts            — Cron задачи

3. src/bots/direct/
   └── (аналогично metrika)

4. src/bots/support/
   ├── index.ts
   ├── handlers.ts
   ├── tickets.ts
   ├── topics.ts
   └── notifications.ts

5. src/bots/landing/
   ├── index.ts           — Entry point
   ├── handlers.ts        — Обработчики callback
   └── screens.ts         — Статические экраны и данные
   └── notifications.ts

5. dashboard/
   ├── src/
   │   ├── App.tsx
   │   ├── pages/
   │   └── components/
   └── package.json
```

---

## ОЦЕНКА ВРЕМЕНИ

| Фаза | Компоненты | Примерно |
|------|------------|----------|
| 1 | Инфраструктура | 1 день |
| 2 | Бот Метрика | 3-5 дней |
| 3 | Бот Директ | 2-3 дня |
| 4 | Бот Поддержки | 1-2 дня |
| 5 | Дашборд | 2-3 дня |
| **5.5** | **Бот Лендинг (демо)** | **0.5-1 день** |
| 6 | Финализация | 1-2 дня |

**Итого: ~11-17 дней** до готового продукта

---

## ЧЕКЛИСТ ПЕРЕД ПРОДАЖАМИ

- [ ] Все боты работают
- [ ] Отчёты приходят по расписанию
- [ ] Алерты срабатывают
- [ ] Дашборд открывается
- [ ] Поддержка работает
- [ ] Топики создаются для всех пользователей
- [ ] Нет критических багов
- [ ] Есть 5-10 тестовых пользователей
