-- Alert cooldowns to prevent spam (max 1 alert per type per 24h)

CREATE TABLE IF NOT EXISTS alert_cooldowns (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  bot_type TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  sent_at TEXT NOT NULL,

  UNIQUE(user_id, bot_type, alert_type)
);

CREATE INDEX IF NOT EXISTS idx_cooldowns_user_bot_alert ON alert_cooldowns(user_id, bot_type, alert_type);
