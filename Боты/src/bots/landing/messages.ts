// Static demo messages for Landing bot

import { h1, h2, divider, thinDivider } from '../../shared/format';
import type { InlineKeyboardMarkup } from '../../env';

// ═══════════════════════════════════════════
// CALLBACK DATA
// ═══════════════════════════════════════════

export const CB = {
  WATCH_VIDEO: 'watch_video',
  SELECT_PRODUCT: 'select_product',
  SELECT_METRIKA: 'select_metrika',
  SELECT_DIRECT: 'select_direct',
  SHOW_REPORT: 'show_report',
  SHOW_ALERT: 'show_alert',
  CHANGE_METRICS: 'change_metrics',
  CHANGE_TIME: 'change_time',
  OPEN_DASHBOARD: 'open_dashboard',
  BACK_TO_PRODUCTS: 'back_products',
  BACK: 'back',
  LANDING: 'landing',
  RESTART: 'restart',
  FINISH: 'finish',
};

// ═══════════════════════════════════════════
// WELCOME SCREEN
// ═══════════════════════════════════════════

export function welcomeMessage(): string {
  return `${h1('СВОДКА — ДЕМО')}

Посмотрите, как выглядят настоящие отчёты —
без регистрации и подключения API.

Что вы увидите:
• видео настройки
• пример отчётов
• пример алертов
• кнопки управления

${thinDivider}
Данные в демо — фиксированные, без API.
${thinDivider}`;
}

export function welcomeKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: '▶️ Смотреть видео', callback_data: CB.WATCH_VIDEO }],
      [{ text: '📊 Выбрать продукт', callback_data: CB.SELECT_PRODUCT }],
    ],
  };
}

// ═══════════════════════════════════════════
// VIDEO SCREEN
// ═══════════════════════════════════════════

export function videoMessage(): string {
  return `🎥 Видео: как настроить бота и получать отчёты

После просмотра выберите продукт:`;
}

export function videoKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: '📈 Сводка.Трафик (демо)', callback_data: CB.SELECT_METRIKA }],
      [{ text: '📣 Сводка.Реклама (демо)', callback_data: CB.SELECT_DIRECT }],
      [{ text: '◀️ Назад', callback_data: CB.BACK }],
    ],
  };
}

export function productSelectKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: '📈 Сводка.Трафик (демо)', callback_data: CB.SELECT_METRIKA }],
      [{ text: '📣 Сводка.Реклама (демо)', callback_data: CB.SELECT_DIRECT }],
      [{ text: '◀️ Назад', callback_data: CB.BACK }],
    ],
  };
}

// ═══════════════════════════════════════════
// METRIKA DEMO REPORT
// ═══════════════════════════════════════════

export function metrikaReportMessage(): string {
  return `${h1('ОТЧЁТ СВОДКА.ТРАФИК')}
📅 29.01.2026 vs 28.01.2026
🌐 Счётчик: example.com (12345678)

${h2('ОСНОВНЫЕ ПОКАЗАТЕЛИ')}
${divider}
• Визиты: 1 234 ↑ (+12%)
• Посетители: 987 ↑ (+8%)
• Отказы: 32.5% ↓ (-5%)
• Глубина: 2.3 → (0%)

${h2('ЦЕЛИ')}
${divider}
• ⭐ Заявка: 45 ↑ (+15%)
• Звонок: 23 → (0%)

${thinDivider}
💡 ВЫВОД:
✅ Трафик и заявки растут — сайт
работает лучше прошлого периода.
${thinDivider}`;
}

export function metrikaReportKeyboard(landingUrl: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: '⚙️ Изменить показатели', callback_data: CB.CHANGE_METRICS },
        { text: '🕒 Изменить время', callback_data: CB.CHANGE_TIME },
      ],
      [{ text: '📊 Показать отчёт', callback_data: CB.SHOW_REPORT }],
      [{ text: '🚨 Пример алерта', callback_data: CB.SHOW_ALERT }],
      [{ text: '◀️ К выбору продукта', callback_data: CB.BACK_TO_PRODUCTS }],
      [{ text: '🌐 Вернуться на лендинг', url: landingUrl }],
    ],
  };
}

// ═══════════════════════════════════════════
// DIRECT DEMO REPORT
// ═══════════════════════════════════════════

export function directReportMessage(): string {
  return `${h1('ОТЧЁТ СВОДКА.РЕКЛАМА')}
📅 20.01–26.01 vs 13.01–19.01
🏷 Аккаунт: my-company

${h2('ОБЩАЯ СТАТИСТИКА')}
${divider}
• Показы: 19 458 ↑ +8%
• Клики: 1 379 ↑ +12%
• CTR: 7.09% ↑ +0.3%
• Расход: 123 819 ₽ ↑ +15%
• CPC: 89,79 ₽ ↑ +3%

${h2('КОНВЕРСИИ')}
${divider}
• Конверсии: 26 ↓ -7%
• CPA: 4 762 ₽ ↑ +24%

${h2('ТОП КАМПАНИИ ПО РАСХОДУ')}
${divider}
1. Поиск — Бренд
   Расход: 45 000 ₽ | Conv: 12
2. РСЯ — Ретаргетинг
   Расход: 38 000 ₽ | Conv: 8
3. Поиск — Конкуренты
   Расход: 25 000 ₽ | Conv: 3

${thinDivider}
💡 ВЫВОД:
⚠️ CPA вырос на 24% при падении
конверсий. Основная причина —
кампания «Поиск — Конкуренты».
👉 Проверьте ставки и ключи.
${thinDivider}`;
}

