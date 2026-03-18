-- Extended support tables for Support bot

-- ═══════════════════════════════════════════
-- UPDATE SUPPORT TICKETS (add missing columns)
-- ═══════════════════════════════════════════

-- Note: SQLite doesn't support ADD COLUMN IF NOT EXISTS
-- These will fail silently if columns already exist
ALTER TABLE support_tickets ADD COLUMN username TEXT;
ALTER TABLE support_tickets ADD COLUMN first_name TEXT;
ALTER TABLE support_tickets ADD COLUMN ack_sent INTEGER DEFAULT 0;
ALTER TABLE support_tickets ADD COLUMN is_urgent INTEGER DEFAULT 0;
ALTER TABLE support_tickets ADD COLUMN last_user_msg_at TEXT;
ALTER TABLE support_tickets ADD COLUMN last_admin_msg_at TEXT;

-- Change user_id to INTEGER for Telegram user ID
-- (Note: if it conflicts, you may need to recreate the table)

-- ═══════════════════════════════════════════
-- ENTRY SESSIONS (temporary deep-link context)
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS entry_sessions (
  user_id INTEGER PRIMARY KEY,
  entry_point TEXT NOT NULL,  -- JSON: {source, type, screen}
  set_at TEXT DEFAULT (datetime('now')),
  ttl_seconds INTEGER DEFAULT 1800  -- 30 minutes
);

-- ═══════════════════════════════════════════
-- AUTO-REPLY STATE (cooldown tracking)
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS auto_reply_state (
  user_id INTEGER PRIMARY KEY,
  last_reply_at TEXT
);
