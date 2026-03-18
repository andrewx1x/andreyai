// Messages and keyboards for Metrika bot

import { createKeyboard, createColumnKeyboard } from '../../shared/telegram';
import { h1, h2, divider, buildMessage } from '../../shared/format';
import type { InlineKeyboardMarkup, MetrikaSettings } from '../../env';
import type { StateData, MetricFlags } from './states';
import type { MetrikaCounter, MetrikaGoal } from './api';

// ═══════════════════════════════════════════
// CALLBACK DATA PREFIXES
// ═══════════════════════════════════════════

export const CB = {
  START_SETUP: 'setup',
  HELP: 'help',
  BACK: 'back',
  COUNTER: 'counter:',
  GOAL_TOGGLE: 'goal:',
  GOAL_DONE: 'goals_done',
  PRIMARY_GOAL: 'primary:',
  METRIC_TOGGLE: 'metric:',
  METRICS_DONE: 'metrics_done',
  METRICS_INFO: 'metrics_info',
  FREQ_DAILY: 'freq:daily',
  FREQ_WEEKLY: 'freq:weekly',
  TIME: 'time:',
  TIME_DONE: 'time_done',
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
  SETTINGS: 'settings',
  DELETE_DATA: 'delete_data',
  DISABLE_REPORTS: 'disable_reports',
} as const;

// Support bot deep-links
const SUPPORT_BASE = 'https://t.me/PulseAssist_bot?start=';

function supportLink(context: string): string {
  return `${SUPPORT_BASE}metrika_${context}`;
}

// ═══════════════════════════════════════════
// WELCOME SCREEN
// ═══════════════════════════════════════════

