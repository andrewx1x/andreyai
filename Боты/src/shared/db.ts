// StorageAdapter for Cloudflare D1

import type {
  User,
  UserCreate,
  UserUpdate,
  Chat,
  ChatCreate,
  BotType,
  BotSettings,
  ScheduledReport,
  ActiveAlert,
  MetrikaSettings,
  DirectSettings,
} from '../env';

function generateId(): string {
  return crypto.randomUUID();
}

export class StorageAdapter {
  constructor(private db: D1Database) {}

  // ═══════════════════════════════════════════
  // USERS
  // ═══════════════════════════════════════════

  async getUser(telegramId: number): Promise<User | null> {
    const result = await this.db
      .prepare('SELECT * FROM users WHERE telegram_id = ?')
      .bind(telegramId)
      .first<User>();
    return result || null;
  }

  async getUserById(id: string): Promise<User | null> {
    const result = await this.db
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(id)
      .first<User>();
    return result || null;
  }

  async createUser(data: UserCreate): Promise<User> {
    const id = generateId();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO users (id, telegram_id, telegram_username, first_name, last_name, language_code, timezone_offset, created_at, updated_at, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`
      )
      .bind(
        id,
        data.telegram_id,
        data.telegram_username || null,
        data.first_name || null,
        data.last_name || null,
        data.language_code || 'ru',
        data.timezone_offset || 180,
        now,
        now
      )
      .run();

    return (await this.getUserById(id))!;
  }

  async updateUser(telegramId: number, data: UserUpdate): Promise<void> {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.telegram_username !== undefined) {
      updates.push('telegram_username = ?');
      values.push(data.telegram_username);
    }
    if (data.first_name !== undefined) {
      updates.push('first_name = ?');
      values.push(data.first_name);
    }
    if (data.last_name !== undefined) {
      updates.push('last_name = ?');
      values.push(data.last_name);
    }
    if (data.language_code !== undefined) {
      updates.push('language_code = ?');
      values.push(data.language_code);
    }
    if (data.timezone_offset !== undefined) {
      updates.push('timezone_offset = ?');
      values.push(data.timezone_offset);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }

    if (updates.length === 0) return;

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(telegramId);

    await this.db
      .prepare(`UPDATE users SET ${updates.join(', ')} WHERE telegram_id = ?`)
      .bind(...values)
      .run();
  }

  async getOrCreateUser(data: UserCreate): Promise<User> {
    let user = await this.getUser(data.telegram_id);
    if (!user) {
      user = await this.createUser(data);
    }
    return user;
  }

  // ═══════════════════════════════════════════
  // CHATS
  // ═══════════════════════════════════════════

  async getChat(botType: BotType, telegramId: number): Promise<Chat | null> {
    const result = await this.db
      .prepare(
        `SELECT c.* FROM chats c
         JOIN users u ON c.user_id = u.id
         WHERE c.bot_type = ? AND u.telegram_id = ?`
      )
      .bind(botType, telegramId)
      .first<Chat>();
    return result || null;
  }

  async getChatById(id: string): Promise<Chat | null> {
    const result = await this.db
      .prepare('SELECT * FROM chats WHERE id = ?')
      .bind(id)
      .first<Chat>();
    return result || null;
  }

  async getChatByTopicId(
    botType: BotType,
    groupId: string,
    topicId: number
  ): Promise<Chat | null> {
    const result = await this.db
      .prepare(
        `SELECT * FROM chats
         WHERE bot_type = ? AND admin_topic_id = ?`
      )
      .bind(botType, topicId)
      .first<Chat>();
    return result || null;
  }

  async createChat(data: ChatCreate): Promise<Chat> {
    const id = generateId();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO chats (id, user_id, bot_type, telegram_chat_id, state, state_data, created_at, updated_at, last_activity_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        data.user_id,
        data.bot_type,
        data.telegram_chat_id,
        data.state || 'idle',
        data.state_data ? JSON.stringify(data.state_data) : null,
        now,
        now,
        now
      )
      .run();

    return (await this.getChatById(id))!;
  }

  async updateChatState(
    chatId: string,
    state: string,
    data?: object
  ): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `UPDATE chats
         SET state = ?, state_data = ?, updated_at = ?, last_activity_at = ?
         WHERE id = ?`
      )
      .bind(state, data ? JSON.stringify(data) : null, now, now, chatId)
      .run();
  }

  async updateChatTopicId(chatId: string, topicId: number): Promise<void> {
    await this.db
      .prepare(
        `UPDATE chats SET admin_topic_id = ?, updated_at = ? WHERE id = ?`
      )
      .bind(topicId, new Date().toISOString(), chatId)
      .run();
  }

  async getOrCreateChat(
    user: User,
    botType: BotType,
    telegramChatId: number
  ): Promise<Chat> {
    let chat = await this.getChat(botType, user.telegram_id);
    if (!chat) {
      chat = await this.createChat({
        user_id: user.id,
        bot_type: botType,
        telegram_chat_id: telegramChatId,
      });
    }
    return chat;
  }

  // ═══════════════════════════════════════════
  // TOKENS
  // ═══════════════════════════════════════════

  async saveToken(
    userId: string,
    botType: BotType,
    encryptedToken: string,
    tokenType: string = 'oauth'
  ): Promise<void> {
    const id = generateId();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO tokens (id, user_id, bot_type, encrypted_token, token_type, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, bot_type) DO UPDATE SET
           encrypted_token = excluded.encrypted_token,
           token_type = excluded.token_type,
           updated_at = excluded.updated_at`
      )
      .bind(id, userId, botType, encryptedToken, tokenType, now, now)
      .run();
  }

