// Main handler for Direct bot

import type { Env, TelegramUpdate, Chat, User, DirectState } from '../../env';
import type { StorageAdapter } from '../../shared/db';
import {
  sendMessage,
  editMessage,
  answerCallback,
  createForumTopic,
  BotTopicColors,
} from '../../shared/telegram';
import { encryptToken, decryptToken } from '../../shared/crypto';
import {
  transition,
  parseStateData,
  buildSettings,
  DEFAULT_METRICS,
  type StateData,
  type Action,
  type AlertRule,
} from './states';
import { validateTokenAndLogin, getCampaigns } from './api';
import * as msg from './messages';
import { fetchAndFormatReport } from './reports';

// ═══════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════

export async function handleDirectUpdate(
  update: TelegramUpdate,
  env: Env,
  storage: StorageAdapter
): Promise<void> {
  const token = env.TELEGRAM_BOT_TOKEN_DIRECT;

  if (update.callback_query) {
    await handleCallback(update.callback_query, env, storage, token);
    return;
  }

  if (update.message) {
    await handleMessage(update.message, env, storage, token);
    return;
  }
}

// ═══════════════════════════════════════════
// MESSAGE HANDLER
// ═══════════════════════════════════════════

async function handleMessage(
  message: NonNullable<TelegramUpdate['message']>,
  env: Env,
  storage: StorageAdapter,
  token: string
): Promise<void> {
  const from = message.from;
  if (!from) return;

  const chatId = message.chat.id;
  const text = message.text || '';

  const user = await storage.getOrCreateUser({
    telegram_id: from.id,
    telegram_username: from.username,
    first_name: from.first_name,
    last_name: from.last_name,
    language_code: from.language_code,
  });

  const chat = await storage.getOrCreateChat(user, 'direct', chatId);

  // Handle /start
  if (text.startsWith('/start')) {
    await handleStart(chat, user, env, storage, token);
    return;
  }

  const state = chat.state as DirectState;
  const stateData = parseStateData(chat.state_data);

  // Handle token input
  if (state === 'awaiting_token' && !stateData.token && text.length > 20) {
    await handleTokenInput(chat, user, text.trim(), env, storage, token);
    return;
  }

  // Handle login input
  if (state === 'awaiting_token' && stateData.token && text.length > 2 && text.length < 50) {
    await handleLoginInput(chat, user, text.trim(), env, storage, token);
    return;
  }
}

// ═══════════════════════════════════════════
// CALLBACK HANDLER
// ═══════════════════════════════════════════

async function handleCallback(
  query: NonNullable<TelegramUpdate['callback_query']>,
  env: Env,
  storage: StorageAdapter,
  token: string
): Promise<void> {
  const from = query.from;
  const data = query.data || '';
  const message = query.message;

  if (!message) {
    await answerCallback(token, query.id);
    return;
  }

  const chatId = message.chat.id;
  const messageId = message.message_id;

  const user = await storage.getUser(from.id);
  if (!user) {
    await answerCallback(token, query.id, 'Ошибка. Нажмите /start');
    return;
  }

  const chat = await storage.getChat('direct', from.id);
  if (!chat) {
    await answerCallback(token, query.id, 'Ошибка. Нажмите /start');
    return;
  }

  const stateData = parseStateData(chat.state_data);

  await answerCallback(token, query.id);

  await routeCallback(data, chat, user, stateData, chatId, messageId, env, storage, token);
}

// ═══════════════════════════════════════════
// CALLBACK ROUTING
// ═══════════════════════════════════════════

