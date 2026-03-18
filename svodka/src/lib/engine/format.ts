// Formatting utilities (ported from Боты/src/shared/format.ts)
// Removed Telegram HTML tags, kept pure formatting functions

const MONTHS_RU = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

const MONTHS_SHORT_RU = [
  "янв", "фев", "мар", "апр", "май", "июн",
  "июл", "авг", "сен", "окт", "ноя", "дек",
];

export function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1_000) {
    return num.toLocaleString("ru-RU");
  }
  return num.toString();
}

export function formatMoney(amount: number, currency = "₽"): string {
  return formatNumber(Math.round(amount)) + " " + currency;
}

export function formatPercent(value: number, precision = 1): string {
  return value.toFixed(precision) + "%";
}

export function formatDate(date: Date): string {
  const day = date.getDate();
  const month = MONTHS_RU[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export function formatDateShort(date: Date): string {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${day}.${month}`;
}

export function formatDateRange(from: Date, to: Date): string {
  return `${formatDateShort(from)} – ${formatDateShort(to)}`;
}

export function formatMonthShort(date: Date): string {
  return MONTHS_SHORT_RU[date.getMonth()];
}

export function calcChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function formatChange(change: number, precision = 0): string {
  const sign = change > 0 ? "+" : "";
  return `${sign}${change.toFixed(precision)}%`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins === 0) return `${secs} сек`;
  return `${mins} мин ${secs} сек`;
}