export function directReportKeyboard(landingUrl: string, dashboardUrl: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: '⚙️ Изменить показатели', callback_data: CB.CHANGE_METRICS },
        { text: '🕒 Изменить время', callback_data: CB.CHANGE_TIME },
      ],
      [{ text: '📊 Показать отчёт', callback_data: CB.SHOW_REPORT }],
      [{ text: '📈 Открыть дашборд (демо)', url: dashboardUrl }],
      [{ text: '🚨 Пример алерта', callback_data: CB.SHOW_ALERT }],
      [{ text: '◀️ К выбору продукта', callback_data: CB.BACK_TO_PRODUCTS }],
      [{ text: '🌐 Вернуться на лендинг', url: landingUrl }],
    ],
  };
}

// ═══════════════════════════════════════════
// ALERT DEMO
// ═══════════════════════════════════════════

export function alertDemoMessage(product: 'metrika' | 'direct'): string {
  if (product === 'metrika') {
    return `🚨 АЛЕРТ (ДЕМО)

Условие: Падение конверсий > 20%

Текущее значение: 45 заявок
Было: 58 заявок
Изменение: -22%

Период: 29.01.2026 vs 28.01.2026
Счётчик: example.com

${thinDivider}
💡 Рекомендация: проверьте
работу форм и загрузку сайта.
${thinDivider}`;
  }

  return `🚨 АЛЕРТ (ДЕМО)

Условие: CPA вырос > 50%

Текущий CPA: 4 762 ₽
Было: 3 175 ₽
Изменение: +50%

Период: 20.01–26.01 vs 13.01–19.01

${thinDivider}
💡 Рекомендация: проверьте кампании
с высоким расходом и низкой
конверсией в первую очередь.
${thinDivider}`;
}

export function alertKeyboard(product: 'metrika' | 'direct', landingUrl: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: '📊 Показать отчёт', callback_data: product === 'metrika' ? CB.SELECT_METRIKA : CB.SELECT_DIRECT }],
      [{ text: '◀️ Назад', callback_data: product === 'metrika' ? CB.SELECT_METRIKA : CB.SELECT_DIRECT }],
      [{ text: '🌐 Вернуться на лендинг', url: landingUrl }],
    ],
  };
}

// ═══════════════════════════════════════════
// SETTINGS INFO (stub screens)
// ═══════════════════════════════════════════

export function changeMetricsMessage(): string {
  return `⚙️ ИЗМЕНЕНИЕ ПОКАЗАТЕЛЕЙ (ДЕМО)

В полной версии здесь можно выбрать,
какие метрики включить в отчёт:

✅ Визиты
✅ Посетители
☑️ Отказы
☑️ Глубина просмотра
✅ Цели

${thinDivider}
Это демо — настройки недоступны.
Получите полный доступ на сайте.
${thinDivider}`;
}

export function changeTimeMessage(): string {
  return `🕒 ИЗМЕНЕНИЕ ВРЕМЕНИ (ДЕМО)

В полной версии здесь можно настроить:

📆 Частота отчётов:
• Ежедневно
• Еженедельно
• Ежемесячно

⏰ Время отправки:
• 09:00, 10:00, 12:00, 18:00

🌍 Часовой пояс:
• Москва (UTC+3)

${thinDivider}
Это демо — настройки недоступны.
Получите полный доступ на сайте.
${thinDivider}`;
}

export function settingsKeyboard(product: 'metrika' | 'direct', landingUrl: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: '◀️ Назад к отчёту', callback_data: product === 'metrika' ? CB.SELECT_METRIKA : CB.SELECT_DIRECT }],
      [{ text: '🌐 Получить полный доступ', url: landingUrl }],
    ],
  };
}

// ═══════════════════════════════════════════
// FINISH SCREEN
// ═══════════════════════════════════════════

export function finishMessage(): string {
  return `✅ Вы посмотрели демо-версию бота!

Понравилось? Получите полный доступ:
• реальные данные из API
• автоматические отчёты
• настраиваемые алерты
• автоматические выводы

${thinDivider}
Перейдите на сайт для подключения.
${thinDivider}`;
}

export function finishKeyboard(landingUrl: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: '🌐 Вернуться на лендинг', url: landingUrl }],
      [{ text: '🔄 Начать демо сначала', callback_data: CB.RESTART }],
    ],
  };
}
