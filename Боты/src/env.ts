// Типы для Cloudflare Workers Environment

export interface Env {
  // D1 Database
  DB: D1Database;

  // Telegram Bot Tokens
  TELEGRAM_BOT_TOKEN_METRIKA: string;
  TELEGRAM_BOT_TOKEN_DIRECT: string;
  TELEGRAM_BOT_TOKEN_SUPPORT: string;
  TELEGRAM_BOT_TOKEN_LANDING: string;

  // Group IDs
  METRIKA_ADMIN_GROUP_ID: string;
  DIRECT_ADMIN_GROUP_ID: string;
  SUPPORT_GROUP_ID: string;

  // Admin configuration
  ADMIN_IDS: string; // JSON array of admin Telegram IDs

  // Landing page URL
  LANDING_URL: string; // https://andreyai.ru/traffic/
  DIRECT_LANDING_URL?: string; // https://andreyai.ru/ads/

  // Dashboard
  DASHBOARD_DEMO_URL: string;
  DASHBOARD_SESSION_SECRET: string;

  // Yandex API
  YANDEX_OAUTH_CLIENT_ID: string;
  YANDEX_DIRECT_CLIENT_ID: string;

  // Security
  ENCRYPTION_KEY: string; // 32 bytes for AES-256
  WEBHOOK_SECRET?: string;

  // Settings
  DEFAULT_TIMEZONE?: string; // default 180 (UTC+3 Moscow)
  WORK_HOURS_START?: string; // default 10
  WORK_HOURS_END?: string; // default 19
}

// Bot types
export type BotType = 'metrika' | 'direct' | 'support' | 'landing';

// User status
export type UserStatus = 'active' | 'blocked';

// Chat/Bot states
export type MetrikaState =
  | 'idle'
  | 'awaiting_token'
  | 'selecting_counter'
  | 'selecting_goals'
  | 'selecting_metrics'
  | 'selecting_schedule'
  | 'selecting_alerts'
  | 'confirmation'
  | 'active';

export type DirectState =
  | 'idle'
  | 'awaiting_token'
  | 'selecting_campaigns'
  | 'selecting_metrics'
  | 'selecting_schedule'
  | 'selecting_alerts'
  | 'confirmation'
  | 'active';

export type SupportState =
  | 'idle'
  | 'awaiting_message'
  | 'ticket_active';

// Database models
export interface User {
  id: string;
  telegram_id: number;
  telegram_username: string | null;
  first_name: string | null;
  last_name: string | null;
  language_code: string;
  timezone_offset: number;
  created_at: string;
  updated_at: string;
  status: UserStatus;
}

export interface UserCreate {
  telegram_id: number;
  telegram_username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
  timezone_offset?: number;
}

export interface UserUpdate {
  telegram_username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
  timezone_offset?: number;
  status?: UserStatus;
}

export interface Chat {
  id: string;
  user_id: string;
  bot_type: BotType;
  telegram_chat_id: number;
  state: string;
  state_data: string | null;
  admin_topic_id: number | null;
  created_at: string;
  updated_at: string;
  last_activity_at: string | null;
}

export interface ChatCreate {
  user_id: string;
  bot_type: BotType;
  telegram_chat_id: number;
  state?: string;
  state_data?: object;
}

export interface BotSettings {
  id: string;
  user_id: string;
  bot_type: BotType;
  settings_json: string;
  created_at: string;
  updated_at: string;
}

// Settings structures
export interface MetrikaSettings {
  counter_id: number;
  counter_name: string;
  goals: Array<{ id: number; name: string }>;
  metrics: string[];
  schedule: {
    enabled: boolean;
    time?: string; // legacy single slot
    times?: string[]; // preferred multiple slots
    days: number[]; // [1,2,3,4,5] = Mon-Fri
  };
  alerts: {
    enabled: boolean;
    thresholds: {
      traffic_drop: number; // percentage
      bounce_increase: number;
      conversion_drop: number;
    };
  };
}

export interface DirectSettings {
  login: string;
  campaigns: 'all' | number[]; // all or specific IDs
  metrics: string[];
  compare_period: 'day' | 'week' | 'month';
  schedule: {
    enabled: boolean;
    time?: string; // legacy single slot
    times?: string[]; // preferred multiple slots
    days: number[];
  };
  alerts: {
    enabled: boolean;
    thresholds: {
      cpa_increase: number;
      ctr_drop: number;
      spend_limit: number;
    };
  };
}

// Telegram Update types
export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: CallbackQuery;
}

export interface TelegramMessage {
  message_id: number;
  message_thread_id?: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  entities?: MessageEntity[];
  photo?: PhotoSize[];
  document?: Document;
  video?: Video;
}

export interface PhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

export interface Document {
  file_id: string;
  file_unique_id: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface Video {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  duration: number;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  is_forum?: boolean;
}

export interface CallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  chat_instance: string;
  data?: string;
}

export interface MessageEntity {
  type: string;
  offset: number;
  length: number;
  url?: string;
  user?: TelegramUser;
}

// Inline keyboard
export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

export interface InlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
  web_app?: { url: string };
}

// Entry point for support bot
export interface EntryPoint {
  source_bot: 'metrika' | 'direct';
  source_screen: string;
  source_button: string;
  user_context?: {
    counter_id?: string;
    login?: string;
    last_error?: string;
  };
  timestamp: number;
}

// Scheduled reports
export interface ScheduledReport {
  user_id: string;
  bot_type: BotType;
  settings: MetrikaSettings | DirectSettings;
  timezone_offset: number;
}

// Alert configuration
export interface ActiveAlert {
  user_id: string;
  bot_type: BotType;
  alert_type: string;
  threshold: number;
  last_check: string | null;
}

// Insight for reports
export interface InsightData {
  status: 'positive' | 'warning' | 'neutral';
  message: string;
  cause?: string;
  recommendation?: string;
}
