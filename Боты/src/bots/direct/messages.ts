// Messages and keyboards for Direct bot

import { createKeyboard } from '../../shared/telegram';
import { h1, h2, divider, buildMessage } from '../../shared/format';
import type { InlineKeyboardMarkup, DirectSettings } from '../../env';
import type { StateData, MetricFlags } from './states';
import type { DirectCampaign } from './api';

// ═══════════════════════════════════════════
// CALLBACK DATA PREFIXES
// ═══════════════════════════════════════════

export const CB = {
  START_SETUP: 'setup',
  HELP: 'help',
  BACK: 'back',
  CAMPAIGN_ALL: 'camp:all',
  CAMPAIGN_SELECTED: 'camp:selected',
  CAMPAIGN_TOGGLE: 'camp_t:',
  CAMPAIGNS_DONE: 'camps_done',
  GROUPING: 'group:',
  METRIC_TOGGLE: 'metric:',
  METRICS_DONE: 'metrics_done',
  METRICS_INFO: 'metrics_info',
  PERIOD: 'period:',
  FREQ_DAILY: 'freq:daily',
  FREQ_WEEKLY: 'freq:weekly',
  FREQ_MONTHLY: 'freq:monthly',
  TIME: 'time:',
  TIMEZONE: 'tz:',
  WEEKDAY: 'weekday:',
  ALERTS_YES: 'alerts:yes',
  ALERTS_NO: 'alerts:no',
  ALERT_TOGGLE: 'alert:',
  ALERTS_DONE: 'alerts_done',
  CONFIRM: 'confirm',
  EDIT: 'edit',
  EDIT_STEP: 'edit_step:',
  REPORT_NOW: 'report_now',
  DASHBOARD: 'dashboard',
  SETTINGS: 'settings',
} as const;

const SUPPORT_BASE = 'https://t.me/PulseAssist_bot?start=';

function supportLink(context: string): string {
  return `${SUPPORT_BASE}direct_${context}`;
}

// ═══════════════════════════════════════════
// WELCOME SCREEN
// ═══════════════════════════════════════════

export function welcomeMessage(): string {
  return buildMessage(
    h1('СВОДКА.РЕКЛАМА'),
    `Привет! Этот бот присылает отчёты
по рекламным кампаниям
прямо в Telegram.

Что умеет бот:
• Ежедневные/еженедельные отчёты
• Сравнение с прошлым периодом
• Алерты при изменении расхода
• Интерактивный дашборд`,
    `${divider}
⚠️ Для работы нужен:
   • Аккаунт Яндекс Директа
   • Код доступа (только чтение)
   • Логин аккаунта

🔒 Токен используется только для
   ЧТЕНИЯ статистики. Изменить
   кампании через бота нельзя.
${divider}`
  );
}

export function welcomeKeyboard(): InlineKeyboardMarkup {
  return createKeyboard([
    [{ text: '🚀 Начать настройку', data: CB.START_SETUP }],
    [{ text: '❓ Помощь', url: supportLink('help_start') }],
  ]);
}

// ═══════════════════════════════════════════
// STEP 1: TOKEN + LOGIN
// ═══════════════════════════════════════════

export function tokenMessage(oauthUrl: string): string {
  return buildMessage(
    h1('ШАГ 1 ИЗ 7: АВТОРИЗАЦИЯ'),
    `Для подключения нужны два параметра:
1. Код доступа Яндекс Директа
2. Логин аккаунта Яндекс Директа

📋 ИНСТРУКЦИЯ:

1. Нажмите "Получить токен"
2. Войдите в аккаунт Яндекса
3. Разрешите доступ приложению
4. Скопируйте токен из адресной строки
5. Отправьте токен сюда`,
    `${divider}
🔒 БЕЗОПАСНОСТЬ:
• Токен даёт доступ ТОЛЬКО на чтение
• Изменить кампании нельзя
• Токен хранится зашифрованно
${divider}`
  );
}

