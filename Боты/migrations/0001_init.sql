-- Initial database schema for Telegram Bots Analytics
-- Cloudflare D1 (SQLite)

-- ═══════════════════════════════════════════
-- USERS
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  telegram_id INTEGER UNIQUE NOT NULL,
  telegram_username TEXT,
  first_name TEXT,
  last_name TEXT,
  language_code TEXT DEFAULT 'ru',
  timezone_offset INTEGER DEFAULT 180,  -- minutes from UTC (180 = +3 Moscow)
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  status TEXT DEFAULT 'active'  -- active | blocked
);

CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- ═══════════════════════════════════════════
-- CHATS (sessions per bot)
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  bot_type TEXT NOT NULL,  -- 'metrika' | 'direct' | 'support' | 'landing'
  telegram_chat_id INTEGER NOT NULL,
  state TEXT DEFAULT 'idle',  -- Current state (wizard step)
  state_data TEXT,  -- JSON with state data
  admin_topic_id INTEGER,  -- Forum topic ID for admin notifications
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  last_activity_at TEXT,

  UNIQUE(user_id, bot_type)
);

CREATE INDEX IF NOT EXISTS idx_chats_user_bot ON chats(user_id, bot_type);
CREATE INDEX IF NOT EXISTS idx_chats_topic ON chats(bot_type, admin_topic_id);

-- ═══════════════════════════════════════════
-- TOKENS (encrypted OAuth tokens)
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  bot_type TEXT NOT NULL,  -- 'metrika' | 'direct'
  encrypted_token TEXT NOT NULL,  -- AES-256-GCM encrypted token
  token_type TEXT DEFAULT 'oauth',  -- 'oauth' | 'api'
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  UNIQUE(user_id, bot_type)
);

CREATE INDEX IF NOT EXISTS idx_tokens_user_bot ON tokens(user_id, bot_type);

-- ═══════════════════════════════════════════
-- BOT SETTINGS
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS bot_settings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  bot_type TEXT NOT NULL,
  settings_json TEXT NOT NULL,  -- JSON with bot-specific settings
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  UNIQUE(user_id, bot_type)
);

CREATE INDEX IF NOT EXISTS idx_settings_user_bot ON bot_settings(user_id, bot_type);

-- ═══════════════════════════════════════════
-- SUBSCRIPTIONS (placeholder - always active)
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  plan_id TEXT DEFAULT 'free',  -- 'free' | 'basic' | 'pro'
  status TEXT DEFAULT 'active',  -- active | expired | cancelled
  paid_until TEXT,
  created_at TEXT DEFAULT (datetime('now')),

  UNIQUE(user_id)
);

-- ═══════════════════════════════════════════
-- SUPPORT TICKETS
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  topic_id INTEGER NOT NULL,  -- Forum topic ID
  entry_point TEXT,  -- JSON: source bot, screen, button
  status TEXT DEFAULT 'open',  -- open | closed
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  closed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_topic ON support_tickets(topic_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);

-- ═══════════════════════════════════════════
-- DASHBOARD SESSIONS
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS dashboard_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON dashboard_sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON dashboard_sessions(expires_at);

-- ═══════════════════════════════════════════
-- REPORT HISTORY (for caching)
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS report_cache (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  bot_type TEXT NOT NULL,
  report_date TEXT NOT NULL,  -- YYYY-MM-DD
  report_data TEXT NOT NULL,  -- JSON with report data
  created_at TEXT DEFAULT (datetime('now')),

  UNIQUE(user_id, bot_type, report_date)
);

CREATE INDEX IF NOT EXISTS idx_cache_user_bot_date ON report_cache(user_id, bot_type, report_date);
