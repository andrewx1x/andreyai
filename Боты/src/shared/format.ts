// Message formatting utilities for Telegram (HTML parse mode)

import type { InsightData } from '../env';

// ═══════════════════════════════════════════
// HEADERS AND DIVIDERS
// ═══════════════════════════════════════════

export const h1 = (text: string): string => `<b>═══ ${text} ═══</b>`;
export const h2 = (text: string): string => `<b>▸ ${text}</b>`;
export const divider = '─'.repeat(21);
export const thinDivider = '·'.repeat(21);

// ═══════════════════════════════════════════
// METRICS FORMATTING
// ═══════════════════════════════════════════

interface MetricOptions {
  label: string;
  value: number | string;
  change?: number; // percentage change
  precision?: number; // decimal places for percentage
  suffix?: string; // e.g., '%', '₽'
}

export function metric(opts: MetricOptions): string {
  const { label, value, change, precision = 0, suffix = '' } = opts;

  // Format value
  const formattedValue = typeof value === 'number'
    ? formatNumber(value) + suffix
    : value + suffix;

  // No change indicator
  if (change === undefined || change === null) {
    return `${label}: <b>${formattedValue}</b>`;
  }

  // Determine arrow and color indicator
  const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '→';
  const changeText = change !== 0
    ? ` (${change > 0 ? '+' : ''}${change.toFixed(precision)}%)`
    : '';

  return `${label}: <b>${formattedValue}</b> ${arrow}${changeText}`;
}

// Simple metric without change
export function simpleMetric(label: string, value: number | string, suffix = ''): string {
  const formattedValue = typeof value === 'number'
    ? formatNumber(value)
    : value;
  return `${label}: <b>${formattedValue}${suffix}</b>`;
}

// ═══════════════════════════════════════════
// NUMBER FORMATTING
// ═══════════════════════════════════════════

export function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1_000) {
    return num.toLocaleString('ru-RU');
  }
  return num.toString();
}

export function formatMoney(amount: number, currency = '₽'): string {
  return formatNumber(Math.round(amount)) + ' ' + currency;
}

export function formatPercent(value: number, precision = 1): string {
  return value.toFixed(precision) + '%';
}

// ═══════════════════════════════════════════
// DATE FORMATTING
// ═══════════════════════════════════════════

const MONTHS_RU = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
];

const MONTHS_SHORT_RU = [
  'янв', 'фев', 'мар', 'апр', 'май', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'
];

const DAYS_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

export function formatDate(date: Date): string {
  const day = date.getDate();
  const month = MONTHS_RU[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export function formatDateShort(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${day}.${month}`;
}

export function formatDateRange(from: Date, to: Date): string {
  return `${formatDateShort(from)} - ${formatDateShort(to)}`;
}

export function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function getDayOfWeekRu(date: Date): string {
  return DAYS_RU[date.getDay()];
}

// ═══════════════════════════════════════════
// REPORT HEADER
// ═══════════════════════════════════════════

interface ReportHeaderOptions {
  title: string;
  date: Date;
  compareDate?: Date;
  source?: string; // e.g., "example.com (12345678)"
}

export function reportHeader(opts: ReportHeaderOptions): string {
  const { title, date, compareDate, source } = opts;

  const lines = [h1(title)];

  // Date line
  if (compareDate) {
    lines.push(`📅 ${formatDateShort(date)} vs ${formatDateShort(compareDate)}`);
  } else {
    lines.push(`📅 ${formatDate(date)}`);
  }

  // Source line
  if (source) {
    lines.push(`🌐 ${source}`);
  }

  return lines.join('\n');
}

// ═══════════════════════════════════════════
// INSIGHTS (ВЫВОДЫ)
// ═══════════════════════════════════════════

export function formatInsight(insight: InsightData): string {
  const statusIcon = {
    positive: '✅',
    warning: '⚠️',
    neutral: 'ℹ️',
  }[insight.status];

  const lines = [
    h2('ВЫВОД'),
    divider,
    `${statusIcon} ${insight.message}`,
  ];

  if (insight.cause) {
    lines.push(insight.cause);
  }

  if (insight.recommendation) {
    lines.push(`👉 ${insight.recommendation}`);
  }

  return lines.join('\n');
}

// ═══════════════════════════════════════════
// TABLE FORMATTING
// ═══════════════════════════════════════════

interface TableRow {
  name: string;
  value: string | number;
  change?: number;
}

export function formatTable(rows: TableRow[], maxNameLength = 15): string {
  return rows
    .map((row) => {
      const name = row.name.length > maxNameLength
        ? row.name.substring(0, maxNameLength - 1) + '…'
        : row.name.padEnd(maxNameLength);

      const value = typeof row.value === 'number'
        ? formatNumber(row.value)
        : row.value;

      if (row.change !== undefined) {
        const arrow = row.change > 0 ? '↑' : row.change < 0 ? '↓' : '→';
        return `${name} ${value} ${arrow}`;
      }

      return `${name} ${value}`;
    })
    .join('\n');
}

// ═══════════════════════════════════════════
// ESCAPING
// ═══════════════════════════════════════════

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ═══════════════════════════════════════════
// MESSAGE BUILDERS
// ═══════════════════════════════════════════

export function buildMessage(...parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join('\n\n');
}

export function buildSection(header: string, content: string): string {
  return `${h2(header)}\n${divider}\n${content}`;
}

// ═══════════════════════════════════════════
// STATUS MESSAGES
// ═══════════════════════════════════════════

export const StatusEmoji = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  loading: '⏳',
  settings: '⚙️',
  report: '📊',
  calendar: '📅',
  bell: '🔔',
  help: '❓',
  support: '💬',
  link: '🔗',
  key: '🔑',
  lock: '🔐',
  chart: '📈',
  chartDown: '📉',
  target: '🎯',
  money: '💰',
  search: '🔍',
  web: '🌐',
  back: '◀️',
  forward: '▶️',
  check: '☑️',
  uncheck: '☐',
} as const;

export function statusMessage(
  emoji: keyof typeof StatusEmoji,
  text: string
): string {
  return `${StatusEmoji[emoji]} ${text}`;
}

// ═══════════════════════════════════════════
// COMMON MESSAGES
// ═══════════════════════════════════════════

export const CommonMessages = {
  error: '❌ Произошла ошибка. Попробуйте позже или обратитесь в поддержку.',
  tokenInvalid: '❌ Токен недействителен. Проверьте правильность и попробуйте снова.',
  tokenSaved: '✅ Токен сохранён! Теперь выберите настройки.',
  settingsSaved: '✅ Настройки сохранены!',
  loading: '⏳ Загрузка...',
  noData: 'ℹ️ Нет данных за выбранный период.',
  subscriptionRequired: '🔐 Для этой функции нужна подписка.',
  maintenance: '🔧 Бот на техническом обслуживании. Попробуйте позже.',
} as const;

// ═══════════════════════════════════════════
// WORKING HOURS CHECK
// ═══════════════════════════════════════════

export function isWorkingHours(
  date: Date = new Date(),
  startHour = 10,
  endHour = 19,
  workDays = [1, 2, 3, 4, 5] // Mon-Fri
): boolean {
  const dayOfWeek = date.getDay();
  const hour = date.getHours();

  return workDays.includes(dayOfWeek) && hour >= startHour && hour < endHour;
}

export function getWorkingHoursMessage(startHour = 10, endHour = 19): string {
  return `Рабочее время: ${startHour}:00 - ${endHour}:00 (Пн-Пт, МСК).\nОтветим в ближайший рабочий день.`;
}