  async getToken(userId: string, botType: BotType): Promise<string | null> {
    const result = await this.db
      .prepare(
        'SELECT encrypted_token FROM tokens WHERE user_id = ? AND bot_type = ?'
      )
      .bind(userId, botType)
      .first<{ encrypted_token: string }>();
    return result?.encrypted_token || null;
  }

  async deleteToken(userId: string, botType: BotType): Promise<void> {
    await this.db
      .prepare('DELETE FROM tokens WHERE user_id = ? AND bot_type = ?')
      .bind(userId, botType)
      .run();
  }

  // ═══════════════════════════════════════════
  // SETTINGS
  // ═══════════════════════════════════════════

  async getSettings<T = MetrikaSettings | DirectSettings>(
    userId: string,
    botType: BotType
  ): Promise<T | null> {
    const result = await this.db
      .prepare(
        'SELECT settings_json FROM bot_settings WHERE user_id = ? AND bot_type = ?'
      )
      .bind(userId, botType)
      .first<{ settings_json: string }>();

    if (!result) return null;

    try {
      return JSON.parse(result.settings_json) as T;
    } catch {
      return null;
    }
  }

  async saveSettings(
    userId: string,
    botType: BotType,
    settings: MetrikaSettings | DirectSettings
  ): Promise<void> {
    const id = generateId();
    const now = new Date().toISOString();
    const settingsJson = JSON.stringify(settings);

    await this.db
      .prepare(
        `INSERT INTO bot_settings (id, user_id, bot_type, settings_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, bot_type) DO UPDATE SET
           settings_json = excluded.settings_json,
           updated_at = excluded.updated_at`
      )
      .bind(id, userId, botType, settingsJson, now, now)
      .run();
  }

  // ═══════════════════════════════════════════
  // SCHEDULED REPORTS
  // ═══════════════════════════════════════════

  async getScheduledReports(
    time: string,
    dayOfWeek: number
  ): Promise<ScheduledReport[]> {
    // Get all users with enabled schedules, then match slot in code
    const results = await this.db
      .prepare(
        `SELECT
           bs.user_id,
           bs.bot_type,
           bs.settings_json,
           u.timezone_offset
         FROM bot_settings bs
         JOIN users u ON bs.user_id = u.id
         WHERE u.status = 'active'
           AND json_extract(bs.settings_json, '$.schedule.enabled') = true`
      )
      .all<{
        user_id: string;
        bot_type: BotType;
        settings_json: string;
        timezone_offset: number;
      }>();

    if (!results.results) return [];

    return results.results
      .filter((r) => {
        const settings = JSON.parse(r.settings_json);
        const days = settings.schedule?.days || [];
        const times: string[] = Array.isArray(settings.schedule?.times)
          ? settings.schedule.times
          : settings.schedule?.time
            ? [settings.schedule.time]
            : [];
        return days.includes(dayOfWeek) && times.includes(time);
      })
      .map((r) => ({
        user_id: r.user_id,
        bot_type: r.bot_type,
        settings: JSON.parse(r.settings_json),
        timezone_offset: r.timezone_offset,
      }));
  }

