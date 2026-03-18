// Messages and keyboards for Support bot

import { h1, divider, thinDivider, isWorkingHours, getWorkingHoursMessage } from '../../shared/format';
import type { InlineKeyboardMarkup } from '../../env';
import { createKeyboard, createRowKeyboard } from '../../shared/telegram';

// ═══════════════════════════════════════════
// ENTRY POINT PARSING
// ═══════════════════════════════════════════

export interface EntryPoint {
  source: 'metrika' | 'direct' | 'unknown';
  type: 'help' | 'bug' | 'feature';
  screen: string;
}

export function parseEntryPoint(startParam: string): EntryPoint {
  const parts = startParam.split('_');

  if (parts.length < 3) {
    return { source: 'unknown', type: 'help', screen: 'general' };
  }

  return {
    source: parts[0] as 'metrika' | 'direct',
    type: parts[1] as 'help' | 'bug' | 'feature',
    screen: parts.slice(2).join('_'),
  };
}

// ═══════════════════════════════════════════
// NAME MAPPINGS
// ═══════════════════════════════════════════

export const SCREEN_NAMES: Record<string, Record<string, string>> = {
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
    general: 'Общий вопрос',
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
    general: 'Общий вопрос',
  },
  unknown: {
    general: 'Общий вопрос',
  },
};

export const TYPE_NAMES: Record<string, string> = {
  help: 'Вопрос',
  bug: 'Баг-репорт',
  feature: 'Предложение',
};

export const PRODUCT_NAMES: Record<string, string> = {
  metrika: 'Сводка.Трафик',
  direct: 'Сводка.Реклама',
  unknown: 'Неизвестный продукт',
};

export const TYPE_EMOJI: Record<string, string> = {
  help: '💬',
  bug: '🐞',
  feature: '💡',
  urgent: '🔴',
};

// ═══════════════════════════════════════════
// WELCOME MESSAGES
// ═══════════════════════════════════════════

export function welcomeWithContextMessage(entry: EntryPoint): string {
  const productName = PRODUCT_NAMES[entry.source];
  const screenName = SCREEN_NAMES[entry.source]?.[entry.screen] || entry.screen;

  return `${h1('ПОДДЕРЖКА')}

Здравствуйте!

Вы обратились из: ${productName}
Раздел: ${screenName}

Опишите ваш вопрос одним сообщением.
Можно прикрепить скриншот или файл.

${thinDivider}
${getWorkingHoursMessage()}
${thinDivider}`;
}

export function welcomeNoContextMessage(): string {
  return `${h1('ПОДДЕРЖКА')}

Здравствуйте!

Это бот поддержки.
Опишите ваш вопрос одним сообщением.

${thinDivider}
💡 Совет: Для быстрого ответа
   используйте кнопку «Помощь»
   в боте Сводка.Трафик или Сводка.Реклама —
   так мы сразу увидим контекст.
${thinDivider}

${getWorkingHoursMessage()}`;
}

// ═══════════════════════════════════════════
// CONFIRMATION MESSAGES
// ═══════════════════════════════════════════

export function messageReceivedMessage(): string {
  return `Ваше сообщение получено! ✓

Мы ответим в ближайшее время.
Следите за этим чатом.`;
}

export function outOfHoursMessage(): string {
  return `⏰ Сейчас нерабочее время.

Ваше сообщение получено!
Мы ответим в рабочие часы:
Пн–Пт, 10:00–19:00 (МСК)

${thinDivider}
💡 Если вопрос СРОЧНЫЙ,
   напишите «срочно» —
   мы постараемся ответить
   как можно быстрее.
${thinDivider}`;
}

export function ticketClosedMessage(): string {
  return `✅ Обращение закрыто.

Спасибо за обратную связь!
Если появятся новые вопросы —
пишите, мы всегда рады помочь.`;
}

// ═══════════════════════════════════════════
// ADMIN MESSAGES (TICKET CARD)
// ═══════════════════════════════════════════

export interface TicketCardData {
  firstName: string;
  lastName?: string;
  username?: string;
  telegramId: number;
  entry: EntryPoint;
  datetime: string;
  isWorkHours: boolean;
  messageText?: string;
  hasAttachment: boolean;
}