async function routeCallback(
  data: string,
  chat: Chat,
  user: User,
  stateData: StateData,
  chatId: number,
  messageId: number,
  env: Env,
  storage: StorageAdapter,
  token: string
): Promise<void> {
  const CB = msg.CB;

  if (data === 'noop') return;

  if (data === CB.START_SETUP) {
    await processAction(chat, stateData, { type: 'START_SETUP' }, chatId, messageId, env, storage, token);
    return;
  }

  if (data === CB.BACK) {
    await processAction(chat, stateData, { type: 'BACK' }, chatId, messageId, env, storage, token);
    return;
  }

  // Campaign mode
  if (data === CB.CAMPAIGN_ALL) {
    await processAction(chat, stateData, { type: 'CAMPAIGN_MODE_SELECTED', mode: 'all' }, chatId, messageId, env, storage, token);
    return;
  }

  if (data === CB.CAMPAIGN_SELECTED) {
    stateData.campaignMode = 'selected';
    stateData.selectedCampaignIds = [];
    await storage.updateChatState(chat.id, chat.state, stateData);

    const campaigns = stateData.campaigns || [];
    await editMessage(
      token,
      chatId,
      messageId,
      msg.campaignsSelectMessage(campaigns as any, []),
      { keyboard: msg.campaignsSelectKeyboard(campaigns as any, []) }
    );
    return;
  }

  // Campaign toggle
  if (data.startsWith(CB.CAMPAIGN_TOGGLE)) {
    const campId = parseInt(data.replace(CB.CAMPAIGN_TOGGLE, ''), 10);
    const selected = stateData.selectedCampaignIds || [];
    const isSelected = selected.includes(campId);

    if (isSelected) {
      stateData.selectedCampaignIds = selected.filter((id) => id !== campId);
    } else {
      stateData.selectedCampaignIds = [...selected, campId];
    }

    await storage.updateChatState(chat.id, chat.state, stateData);
    await editMessage(
      token,
      chatId,
      messageId,
      msg.campaignsSelectMessage(stateData.campaigns as any || [], stateData.selectedCampaignIds),
      { keyboard: msg.campaignsSelectKeyboard(stateData.campaigns as any || [], stateData.selectedCampaignIds) }
    );
    return;
  }

  if (data === CB.CAMPAIGNS_DONE) {
    await editMessage(token, chatId, messageId, msg.groupingMessage(), { keyboard: msg.groupingKeyboard() });
    return;
  }

  // Grouping
  if (data.startsWith(CB.GROUPING)) {
    const grouping = data.replace(CB.GROUPING, '') as 'total' | 'separate' | 'both';
    await processAction(chat, stateData, { type: 'CAMPAIGN_GROUPING_SELECTED', grouping }, chatId, messageId, env, storage, token);
    return;
  }

  // Metrics
  if (data.startsWith(CB.METRIC_TOGGLE)) {
    const metricKey = data.replace(CB.METRIC_TOGGLE, '') as keyof typeof DEFAULT_METRICS;
    const metrics = stateData.selectedMetrics || { ...DEFAULT_METRICS };
    metrics[metricKey] = !metrics[metricKey];
    stateData.selectedMetrics = metrics;
    await storage.updateChatState(chat.id, chat.state, stateData);
    await editMessage(token, chatId, messageId, msg.metricsMessage(metrics), { keyboard: msg.metricsKeyboard(metrics) });
    return;
  }

  if (data === CB.METRICS_DONE) {
    await processAction(chat, stateData, { type: 'METRICS_SELECTED', metrics: stateData.selectedMetrics || DEFAULT_METRICS }, chatId, messageId, env, storage, token);
    return;
  }

  // Period
  if (data.startsWith(CB.PERIOD)) {
    const period = data.replace(CB.PERIOD, '') as 'day' | 'week' | 'month';
    stateData.comparePeriod = period;
    await storage.updateChatState(chat.id, chat.state, stateData);
    await editMessage(token, chatId, messageId, msg.frequencyMessage(), { keyboard: msg.frequencyKeyboard() });
    return;
  }

  // Frequency
  if (data === CB.FREQ_DAILY || data === CB.FREQ_WEEKLY || data === CB.FREQ_MONTHLY) {
    const frequency = data.replace('freq:', '') as 'daily' | 'weekly' | 'monthly';
    stateData.frequency = frequency;
    await storage.updateChatState(chat.id, chat.state, stateData);
    await editMessage(token, chatId, messageId, msg.timeMessage(), { keyboard: msg.timeKeyboard() });
    return;
  }

  // Time
  if (data.startsWith(CB.TIME)) {
    const time = data.replace(CB.TIME, '');
    stateData.time = time;
    await storage.updateChatState(chat.id, chat.state, stateData);
    await editMessage(token, chatId, messageId, 'Укажите часовой пояс:', { keyboard: msg.timezoneKeyboard() });
    return;
  }

  // Timezone
  if (data.startsWith(CB.TIMEZONE)) {
    const timezone = parseInt(data.replace(CB.TIMEZONE, ''), 10);
    await processAction(chat, stateData, { type: 'TIMEZONE_SELECTED', timezone }, chatId, messageId, env, storage, token);
    return;
  }

  // Alerts
  if (data === CB.ALERTS_YES) {
    stateData.alertsEnabled = true;
    stateData.alertRules = [];
    await storage.updateChatState(chat.id, chat.state, stateData);
    await editMessage(token, chatId, messageId, msg.alertsSelectMessage([]), { keyboard: msg.alertsSelectKeyboard([]) });
    return;
  }

  if (data === CB.ALERTS_NO) {
    await processAction(chat, stateData, { type: 'ALERTS_ENABLED', enabled: false }, chatId, messageId, env, storage, token);
    return;
  }

  if (data.startsWith(CB.ALERT_TOGGLE)) {
    const ruleId = data.replace(CB.ALERT_TOGGLE, '');
    const rules = stateData.alertRules || [];
    const ruleIds = rules.map(ruleToId);
    const isSelected = ruleIds.includes(ruleId);

    if (isSelected) {
      stateData.alertRules = rules.filter((r) => ruleToId(r) !== ruleId);
    } else {
      const newRule = idToRule(ruleId);
      if (newRule) stateData.alertRules = [...rules, newRule];
    }
    await storage.updateChatState(chat.id, chat.state, stateData);
    await editMessage(
      token,
      chatId,
      messageId,
      msg.alertsSelectMessage((stateData.alertRules || []).map(ruleToId)),
      { keyboard: msg.alertsSelectKeyboard((stateData.alertRules || []).map(ruleToId)) }
    );
    return;
  }

  if (data === CB.ALERTS_DONE) {
    await processAction(chat, stateData, { type: 'ALERT_RULES_SELECTED', rules: stateData.alertRules || [] }, chatId, messageId, env, storage, token);
    return;
  }

  // Confirm
  if (data === CB.CONFIRM) {
    await handleConfirm(chat, user, stateData, chatId, messageId, env, storage, token);
    return;
  }

  // Report now
  if (data === CB.REPORT_NOW) {
    await editMessage(token, chatId, messageId, '⏳ Загрузка отчёта...');
    const reportText = await fetchAndFormatReport(user.id, env, storage);
    await editMessage(token, chatId, messageId, reportText, { keyboard: msg.mainMenuKeyboard() });
    return;
  }

  // Settings
  if (data === CB.SETTINGS) {
    // TODO: Settings menu
    return;
  }
}