export function welcomeMessage(): string {
  return buildMessage(
    h1('СВОДКА.ТРАФИК'),
    `Ежедневные отчёты по вашему сайту
в Telegram. Трафик, цели и алерты
при проблемах — без входа в Метрику.

Что умеет бот:
• Ежедневные/еженедельные отчёты
• Сравнение со средним за 7 дней
• Алерты при резких изменениях
• Выбор нужных показателей`,
    `${divider}
⚠️ Для работы нужен аккаунт Яндекса
   с доступом к счётчику Яндекс.Метрики

🔒 Доступ только на чтение (OAuth).
   Сервис работает с данными вашего
   аккаунта по вашему поручению.
   Мы не храним и не передаём данные
   третьим лицам.
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
// STEP 1: TOKEN
// ═══════════════════════════════════════════

export function tokenMessage(oauthUrl: string): string {
  return buildMessage(
    h1('ШАГ 1 ИЗ 7: ТОКЕН'),
    `Для подключения нужен код доступа
Яндекс Метрики (только чтение).

📋 ИНСТРУКЦИЯ:

1. Нажмите кнопку "Получить токен"
2. Войдите в аккаунт Яндекса
3. Разрешите доступ приложению
4. Скопируйте токен из адресной строки
   (после access_token=)
5. Вставьте токен сюда`,
    `${divider}
🔒 БЕЗОПАСНОСТЬ:
• Токен даёт доступ ТОЛЬКО на чтение
• Изменить настройки счётчика нельзя
• Токен хранится в зашифрованном виде
• Вы можете удалить токен в любой момент
${divider}`
  );
}

export function tokenKeyboard(oauthUrl: string): InlineKeyboardMarkup {
  return createKeyboard([
    [{ text: '🔑 Получить токен', url: oauthUrl }],
    [
      { text: '❓ Помощь', url: supportLink('help_token') },
      { text: '◀️ Назад', data: CB.BACK },
    ],
  ]);
}

export function tokenInvalidMessage(): string {
  return `❌ Токен недействителен.

Проверьте, что вы скопировали
токен полностью (после access_token=
и до символа &).

Попробуйте ещё раз.`;
}

export function tokenAcceptedMessage(): string {
  return '✅ Токен принят!';
}

// ═══════════════════════════════════════════
// STEP 2: COUNTER SELECTION
// ═══════════════════════════════════════════

export function counterMessage(counters: MetrikaCounter[]): string {
  const list = counters
    .map((c, i) => `${i + 1}. ${c.site}\n   ID: ${c.id}`)
    .join('\n\n');

  return buildMessage(
    h1('ШАГ 2 ИЗ 7: СЧЁТЧИК'),
    'Токен принят! ✓\n\nВыберите счётчик для отчётов:',
    list
  );
}

export function counterKeyboard(counters: MetrikaCounter[]): InlineKeyboardMarkup {
  const buttons = counters.map((c) => [
    { text: c.site, data: `${CB.COUNTER}${c.id}` },
  ]);
  buttons.push([{ text: '◀️ Назад', data: CB.BACK }]);
  return createKeyboard(buttons);
}

export function noCountersMessage(): string {
  return `⚠️ У вас нет доступных счётчиков.

Убедитесь, что:
1. На вашем аккаунте есть счётчики
2. Вы авторизовались под нужным аккаунтом

Попробуйте получить новый токен.`;
}

// ═══════════════════════════════════════════
// STEP 3: GOALS SELECTION
// ═══════════════════════════════════════════

export function goalsMessage(
  counterName: string,
  goals: MetrikaGoal[],
  selectedIds: number[]
): string {
  const list = goals
    .map((g) => {
      const checked = selectedIds.includes(g.id) ? '☑' : '☐';
      return `${checked} ${g.name}`;
    })
    .join('\n');

  return buildMessage(
    h1('ШАГ 3 ИЗ 7: ЦЕЛИ'),
    `Счётчик: ${counterName} ✓

Выберите цели для отслеживания
(до 5 целей):`,
    list,
    `${divider}
Выбрано: ${selectedIds.length} из 5
${divider}

После выбора укажите ГЛАВНУЮ цель —
она будет в первой строке отчёта
и использоваться для алертов.`
  );
}

export function goalsKeyboard(
  goals: MetrikaGoal[],
  selectedIds: number[]
): InlineKeyboardMarkup {
  const buttons = goals.map((g) => {
    const checked = selectedIds.includes(g.id) ? '☑️' : '☐';
    return [{ text: `${checked} ${g.name}`, data: `${CB.GOAL_TOGGLE}${g.id}` }];
  });

  if (selectedIds.length > 0) {
    buttons.push([{ text: 'Выбрать ▸', data: CB.GOAL_DONE }]);
  }
  buttons.push([{ text: '◀️ Назад', data: CB.BACK }]);

  return createKeyboard(buttons);
}

export function primaryGoalMessage(goals: Array<{ id: number; name: string }>): string {
  return buildMessage(
    `Отлично! Выбрано ${goals.length} ${goals.length === 1 ? 'цель' : 'цели'}.`,
    `Какая цель ГЛАВНАЯ?
(для алертов и первой строки)`
  );
}

export function primaryGoalKeyboard(
  goals: Array<{ id: number; name: string }>
): InlineKeyboardMarkup {
  const buttons = goals.map((g) => [
    { text: `⭐ ${g.name}`, data: `${CB.PRIMARY_GOAL}${g.id}` },
  ]);
  return createKeyboard(buttons);
}

export function noGoalsMessage(): string {
  return `⚠️ У этого счётчика нет настроенных целей.

Цели нужно создать в настройках
Яндекс Метрики.

Хотите продолжить без целей?`;
}

// ═══════════════════════════════════════════
// STEP 4: METRICS SELECTION
// ═══════════════════════════════════════════

export function metricsMessage(metrics: MetricFlags): string {
  const check = (v: boolean) => (v ? '☑' : '☐');

  return buildMessage(
    h1('ШАГ 4 ИЗ 7: ПОКАЗАТЕЛИ'),
    `Какие показатели включить в отчёт?`,
    `${h2('БАЗОВЫЕ МЕТРИКИ')}
${check(metrics.visits)} Визиты
${check(metrics.users)} Уникальные посетители
${check(metrics.pageviews)} Просмотры страниц
${check(metrics.bounceRate)} Отказы (%)
${check(metrics.pageDepth)} Глубина просмотра
${check(metrics.avgDuration)} Время на сайте`,
    `${h2('ЦЕЛИ И КОНВЕРСИИ')}
${check(metrics.goals)} Достижения целей
${check(metrics.conversionRate)} Конверсия (%)`,
    `${h2('ИСТОЧНИКИ (топ-5)')}
${check(metrics.sources)} Источники трафика`,
    `${h2('СТРАНИЦЫ (топ-5)')}
${check(metrics.topPages)} Популярные страницы`,
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
      { text: `${check(metrics.visits)} Визиты`, data: `${CB.METRIC_TOGGLE}visits` },
      { text: `${check(metrics.users)} Посетители`, data: `${CB.METRIC_TOGGLE}users` },
    ],
    [
      { text: `${check(metrics.bounceRate)} Отказы`, data: `${CB.METRIC_TOGGLE}bounceRate` },
      { text: `${check(metrics.pageDepth)} Глубина`, data: `${CB.METRIC_TOGGLE}pageDepth` },
    ],
    [
      { text: `${check(metrics.avgDuration)} Время`, data: `${CB.METRIC_TOGGLE}avgDuration` },
      { text: `${check(metrics.pageviews)} Просмотры`, data: `${CB.METRIC_TOGGLE}pageviews` },
    ],
    [
      { text: `${check(metrics.goals)} Цели`, data: `${CB.METRIC_TOGGLE}goals` },
      { text: `${check(metrics.conversionRate)} Конверсия`, data: `${CB.METRIC_TOGGLE}conversionRate` },
    ],
    [{ text: `${check(metrics.sources)} Источники`, data: `${CB.METRIC_TOGGLE}sources` }],
    [{ text: 'ℹ️ Пояснение показателей', data: CB.METRICS_INFO }],
    [{ text: 'Продолжить ▸', data: CB.METRICS_DONE }],
    [{ text: '◀️ Назад', data: CB.BACK }],
  ]);
}

export function metricsInfoMessage(): string {
  return buildMessage(
    h1('ПОЯСНЕНИЕ ПОКАЗАТЕЛЕЙ'),
    `${h2('ВИЗИТЫ')}
Количество сессий на сайте.
Один человек = несколько визитов.
↗️ Рост = больше интереса к сайту`,
    `${h2('УНИКАЛЬНЫЕ ПОСЕТИТЕЛИ')}
Количество разных людей.
↗️ Рост = расширение аудитории`,
    `${h2('ОТКАЗЫ')}
% визитов < 15 сек без действий.
↘️ Снижение = контент интересен`,
    `${h2('ГЛУБИНА ПРОСМОТРА')}
Среднее число страниц за визит.
↗️ Рост = вовлечённость`,
    `${h2('ВРЕМЯ НА САЙТЕ')}
Средняя длительность визита.
↗️ Рост = интерес к контенту`,
    `${h2('КОНВЕРСИЯ')}
% визитов с достижением цели.
↗️ Рост = эффективность сайта`
  );
}

export function metricsInfoKeyboard(): InlineKeyboardMarkup {
  return createKeyboard([[{ text: '◀️ Назад к выбору', data: CB.BACK }]]);
}

// ═══════════════════════════════════════════
// STEP 5: SCHEDULE
// ═══════════════════════════════════════════

export function scheduleFrequencyMessage(): string {
  return buildMessage(
    h1('ШАГ 5 ИЗ 7: РАСПИСАНИЕ'),
    'Как часто присылать отчёты?'
  );
}

export function scheduleFrequencyKeyboard(): InlineKeyboardMarkup {
  return createKeyboard([
    [{ text: '📅 Ежедневно', data: CB.FREQ_DAILY }],
    [{ text: '📆 Еженедельно (по понедельникам)', data: CB.FREQ_WEEKLY }],
    [{ text: '◀️ Назад', data: CB.BACK }],
  ]);
}

export function scheduleTimeMessage(selectedTimes: string[] = []): string {
  const selected = selectedTimes.length > 0 ? selectedTimes.join(', ') : 'не выбрано';
  return buildMessage(
    'Выберите время отправки:',
    'Можно выбрать один или два слота (утро и вечер).',
    `Текущий выбор: ${selected}`
  );
}

export function scheduleTimeKeyboard(selectedTimes: string[] = []): InlineKeyboardMarkup {
  const check = (time: string) => (selectedTimes.includes(time) ? '☑️' : '☐');
  return createKeyboard([
    [
      { text: `${check('10:00')} 10:00`, data: `${CB.TIME}10:00` },
      { text: `${check('19:00')} 19:00`, data: `${CB.TIME}19:00` },
    ],
    [{ text: 'Продолжить ▸', data: CB.TIME_DONE }],
    [{ text: '◀️ Назад', data: CB.BACK }],
  ]);
}

export function scheduleTimezoneMessage(): string {
  return buildMessage(
    'Укажите часовой пояс:',
    'Текущий выбор: Москва (UTC+3)'
  );
}

export function scheduleTimezoneKeyboard(): InlineKeyboardMarkup {
  return createKeyboard([
    [{ text: '🇷🇺 Москва UTC+3', data: `${CB.TIMEZONE}180` }],
    [{ text: '🇷🇺 Калининград UTC+2', data: `${CB.TIMEZONE}120` }],
    [{ text: '🇷🇺 Екатеринбург UTC+5', data: `${CB.TIMEZONE}300` }],
    [{ text: '🇷🇺 Владивосток UTC+10', data: `${CB.TIMEZONE}600` }],
    [{ text: '◀️ Назад', data: CB.BACK }],
  ]);
}

export function scheduleWeekdayMessage(): string {
  return 'В какой день недели присылать?';
}

export function scheduleWeekdayKeyboard(): InlineKeyboardMarkup {
  return createKeyboard([
    [
      { text: 'Пн', data: `${CB.WEEKDAY}1` },
      { text: 'Вт', data: `${CB.WEEKDAY}2` },
      { text: 'Ср', data: `${CB.WEEKDAY}3` },
      { text: 'Чт', data: `${CB.WEEKDAY}4` },
    ],
    [
      { text: 'Пт', data: `${CB.WEEKDAY}5` },
      { text: 'Сб', data: `${CB.WEEKDAY}6` },
      { text: 'Вс', data: `${CB.WEEKDAY}0` },
    ],
    [{ text: '◀️ Назад', data: CB.BACK }],
  ]);
}

// ═══════════════════════════════════════════
// STEP 6: ALERTS
// ═══════════════════════════════════════════

export function alertsIntroMessage(): string {
  return buildMessage(
    h1('ШАГ 6 ИЗ 7: АЛЕРТЫ'),
    `Алерты — уведомления при резких
изменениях показателей.

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
    { id: 'visits_30', label: 'Падение визитов > 30%' },
    { id: 'visits_50', label: 'Падение визитов > 50%' },
    { id: 'goal_20', label: 'Падение главной цели > 20%' },
    { id: 'goal_50', label: 'Падение главной цели > 50%' },
    { id: 'bounce_20', label: 'Рост отказов > 20%' },
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
${divider}`,
    `💡 Нужны дополнительные
   типы отчётов или алертов?`
  );
}

export function alertsSelectKeyboard(selectedRules: string[]): InlineKeyboardMarkup {
  const check = (id: string) => (selectedRules.includes(id) ? '☑️' : '☐');

  return createKeyboard([
    [{ text: `${check('visits_30')} Визиты -30%`, data: `${CB.ALERT_TOGGLE}visits_30` }],
    [{ text: `${check('visits_50')} Визиты -50%`, data: `${CB.ALERT_TOGGLE}visits_50` }],
    [{ text: `${check('goal_20')} Цель -20%`, data: `${CB.ALERT_TOGGLE}goal_20` }],
    [{ text: `${check('goal_50')} Цель -50%`, data: `${CB.ALERT_TOGGLE}goal_50` }],
    [{ text: `${check('bounce_20')} Отказы +20%`, data: `${CB.ALERT_TOGGLE}bounce_20` }],
    [{ text: 'Продолжить ▸', data: CB.ALERTS_DONE }],
    [{ text: '📝 Написать в поддержку', url: supportLink('feature_reports') }],
    [{ text: '◀️ Назад', data: CB.BACK }],
  ]);
}

// ═══════════════════════════════════════════
// STEP 7: CONFIRMATION
// ═══════════════════════════════════════════

export function confirmationMessage(data: StateData): string {
  const goals = data.selectedGoals || [];
  const primaryGoal = goals.find((g) => g.id === data.primaryGoalId);

  const goalsText = goals
    .map((g) => {
      const star = g.id === data.primaryGoalId ? '⭐ ' : '• ';
      const label = g.id === data.primaryGoalId ? ' (главная)' : '';
      return `${star}${g.name}${label}`;
    })
    .join('\n  ');

  const metricsText = data.selectedMetrics
    ? formatSelectedMetrics(data.selectedMetrics)
    : 'не выбраны';

  const scheduleText = formatSchedule(data);
  const alertsText = data.alertsEnabled ? formatAlerts(data) : 'Выключены';

  return buildMessage(
    h1('ШАГ 7 ИЗ 7: ПОДТВЕРЖДЕНИЕ'),
    'Проверьте настройки:',
    `${h2('СЧЁТЧИК')}
  ${data.selectedCounter?.name} (ID: ${data.selectedCounter?.id})`,
    `${h2(`ЦЕЛИ (${goals.length})`)}
  ${goalsText}`,
    `${h2('ПОКАЗАТЕЛИ')}
  ${metricsText}`,
    `${h2('РАСПИСАНИЕ')}
  ${scheduleText}`,
    `${h2('АЛЕРТЫ')}
  ${alertsText}`,
    `${divider}
Всё верно?`
  );
}

function formatSelectedMetrics(m: MetricFlags): string {
  const names: string[] = [];
  if (m.visits) names.push('Визиты');
  if (m.users) names.push('Посетители');
  if (m.bounceRate) names.push('Отказы');
  if (m.pageDepth) names.push('Глубина');
  if (m.avgDuration) names.push('Время');
  if (m.pageviews) names.push('Просмотры');
  if (m.goals) names.push('Цели');
  if (m.conversionRate) names.push('Конверсия');
  if (m.sources) names.push('Источники трафика');
  return names.join(', ');
}

function formatSchedule(data: StateData): string {
  const freq = data.frequency === 'daily' ? 'Ежедневно' : 'Еженедельно';
  const tz = (data.timezone || 180) / 60;
  const tzStr = `UTC${tz >= 0 ? '+' : ''}${tz}`;
  const legacyTime = (data as StateData & { time?: string }).time;
  const times = data.times && data.times.length > 0
    ? data.times.join(', ')
    : legacyTime || 'не выбрано';
  return `${freq} в ${times} (${tzStr})`;
}

function formatAlerts(data: StateData): string {
  const rules = data.alertRules || [];
  if (rules.length === 0) return 'Включены (без правил)';
  return rules.map((r) => `• ${formatAlertRule(r)}`).join('\n  ');
}

function formatAlertRule(rule: { metric: string; threshold: number }): string {
  switch (rule.metric) {
    case 'visits':
      return `Падение визитов > ${rule.threshold}%`;
    case 'primary_goal':
      return `Падение главной цели > ${rule.threshold}%`;
    case 'bounceRate':
      return `Рост отказов > ${rule.threshold}%`;
    default:
      return '';
  }
}

export function confirmationKeyboard(): InlineKeyboardMarkup {
  return createKeyboard([
    [{ text: '✅ Подтвердить', data: CB.CONFIRM }],
    [{ text: '✏️ Изменить настройки', data: CB.EDIT }],
  ]);
}

export function editMenuMessage(): string {
  return 'Что хотите изменить?';
}

export function editMenuKeyboard(): InlineKeyboardMarkup {
  return createKeyboard([
    [{ text: '1️⃣ Токен', data: `${CB.EDIT_STEP}awaiting_token` }],
    [{ text: '2️⃣ Счётчик', data: `${CB.EDIT_STEP}selecting_counter` }],
    [{ text: '3️⃣ Цели', data: `${CB.EDIT_STEP}selecting_goals` }],
    [{ text: '4️⃣ Показатели', data: `${CB.EDIT_STEP}selecting_metrics` }],
    [{ text: '5️⃣ Расписание', data: `${CB.EDIT_STEP}selecting_schedule` }],
    [{ text: '6️⃣ Алерты', data: `${CB.EDIT_STEP}selecting_alerts` }],
    [{ text: '◀️ Назад к подтверждению', data: CB.BACK }],
  ]);
}

// ═══════════════════════════════════════════
// MAIN MENU (after setup)
// ═══════════════════════════════════════════

export function mainMenuMessage(settings: MetrikaSettings): string {
  const scheduleTimes = getScheduleTimes(settings.schedule);
  const nextReport = 'завтра в ' + scheduleTimes.join(', ');

  return buildMessage(
    h1('СВОДКА.ТРАФИК'),
    `Бот настроен и работает! ✓

Счётчик: ${settings.counter_name}
Отчёты: ежедневно в ${scheduleTimes.join(', ')}

Следующий отчёт: ${nextReport}`
  );
}

export function mainMenuKeyboard(): InlineKeyboardMarkup {
  return createKeyboard([
    [{ text: '📊 Отчёт сейчас', data: CB.REPORT_NOW }],
    [{ text: '⚙️ Настройки', data: CB.SETTINGS }],
    [{ text: '❓ Помощь', url: supportLink('help_main') }],
  ]);
}

// ═══════════════════════════════════════════
// SETTINGS MENU
// ═══════════════════════════════════════════

export function settingsMessage(): string {
  return buildMessage(h1('НАСТРОЙКИ'), 'Текущие настройки бота:');
}

export function settingsKeyboard(): InlineKeyboardMarkup {
  return createKeyboard([
    [{ text: '🔑 Изменить токен', data: `${CB.EDIT_STEP}awaiting_token` }],
    [{ text: '📊 Изменить счётчик', data: `${CB.EDIT_STEP}selecting_counter` }],
    [{ text: '🎯 Изменить цели', data: `${CB.EDIT_STEP}selecting_goals` }],
    [{ text: '📈 Изменить показатели', data: `${CB.EDIT_STEP}selecting_metrics` }],
    [{ text: '🕐 Изменить расписание', data: `${CB.EDIT_STEP}selecting_schedule` }],
    [{ text: '🔔 Изменить алерты', data: `${CB.EDIT_STEP}selecting_alerts` }],
    [{ text: divider, data: 'noop' }],
    [{ text: '🗑 Удалить токен и данные', data: CB.DELETE_DATA }],
    [{ text: '◀️ Назад в меню', data: CB.BACK }],
  ]);
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
    '⚠️ Токен истёк, обновите доступ за 30 секунд.',
    'После обновления отчёты будут приходить как обычно.'
  );
}

export function tokenExpiredKeyboard(): InlineKeyboardMarkup {
  return createKeyboard([
    [{ text: '🔄 Обновить доступ за 30 секунд', data: `${CB.EDIT_STEP}awaiting_token` }],
  ]);
}

function getScheduleTimes(schedule: MetrikaSettings['schedule']): string[] {
  if (schedule.times && schedule.times.length > 0) {
    return schedule.times;
  }
  return schedule.time ? [schedule.time] : ['10:00'];
}