export function tokenKeyboard(oauthUrl: string): InlineKeyboardMarkup {
  return createKeyboard([
    [{ text: '🔑 Получить токен', url: oauthUrl }],
    [
      { text: '❓ Помощь', url: supportLink('help_auth') },
      { text: '◀️ Назад', data: CB.BACK },
    ],
  ]);
}

export function loginMessage(): string {
  return buildMessage(
    'Токен принят! ✓',
    `Теперь введите логин аккаунта
Яндекс Директа:

Пример: my-company

💡 Это логин от аккаунта Директа,
   не email. Найти можно в правом
   верхнем углу в Яндекс Директе.`
  );
}

export function loginKeyboard(): InlineKeyboardMarkup {
  return createKeyboard([
    [{ text: '❓ Помощь', url: supportLink('help_login') }],
    [{ text: '◀️ Назад', data: CB.BACK }],
  ]);
}

// ═══════════════════════════════════════════
// STEP 2: CAMPAIGNS
// ═══════════════════════════════════════════

export function campaignsIntroMessage(login: string): string {
  return buildMessage(
    h1('ШАГ 2 ИЗ 7: КАМПАНИИ'),
    `Авторизация успешна! ✓
Логин: ${login}

Как формировать отчёты?`
  );
}

export function campaignsIntroKeyboard(): InlineKeyboardMarkup {
  return createKeyboard([
    [{ text: '📊 Общий по всем кампаниям', data: CB.CAMPAIGN_ALL }],
    [{ text: '✅ Выбрать конкретные кампании', data: CB.CAMPAIGN_SELECTED }],
    [{ text: '◀️ Назад', data: CB.BACK }],
  ]);
}

export function campaignsSelectMessage(
  campaigns: DirectCampaign[],
  selectedIds: number[]
): string {
  const list = campaigns
    .slice(0, 10)
    .map((c) => {
      const checked = selectedIds.includes(c.Id) ? '☑' : '☐';
      const status = c.State === 'ON' ? 'Активна' : 'Приостановлена';
      return `${checked} ${c.Name}\n   ID: ${c.Id} | ${status}`;
    })
    .join('\n\n');

  return buildMessage(
    'Выберите кампании для отчётов:',
    list,
    `${divider}
Выбрано: ${selectedIds.length} кампаний
${divider}`
  );
}

export function campaignsSelectKeyboard(
  campaigns: DirectCampaign[],
  selectedIds: number[]
): InlineKeyboardMarkup {
  const buttons = campaigns.slice(0, 10).map((c) => {
    const checked = selectedIds.includes(c.Id) ? '☑️' : '☐';
    const shortName = c.Name.length > 20 ? c.Name.substring(0, 18) + '…' : c.Name;
    return [{ text: `${checked} ${shortName}`, data: `${CB.CAMPAIGN_TOGGLE}${c.Id}` }];
  });

  if (selectedIds.length > 0) {
    buttons.push([{ text: 'Продолжить ▸', data: CB.CAMPAIGNS_DONE }]);
  }
  buttons.push([{ text: '◀️ Назад', data: CB.BACK }]);

  return createKeyboard(buttons);
}

export function groupingMessage(): string {
  return 'Как показывать статистику?';
}

export function groupingKeyboard(): InlineKeyboardMarkup {
  return createKeyboard([
    [{ text: '📊 Общая сумма по выбранным', data: `${CB.GROUPING}total` }],
    [{ text: '📋 Отдельная строка по каждой', data: `${CB.GROUPING}separate` }],
    [{ text: '🔀 Оба варианта', data: `${CB.GROUPING}both` }],
    [{ text: '◀️ Назад', data: CB.BACK }],
  ]);
}

// ═══════════════════════════════════════════
// STEP 4: METRICS
// ═══════════════════════════════════════════