export function ticketCardMessage(data: TicketCardData): string {
  const productName = PRODUCT_NAMES[data.entry.source];
  const typeName = TYPE_NAMES[data.entry.type];
  const screenName = SCREEN_NAMES[data.entry.source]?.[data.entry.screen] || data.entry.screen;
  const workStatus = data.isWorkHours ? '✅ Рабочее время' : '🌙 Нерабочее время';

  const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ');
  const usernameStr = data.username ? `@${data.username}` : '—';
  const profileLink = `tg://user?id=${data.telegramId}`;

  let card = `🆕 НОВОЕ ОБРАЩЕНИЕ
${divider}

👤 Пользователь
   Имя: ${fullName}
   Username: ${usernameStr}
   ID: ${data.telegramId}
   Профиль: ${profileLink}

📦 Контекст
   Продукт: ${productName}
   Тип: ${typeName}
   Раздел: ${screenName}
   Entry: ${data.entry.source}_${data.entry.type}_${data.entry.screen}

⏰ Время
   ${data.datetime} (МСК)
   ${workStatus}

${divider}`;

  if (data.messageText) {
    card += `\n\n💬 СООБЩЕНИЕ:\n\n${data.messageText}`;
  }

  if (data.hasAttachment) {
    card += '\n\n📎 [Вложение ниже]';
  }

  return card;
}

export function topicName(data: {
  username?: string;
  telegramId: number;
  source: string;
  type: string;
  isUrgent?: boolean;
}): string {
  const emoji = data.isUrgent ? '🔴' : TYPE_EMOJI[data.type] || '💬';
  const userPart = data.username ? `@${data.username}` : `id:${data.telegramId}`;
  const productShort = data.source === 'metrika' ? 'Сводка Трафик' : data.source === 'direct' ? 'Сводка Реклама' : '—';
  const typeName = data.isUrgent ? 'СРОЧНО' : (TYPE_NAMES[data.type] || 'Вопрос');

  const name = `${emoji} ${userPart} | ${data.telegramId} | ${productShort} | ${typeName}`;
  return name.slice(0, 128); // Telegram limit
}

// ═══════════════════════════════════════════
// ADMIN NOTIFICATIONS
// ═══════════════════════════════════════════

export function nightNotificationMessage(data: {
  username?: string;
  telegramId: number;
  source: string;
  screen: string;
  topicLink: string;
}): string {
  const productName = PRODUCT_NAMES[data.source as keyof typeof PRODUCT_NAMES] || data.source;
  const screenName = SCREEN_NAMES[data.source]?.[data.screen] || data.screen;
  const userStr = data.username ? `@${data.username}` : `ID: ${data.telegramId}`;

  return `🌙 НОЧНОЕ СООБЩЕНИЕ

Пользователь написал в нерабочее время.

👤 ${userStr} (ID: ${data.telegramId})
📦 ${productName}
📍 ${screenName}

[Перейти к обращению](${data.topicLink})`;
}

export function urgentNotificationMessage(data: {
  username?: string;
  telegramId: number;
  source: string;
  topicLink: string;
}): string {
  const productName = PRODUCT_NAMES[data.source as keyof typeof PRODUCT_NAMES] || data.source;
  const userStr = data.username ? `@${data.username}` : `ID: ${data.telegramId}`;

  return `🔴 СРОЧНОЕ ОБРАЩЕНИЕ

Пользователь отметил сообщение как срочное!

👤 ${userStr} (ID: ${data.telegramId})
📦 ${productName}

[Перейти к обращению](${data.topicLink})`;
}

// ═══════════════════════════════════════════
// KEYBOARDS
// ═══════════════════════════════════════════

export function returnKeyboard(source?: string): InlineKeyboardMarkup {
  const buttons: Array<{ text: string; url: string }[]> = [];

  if (source === 'metrika' || !source) {
    buttons.push([{ text: '🔙 Вернуться в Сводка.Трафик', url: 'https://t.me/TrafficInsightBot_bot' }]);
  }

  if (source === 'direct' || !source) {
    buttons.push([{ text: '🔙 Вернуться в Сводка.Реклама', url: 'https://t.me/AdsRadar_bot' }]);
  }

  return { inline_keyboard: buttons };
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

export function containsUrgent(text?: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return lower.includes('срочно') || lower.includes('urgent') || lower.includes('asap');
}

export function formatMskDateTime(date: Date): string {
  // UTC+3 for Moscow
  const msk = new Date(date.getTime() + 3 * 60 * 60 * 1000);
  const day = msk.getUTCDate().toString().padStart(2, '0');
  const month = (msk.getUTCMonth() + 1).toString().padStart(2, '0');
  const year = msk.getUTCFullYear();
  const hours = msk.getUTCHours().toString().padStart(2, '0');
  const minutes = msk.getUTCMinutes().toString().padStart(2, '0');

  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

export function getTopicLink(groupId: number, topicId: number): string {
  // Convert -100xxx to just xxx for the link
  const groupIdStr = groupId.toString();
  const cleanGroupId = groupIdStr.startsWith('-100') ? groupIdStr.slice(4) : groupIdStr.replace('-', '');
  return `https://t.me/c/${cleanGroupId}/${topicId}`;
}