// ═══════════════════════════════════════════
// STATE TRANSITIONS
// ═══════════════════════════════════════════

async function processAction(
  chat: Chat,
  stateData: StateData,
  action: Action,
  chatId: number,
  messageId: number,
  env: Env,
  storage: StorageAdapter,
  token: string
): Promise<void> {
  const currentState = chat.state as DirectState;
  const result = transition(currentState, stateData, action);

  await storage.updateChatState(chat.id, result.nextState, result.data);
  chat.state = result.nextState;
  chat.state_data = JSON.stringify(result.data);

  await sendStateScreen(result.nextState, result.data, chatId, messageId, env, storage, token);
}

async function sendStateScreen(
  state: DirectState,
  data: StateData,
  chatId: number,
  messageId: number,
  env: Env,
  storage: StorageAdapter,
  token: string
): Promise<void> {
  const oauthUrl = `https://oauth.yandex.ru/authorize?response_type=token&client_id=${env.YANDEX_DIRECT_CLIENT_ID}`;

  switch (state) {
    case 'idle':
      await editMessage(token, chatId, messageId, msg.welcomeMessage(), { keyboard: msg.welcomeKeyboard() });
      break;

    case 'awaiting_token':
      if (data.token) {
        await editMessage(token, chatId, messageId, msg.loginMessage(), { keyboard: msg.loginKeyboard() });
      } else {
        await editMessage(token, chatId, messageId, msg.tokenMessage(oauthUrl), { keyboard: msg.tokenKeyboard(oauthUrl) });
      }
      break;

    case 'selecting_campaigns':
      await editMessage(token, chatId, messageId, msg.campaignsIntroMessage(data.login || ''), { keyboard: msg.campaignsIntroKeyboard() });
      break;

    case 'selecting_metrics':
      const metrics = data.selectedMetrics || DEFAULT_METRICS;
      await editMessage(token, chatId, messageId, msg.metricsMessage(metrics), { keyboard: msg.metricsKeyboard(metrics) });
      break;

    case 'selecting_schedule':
      if (!data.comparePeriod) {
        await editMessage(token, chatId, messageId, msg.periodMessage(), { keyboard: msg.periodKeyboard() });
      } else if (!data.frequency) {
        await editMessage(token, chatId, messageId, msg.frequencyMessage(), { keyboard: msg.frequencyKeyboard() });
      } else if (!data.time) {
        await editMessage(token, chatId, messageId, msg.timeMessage(), { keyboard: msg.timeKeyboard() });
      }
      break;

    case 'selecting_alerts':
      if (data.alertsEnabled === undefined) {
        await editMessage(token, chatId, messageId, msg.alertsIntroMessage(), { keyboard: msg.alertsIntroKeyboard() });
      }
      break;

    case 'confirmation':
      await editMessage(token, chatId, messageId, msg.confirmationMessage(data), { keyboard: msg.confirmationKeyboard() });
      break;
  }
}