export function metricsMessage(metrics: MetricFlags): string {
  const check = (v: boolean) => (v ? '☑' : '☐');

  return buildMessage(
    h1('ШАГ 4 ИЗ 7: ПОКАЗАТЕЛИ'),
    `Какие показатели включить в отчёт?`,
    `${h2('БАЗОВЫЕ МЕТРИКИ')}
${check(metrics.impressions)} Показы
${check(metrics.clicks)} Клики
${check(metrics.ctr)} CTR (%)
${check(metrics.cost)} Расход`,
    `${h2('СТОИМОСТЬ')}
${check(metrics.avgCpc)} Средняя цена клика (CPC)`,
    `${h2('КОНВЕРСИИ')}
${check(metrics.conversions)} Конверсии
${check(metrics.costPerConversion)} Цена цели (CPA)`,
    `${divider}
Выбрано: ${countSelectedMetrics(metrics)} показателей
${divider}`
  );
}

function countSelectedMetrics(m: MetricFlags): number {
  return Object.values(m).filter(Boolean).length;
}

export function metricsKeyboard(metrics: MetricFlags): InlineKeyboardMarkup {
  const check = (v: boolean) => (v ? '☑️' : '☐');

  return createKeyboard([
    [
      { text: `${check(metrics.impressions)} Показы`, data: `${CB.METRIC_TOGGLE}impressions` },
      { text: `${check(metrics.clicks)} Клики`, data: `${CB.METRIC_TOGGLE}clicks` },
    ],
    [
      { text: `${check(metrics.ctr)} CTR`, data: `${CB.METRIC_TOGGLE}ctr` },
      { text: `${check(metrics.cost)} Расход`, data: `${CB.METRIC_TOGGLE}cost` },
    ],
    [
      { text: `${check(metrics.avgCpc)} CPC`, data: `${CB.METRIC_TOGGLE}avgCpc` },
    ],
    [
      { text: `${check(metrics.conversions)} Конверсии`, data: `${CB.METRIC_TOGGLE}conversions` },
      { text: `${check(metrics.costPerConversion)} CPA`, data: `${CB.METRIC_TOGGLE}costPerConversion` },
    ],
    [{ text: 'ℹ️ Пояснение показателей', data: CB.METRICS_INFO }],
    [{ text: 'Продолжить ▸', data: CB.METRICS_DONE }],
    [{ text: '◀️ Назад', data: CB.BACK }],
  ]);
}

// ═══════════════════════════════════════════
// STEP 5: SCHEDULE
// ═══════════════════════════════════════════

export function periodMessage(): string {
  return buildMessage(
    h1('ШАГ 5 ИЗ 7: РАСПИСАНИЕ'),
    'За какой период сравнивать данные?'
  );
}

export function periodKeyboard(): InlineKeyboardMarkup {
  return createKeyboard([
    [{ text: '📅 Вчера vs Позавчера', data: `${CB.PERIOD}day` }],
    [{ text: '📆 Неделя vs Пред. неделя', data: `${CB.PERIOD}week` }],
    [{ text: '📆 Месяц vs Пред. месяц', data: `${CB.PERIOD}month` }],
    [{ text: '◀️ Назад', data: CB.BACK }],
  ]);
}

export function frequencyMessage(): string {
  return 'Как часто присылать отчёты?';
}

export function frequencyKeyboard(): InlineKeyboardMarkup {
  return createKeyboard([
    [{ text: '📅 Ежедневно', data: CB.FREQ_DAILY }],
    [{ text: '📆 Еженедельно (по понедельникам)', data: CB.FREQ_WEEKLY }],
    [{ text: '📆 Ежемесячно (1-го числа)', data: CB.FREQ_MONTHLY }],
    [{ text: '◀️ Назад', data: CB.BACK }],
  ]);
}

export function timeMessage(): string {
  return 'В какое время присылать отчёт?';
}

export function timeKeyboard(): InlineKeyboardMarkup {
  return createKeyboard([
    [
      { text: '🕘 09:00', data: `${CB.TIME}09:00` },
      { text: '🕙 10:00', data: `${CB.TIME}10:00` },
    ],
    [
      { text: '🕛 12:00', data: `${CB.TIME}12:00` },
      { text: '🕕 18:00', data: `${CB.TIME}18:00` },
    ],
    [{ text: '◀️ Назад', data: CB.BACK }],
  ]);
}

