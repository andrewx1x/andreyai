// Telegram Bot API helpers

import type { InlineKeyboardMarkup, TelegramMessage } from '../env';

const TELEGRAM_API = 'https://api.telegram.org/bot';

interface TelegramResponse<T = unknown> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
  parameters?: {
    retry_after?: number;
    migrate_to_chat_id?: number;
  };
}

interface SendMessageOptions {
  keyboard?: InlineKeyboardMarkup;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disablePreview?: boolean;
  replyToMessageId?: number;
  messageThreadId?: number;
}

interface EditMessageOptions {
  keyboard?: InlineKeyboardMarkup;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disablePreview?: boolean;
}

interface ForumTopicResult {
  message_thread_id: number;
  name: string;
  icon_color: number;
  icon_custom_emoji_id?: string;
}

// Helper to make API requests
async function telegramRequest<T>(
  token: string,
  method: string,
  body: object
): Promise<TelegramResponse<T>> {
  const response = await fetch(`${TELEGRAM_API}${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response.json();
}

// ═══════════════════════════════════════════
// SENDING MESSAGES
// ═══════════════════════════════════════════

export async function sendMessage(
  token: string,
  chatId: number | string,
  text: string,
  options?: SendMessageOptions
): Promise<TelegramResponse<TelegramMessage>> {
  return telegramRequest<TelegramMessage>(token, 'sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: options?.parseMode ?? 'HTML',
    disable_web_page_preview: options?.disablePreview ?? true,
    reply_markup: options?.keyboard,
    reply_to_message_id: options?.replyToMessageId,
    message_thread_id: options?.messageThreadId,
  });
}

export async function editMessage(
  token: string,
  chatId: number | string,
  messageId: number,
  text: string,
  options?: EditMessageOptions
): Promise<TelegramResponse<TelegramMessage>> {
  return telegramRequest<TelegramMessage>(token, 'editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: options?.parseMode ?? 'HTML',
    disable_web_page_preview: options?.disablePreview ?? true,
    reply_markup: options?.keyboard,
  });
}

export async function deleteMessage(
  token: string,
  chatId: number | string,
  messageId: number
): Promise<TelegramResponse<boolean>> {
  return telegramRequest<boolean>(token, 'deleteMessage', {
    chat_id: chatId,
    message_id: messageId,
  });
}

export async function sendVideo(
  token: string,
  chatId: number | string,
  videoUrl: string,
  caption?: string,
  options?: SendMessageOptions
): Promise<TelegramResponse<TelegramMessage>> {
  return telegramRequest<TelegramMessage>(token, 'sendVideo', {
    chat_id: chatId,
    video: videoUrl,
    caption,
    parse_mode: options?.parseMode ?? 'HTML',
    reply_markup: options?.keyboard,
    message_thread_id: options?.messageThreadId,
  });
}

export async function sendPhoto(
  token: string,
  chatId: number | string,
  photoUrl: string,
  caption?: string,
  options?: SendMessageOptions
): Promise<TelegramResponse<TelegramMessage>> {
  return telegramRequest<TelegramMessage>(token, 'sendPhoto', {
    chat_id: chatId,
    photo: photoUrl,
    caption,
    parse_mode: options?.parseMode ?? 'HTML',
    reply_markup: options?.keyboard,
    message_thread_id: options?.messageThreadId,
  });
}

// ═══════════════════════════════════════════
// CALLBACK QUERIES
// ═══════════════════════════════════════════

export async function answerCallback(
  token: string,
  callbackQueryId: string,
  text?: string,
  showAlert?: boolean
): Promise<TelegramResponse<boolean>> {
  return telegramRequest<boolean>(token, 'answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
    show_alert: showAlert,
  });
}

// ═══════════════════════════════════════════
// FORUM TOPICS (для групп-супергрупп с топиками)
// ═══════════════════════════════════════════

export async function createForumTopic(
  token: string,
  chatId: number | string,
  name: string,
  iconColor?: number,
  iconCustomEmojiId?: string
): Promise<TelegramResponse<ForumTopicResult>> {
  return telegramRequest<ForumTopicResult>(token, 'createForumTopic', {
    chat_id: chatId,
    name,
    icon_color: iconColor,
    icon_custom_emoji_id: iconCustomEmojiId,
  });
}

export async function editForumTopic(
  token: string,
  chatId: number | string,
  messageThreadId: number,
  name?: string,
  iconCustomEmojiId?: string
): Promise<TelegramResponse<boolean>> {
  return telegramRequest<boolean>(token, 'editForumTopic', {
    chat_id: chatId,
    message_thread_id: messageThreadId,
    name,
    icon_custom_emoji_id: iconCustomEmojiId,
  });
}

export async function closeForumTopic(
  token: string,
  chatId: number | string,
  messageThreadId: number
): Promise<TelegramResponse<boolean>> {
  return telegramRequest<boolean>(token, 'closeForumTopic', {
    chat_id: chatId,
    message_thread_id: messageThreadId,
  });
}

export async function reopenForumTopic(
  token: string,
  chatId: number | string,
  messageThreadId: number
): Promise<TelegramResponse<boolean>> {
  return telegramRequest<boolean>(token, 'reopenForumTopic', {
    chat_id: chatId,
    message_thread_id: messageThreadId,
  });
}

// ═══════════════════════════════════════════
// COPY / FORWARD MESSAGES
// ═══════════════════════════════════════════

export async function copyMessage(
  token: string,
  chatId: number | string,
  fromChatId: number | string,
  messageId: number,
  options?: {
    messageThreadId?: number;
    caption?: string;
    parseMode?: string;
  }
): Promise<TelegramResponse<{ message_id: number }>> {
  return telegramRequest<{ message_id: number }>(token, 'copyMessage', {
    chat_id: chatId,
    from_chat_id: fromChatId,
    message_id: messageId,
    message_thread_id: options?.messageThreadId,
    caption: options?.caption,
    parse_mode: options?.parseMode,
  });
}

export async function forwardMessage(
  token: string,
  chatId: number | string,
  fromChatId: number | string,
  messageId: number,
  messageThreadId?: number
): Promise<TelegramResponse<TelegramMessage>> {
  return telegramRequest<TelegramMessage>(token, 'forwardMessage', {
    chat_id: chatId,
    from_chat_id: fromChatId,
    message_id: messageId,
    message_thread_id: messageThreadId,
  });
}

// ═══════════════════════════════════════════
// KEYBOARD BUILDERS
// ═══════════════════════════════════════════

interface ButtonConfig {
  text: string;
  data?: string;
  url?: string;
  webApp?: string;
}

export function createKeyboard(
  buttons: ButtonConfig[][]
): InlineKeyboardMarkup {
  return {
    inline_keyboard: buttons.map((row) =>
      row.map((btn) => ({
        text: btn.text,
        callback_data: btn.data,
        url: btn.url,
        web_app: btn.webApp ? { url: btn.webApp } : undefined,
      }))
    ),
  };
}

// Shorthand for single-column keyboard
export function createColumnKeyboard(
  buttons: ButtonConfig[]
): InlineKeyboardMarkup {
  return createKeyboard(buttons.map((btn) => [btn]));
}

// Shorthand for row keyboard
export function createRowKeyboard(buttons: ButtonConfig[]): InlineKeyboardMarkup {
  return createKeyboard([buttons]);
}

// ═══════════════════════════════════════════
// WEBHOOK MANAGEMENT
// ═══════════════════════════════════════════

export async function setWebhook(
  token: string,
  url: string,
  secretToken?: string
): Promise<TelegramResponse<boolean>> {
  return telegramRequest<boolean>(token, 'setWebhook', {
    url,
    secret_token: secretToken,
    allowed_updates: ['message', 'callback_query'],
  });
}

export async function deleteWebhook(
  token: string
): Promise<TelegramResponse<boolean>> {
  return telegramRequest<boolean>(token, 'deleteWebhook', {});
}

export async function getWebhookInfo(
  token: string
): Promise<TelegramResponse<{
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
}>> {
  return telegramRequest(token, 'getWebhookInfo', {});
}

// ═══════════════════════════════════════════
// CHAT INFO
// ═══════════════════════════════════════════

export async function getChat(
  token: string,
  chatId: number | string
): Promise<TelegramResponse<{
  id: number;
  type: string;
  title?: string;
  username?: string;
  first_name?: string;
}>> {
  return telegramRequest(token, 'getChat', { chat_id: chatId });
}

// ═══════════════════════════════════════════
// BATCHING UTILITIES
// ═══════════════════════════════════════════

const BATCH_SIZE = 25;
const BATCH_DELAY_MS = 1100;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendBatch<T>(
  items: T[],
  sendFn: (item: T) => Promise<TelegramResponse>,
  onError?: (item: T, error: unknown) => void
): Promise<void> {
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);

    await Promise.allSettled(
      batch.map((item) =>
        sendFn(item).catch((err) => {
          if (onError) onError(item, err);
        })
      )
    );

    if (i + BATCH_SIZE < items.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }
}

// ═══════════════════════════════════════════
// RETRY LOGIC
// ═══════════════════════════════════════════

export async function sendWithRetry(
  token: string,
  chatId: number | string,
  text: string,
  options?: SendMessageOptions,
  maxRetries = 3
): Promise<TelegramResponse<TelegramMessage>> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await sendMessage(token, chatId, text, options);

    if (result.ok) return result;

    // User blocked the bot
    if (result.error_code === 403) {
      return result; // Don't retry, user blocked us
    }

    // Rate limited
    if (result.error_code === 429) {
      const retryAfter = result.parameters?.retry_after || 30;
      await sleep(retryAfter * 1000);
      continue;
    }

    // Other errors - exponential backoff
    if (attempt < maxRetries) {
      await sleep(1000 * attempt);
    }
  }

  // Return last attempt result
  return sendMessage(token, chatId, text, options);
}

// ═══════════════════════════════════════════
// TOPIC ICON COLORS
// ═══════════════════════════════════════════

export const TopicColors = {
  BLUE: 0x6FB9F0,
  YELLOW: 0xFFD67E,
  VIOLET: 0xCB86DB,
  GREEN: 0x8EEE98,
  ROSE: 0xFF93B2,
  RED: 0xFB6F5F,
} as const;

// Map bot types to colors
export const BotTopicColors = {
  metrika: TopicColors.BLUE,
  direct: TopicColors.GREEN,
  support: TopicColors.YELLOW,
} as const;