// ═══════════════════════════════════════════
// SPECIFIC HANDLERS
// ═══════════════════════════════════════════

async function handleStart(
  chat: Chat,
  user: User,
  env: Env,
  storage: StorageAdapter,
  token: string
): Promise<void> {
  const chatId = chat.telegram_chat_id;

  // Create admin topic
  if (!chat.admin_topic_id) {
    try {
      const topicResult = await createForumTopic(
        token,
        env.DIRECT_ADMIN_GROUP_ID,
        `⏳ @${user.telegram_username || 'id:' + user.telegram_id} | ${user.telegram_id} | (настройка)`,
        BotTopicColors.direct
      );
      if (topicResult.ok && topicResult.result) {
        await storage.updateChatTopicId(chat.id, topicResult.result.message_thread_id);
      }
    } catch (e) {
      console.error('Failed to create admin topic:', e);
    }
  }

  const settings = await storage.getSettings(user.id, 'direct');
  if (settings && chat.state === 'active') {
    await sendMessage(token, chatId, msg.mainMenuMessage(settings), { keyboard: msg.mainMenuKeyboard() });
    return;
  }

  await sendMessage(token, chatId, msg.welcomeMessage(), { keyboard: msg.welcomeKeyboard() });
}

async function handleTokenInput(
  chat: Chat,
  user: User,
  tokenValue: string,
  env: Env,
  storage: StorageAdapter,
  token: string
): Promise<void> {
  const chatId = chat.telegram_chat_id;
  const stateData = parseStateData(chat.state_data);

  // Save token temporarily, await login
  stateData.token = tokenValue;
  await storage.updateChatState(chat.id, 'awaiting_token', stateData);

  await sendMessage(token, chatId, msg.loginMessage(), { keyboard: msg.loginKeyboard() });
}

async function handleLoginInput(
  chat: Chat,
  user: User,
  login: string,
  env: Env,
  storage: StorageAdapter,
  token: string
): Promise<void> {
  const chatId = chat.telegram_chat_id;
  const stateData = parseStateData(chat.state_data);

  if (!stateData.token) {
    await sendMessage(token, chatId, msg.errorMessage('Токен не найден. Начните заново.'));
    return;
  }

  // Validate token + login
  const result = await validateTokenAndLogin(stateData.token, login);

  if (!result.ok || !result.data) {
    await sendMessage(token, chatId, msg.errorMessage('Неверный токен или логин. Проверьте данные.'));
    return;
  }

  // Save encrypted token
  const encrypted = await encryptToken(stateData.token, env.ENCRYPTION_KEY);
  await storage.saveToken(user.id, 'direct', encrypted);

  // Update state
  stateData.login = login;
  stateData.campaigns = result.data.map((c) => ({
    id: c.Id,
    name: c.Name,
    status: c.State,
  }));

  const transitionResult = transition('awaiting_token' as DirectState, stateData, { type: 'LOGIN_RECEIVED', login });
  await storage.updateChatState(chat.id, transitionResult.nextState, transitionResult.data);

  await sendMessage(
    token,
    chatId,
    msg.campaignsIntroMessage(login),
    { keyboard: msg.campaignsIntroKeyboard() }
  );
}

async function handleConfirm(
  chat: Chat,
  user: User,
  stateData: StateData,
  chatId: number,
  messageId: number,
  env: Env,
  storage: StorageAdapter,
  token: string
): Promise<void> {
  const settings = buildSettings(stateData);
  if (!settings) {
    await editMessage(token, chatId, messageId, msg.errorMessage('Не все настройки заполнены'));
    return;
  }

  await storage.saveSettings(user.id, 'direct', settings);
  await storage.updateChatState(chat.id, 'active', {});

  await editMessage(token, chatId, messageId, msg.mainMenuMessage(settings), { keyboard: msg.mainMenuKeyboard() });
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

function ruleToId(rule: AlertRule): string {
  return `${rule.metric}_${rule.threshold}`;
}

function idToRule(id: string): AlertRule | null {
  const map: Record<string, AlertRule> = {
    cost_50: { metric: 'cost', condition: 'rise', threshold: 50 },
    clicks_30: { metric: 'clicks', condition: 'drop', threshold: 30 },
    ctr_20: { metric: 'ctr', condition: 'drop', threshold: 20 },
    cpa_50: { metric: 'costPerConversion', condition: 'rise', threshold: 50 },
  };
  return map[id] || null;
}