export function timezoneKeyboard(): InlineKeyboardMarkup {
  return createKeyboard([
    [{ text: '🇷🇺 Москва UTC+3', data: `${CB.TIMEZONE}180` }],
    [{ text: '🇷🇺 Калининград UTC+2', data: `${CB.TIMEZONE}120` }],
    [{ text: '🇷🇺 Екатеринбург UTC+5', data: `${CB.TIMEZONE}300` }],
    [{ text: '◀️ Назад', data: CB.BACK }],
  ]);
}

// ═══════════════════════════════════════════
// STEP 6: ALERTS
// ═══════════════════════════════════════════

export function alertsIntroMessage(): string {
  return buildMessage(
    h1('ШАГ 6 ИЗ 7: АЛЕРТЫ'),
    `Алерты — срочные уведомления при
резких изменениях показателей.

Хотите получать алерты?`
  );
}

export function alertsIntroKeyboard(): InlineKeyboardMarkup {
  return createKeyboard([
    [{ text: '✅ Да, настроить алерты', data: CB.ALERTS_YES }],
    [{ text: '❌ Нет, только отчёты', data: CB.ALERTS_NO }],
    [{ text: '◀️ Назад', data: CB.BACK }],
  ]);
}

export function alertsSelectMessage(selectedRules: string[]): string {
  const rules = [
    { id: 'cost_50', label: 'Рост расхода > 50% за день' },
    { id: 'clicks_30', label: 'Падение кликов > 30%' },
    { id: 'ctr_20', label: 'Падение CTR > 20%' },
    { id: 'cpc_30', label: 'Рост CPC > 30%' },
    { id: 'conv_30', label: 'Падение конверсий > 30%' },
    { id: 'cpa_50', label: 'Рост CPA > 50%' },
  ];

  const list = rules
    .map((r) => {
      const checked = selectedRules.includes(r.id) ? '☑' : '☐';
      return `${checked} ${r.label}`;
    })
    .join('\n');

  return buildMessage(
    'Выберите условия для алертов:',
    list,
    `${divider}
Алерты проверяются ежедневно
и отправляются максимум 1 раз
в 24 часа по каждому условию.
${divider}`
  );
}

export function alertsSelectKeyboard(selectedRules: string[]): InlineKeyboardMarkup {
  const check = (id: string) => (selectedRules.includes(id) ? '☑️' : '☐');

  return createKeyboard([
    [{ text: `${check('cost_50')} Расход +50%`, data: `${CB.ALERT_TOGGLE}cost_50` }],
    [{ text: `${check('clicks_30')} Клики -30%`, data: `${CB.ALERT_TOGGLE}clicks_30` }],
    [{ text: `${check('ctr_20')} CTR -20%`, data: `${CB.ALERT_TOGGLE}ctr_20` }],
    [{ text: `${check('cpa_50')} CPA +50%`, data: `${CB.ALERT_TOGGLE}cpa_50` }],
    [{ text: 'Продолжить ▸', data: CB.ALERTS_DONE }],
    [{ text: '📝 Написать в поддержку', url: supportLink('feature_alerts') }],
    [{ text: '◀️ Назад', data: CB.BACK }],
  ]);
}

// ═══════════════════════════════════════════
// STEP 7: CONFIRMATION
// ═══════════════════════════════════════════