  // ═══════════════════════════════════════════
  // ALERTS
  // ═══════════════════════════════════════════

  async getActiveAlerts(): Promise<ActiveAlert[]> {
    const results = await this.db
      .prepare(
        `SELECT
           bs.user_id,
           bs.bot_type,
           bs.settings_json
         FROM bot_settings bs
         JOIN users u ON bs.user_id = u.id
         WHERE u.status = 'active'
           AND json_extract(bs.settings_json, '$.alerts.enabled') = true`
      )
      .all<{
        user_id: string;
        bot_type: BotType;
        settings_json: string;
      }>();

    if (!results.results) return [];

    const alerts: ActiveAlert[] = [];
    for (const r of results.results) {
      const settings = JSON.parse(r.settings_json);
      const thresholds = settings.alerts.thresholds;

      for (const [alertType, threshold] of Object.entries(thresholds)) {
        alerts.push({
          user_id: r.user_id,
          bot_type: r.bot_type,
          alert_type: alertType,
          threshold: threshold as number,
          last_check: null,
        });
      }
    }

    return alerts;
  }

  // ═══════════════════════════════════════════
  // SUPPORT TICKETS
  // ═══════════════════════════════════════════

  async createTicket(
    userId: string,
    topicId: number,
    entryPoint: string | null
  ): Promise<string> {
    const id = generateId();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO support_tickets (id, user_id, topic_id, entry_point, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'open', ?, ?)`
      )
      .bind(id, userId, topicId, entryPoint, now, now)
      .run();

    return id;
  }

  async getTicketByTopicId(topicId: number): Promise<{
    id: string;
    user_id: string;
    status: string;
  } | null> {
    const result = await this.db
      .prepare('SELECT id, user_id, status FROM support_tickets WHERE topic_id = ?')
      .bind(topicId)
      .first<{ id: string; user_id: string; status: string }>();
    return result || null;
  }

  async getOpenTicketByUserId(userId: string): Promise<{
    id: string;
    topic_id: number;
  } | null> {
    const result = await this.db
      .prepare(
        `SELECT id, topic_id FROM support_tickets
         WHERE user_id = ? AND status = 'open'
         ORDER BY created_at DESC LIMIT 1`
      )
      .bind(userId)
      .first<{ id: string; topic_id: number }>();
    return result || null;
  }

  async closeTicket(ticketId: string): Promise<void> {
    await this.db
      .prepare(
        `UPDATE support_tickets SET status = 'closed', updated_at = ? WHERE id = ?`
      )
      .bind(new Date().toISOString(), ticketId)
      .run();
  }

  // ═══════════════════════════════════════════
  // SUBSCRIPTIONS (заглушка - всегда активна)
  // ═══════════════════════════════════════════

  async isSubscriptionActive(_userId: string): Promise<boolean> {
    // TODO: Implement subscription check
    // Currently always returns true (free access for all)
    return true;
  }

  // ═══════════════════════════════════════════
  // ALERT COOLDOWNS
  // ═══════════════════════════════════════════

  async getLastAlertTime(
    userId: string,
    botType: BotType,
    alertType: string
  ): Promise<string | null> {
    const result = await this.db
      .prepare(
        `SELECT sent_at FROM alert_cooldowns
         WHERE user_id = ? AND bot_type = ? AND alert_type = ?`
      )
      .bind(userId, botType, alertType)
      .first<{ sent_at: string }>();
    return result?.sent_at || null;
  }

  async setAlertSent(
    userId: string,
    botType: BotType,
    alertType: string
  ): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `INSERT INTO alert_cooldowns (id, user_id, bot_type, alert_type, sent_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_id, bot_type, alert_type) DO UPDATE SET
           sent_at = excluded.sent_at`
      )
      .bind(generateId(), userId, botType, alertType, now)
      .run();
  }

  // ═══════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════

  async markUserBlocked(telegramId: number): Promise<void> {
    await this.updateUser(telegramId, { status: 'blocked' });
  }
}

// Factory function
export function createStorage(db: D1Database): StorageAdapter {
  return new StorageAdapter(db);
}