export function confirmationMessage(data: StateData): string {
  const campaignsText =
    data.campaignMode === 'all'
      ? 'Все кампании'
      : `${(data.selectedCampaignIds || []).length} выбрано`;

  const metricsText = data.selectedMetrics
    ? formatSelectedMetrics(data.selectedMetrics)
    : 'не выбраны';

  const scheduleText = formatSchedule(data);
  const alertsText = data.alertsEnabled ? `${(data.alertRules || []).length} правил` : 'Выключены';

  return buildMessage(
    h1('ШАГ 7 ИЗ 7: ПОДТВЕРЖДЕНИЕ'),
    'Проверьте настройки:',
    `${h2('АККАУНТ')}
  Логин: ${data.login}`,
    `${h2('КАМПАНИИ')}
  ${campaignsText}`,
    `${h2('ПОКАЗАТЕЛИ')}
  ${metricsText}`,
    `${h2('РАСПИСАНИЕ')}
  Период: ${formatPeriod(data.comparePeriod)}
  ${scheduleText}`,
    `${h2('АЛЕРТЫ')}
  ${alertsText}`,
    `${divider}
Всё верно?`
  );
}

function formatSelectedMetrics(m: MetricFlags): string {
  const names: string[] = [];
  if (m.impressions) names.push('Показы');
  if (m.clicks) names.push('Клики');
  if (m.ctr) names.push('CTR');
  if (m.cost) names.push('Расход');
  if (m.avgCpc) names.push('CPC');
  if (m.conversions) names.push('Конверсии');
  if (m.costPerConversion) names.push('CPA');
  return names.join(', ');
}

function formatSchedule(data: StateData): string {
  const freq =
    data.frequency === 'daily'
      ? 'Ежедневно'
      : data.frequency === 'weekly'
        ? 'Еженедельно'
        : 'Ежемесячно';
  const tz = (data.timezone || 180) / 60;
  const tzStr = `UTC${tz >= 0 ? '+' : ''}${tz}`;
  return `${freq} в ${data.time} (${tzStr})`;
}

function formatPeriod(period?: string): string {
  switch (period) {
    case 'day':
      return 'Вчера vs Позавчера';
    case 'week':
      return 'Неделя vs Пред. неделя';
    case 'month':
      return 'Месяц vs Пред. месяц';
    default:
      return 'Не выбран';
  }
}

export function confirmationKeyboard(): InlineKeyboardMarkup {
  return createKeyboard([
    [{ text: '✅ Подтвердить', data: CB.CONFIRM }],
    [{ text: '✏️ Изменить настройки', data: CB.EDIT }],
  ]);
}

// ═══════════════════════════════════════════
// MAIN MENU
// ═══════════════════════════════════════════

export function mainMenuMessage(settings: DirectSettings): string {
  const nextReport = 'завтра в ' + settings.schedule.time;

  return buildMessage(
    h1('СВОДКА.РЕКЛАМА'),
    `Бот настроен и работает! ✓

Аккаунт: ${settings.login}
Отчёты: ежедневно в ${settings.schedule.time}

Следующий отчёт: ${nextReport}`
  );
}

export function mainMenuKeyboard(dashboardUrl?: string): InlineKeyboardMarkup {
  const rows = [
    [{ text: '📊 Отчёт сейчас', data: CB.REPORT_NOW }],
    ...(dashboardUrl ? [[{ text: '📈 Открыть дашборд', url: dashboardUrl }]] : []),
    [{ text: '⚙️ Настройки', data: CB.SETTINGS }],
    [{ text: '❓ Помощь', url: supportLink('help_main') }],
  ];

  return createKeyboard(rows);
}

// ═══════════════════════════════════════════
// ERROR MESSAGES
// ═══════════════════════════════════════════

export function errorMessage(text: string): string {
  return `❌ ${text}`;
}

export function successMessage(text: string): string {
  return `✅ ${text}`;
}

export function tokenExpiredMessage(): string {
  return buildMessage(
    '⚠️ Токен Яндекс.Директа истёк, обновите доступ за 30 секунд.',
    'После обновления отчёты будут приходить как обычно.'
  );
}

export function tokenExpiredKeyboard(): InlineKeyboardMarkup {
  return createKeyboard([
    [{ text: '🔄 Обновить доступ за 30 секунд', data: `${CB.EDIT_STEP}awaiting_token` }],
  ]);
}
