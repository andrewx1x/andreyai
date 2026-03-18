// Main handler for Metrika bot

import type { Env, TelegramUpdate, Chat, User, MetrikaState } from '../../env';
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
import {
  validateToken,
  getCounters,
  getGoals,
  type MetrikaCounter,
  type MetrikaGoal,
} from './api';
import * as msg from './messages';
import { fetchAndFormatReport } from './reports';

// ═══════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════

export async function handleMetrikaUpdate(
  update: TelegramUpdate,
  env: Env,
  storage: StorageAdapter
): Promise<void> {
  const token = env.TELEGRAM_BOT_TOKEN_METRIKA;

  // Handle callback queries
  if (update.callback_query) {
    await handleCallback(update.callback_query, env, storage, token);
    return;
  }

  // Handle messages
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

  // Get or create user and chat
  const user = await storage.getOrCreateUser({
    telegram_id: from.id,
    telegram_username: from.username,
    first_name: from.first_name,
    last_name: from.last_name,
    language_code: from.language_code,
  });

  const chat = await storage.getOrCreateChat(user, 'metrika', chatId);

  // Handle /start command
  if (text.startsWith('/start')) {
    await handleStart(chat, user, env, storage, token);
    return;
  }

  // Handle text input based on current state
  const state = chat.state as MetrikaState;
  const stateData = parseStateData(chat.state_data);

  if (state === 'awaiting_token' && text.length > 20) {
    await handleTokenInput(chat, user, text.trim(), env, storage, token);
    return;
  }

  // Unknown text - show current state screen
  await sendCurrentScreen(chat, stateData, env, storage, token);
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

  // Get user and chat
  const user = await storage.getUser(from.id);
  if (!user) {
    await answerCallback(token, query.id, 'Ошибка. Нажмите /start');
    return;
  }

  const chat = await storage.getChat('metrika', from.id);
  if (!chat) {
    await answerCallback(token, query.id, 'Ошибка. Нажмите /start');
    return;
  }

  const state = chat.state as MetrikaState;
  const stateData = parseStateData(chat.state_data);

  // Answer callback immediately
  await answerCallback(token, query.id);

  // Route by callback data
  await routeCallback(
    data,
    chat,
    user,
    stateData,
    chatId,
    messageId,
    env,
    storage,
    token
  );
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

  // Handle noop
  if (data === 'noop') return;

  // START SETUP
  if (data === CB.START_SETUP) {
    await processAction(chat, stateData, { type: 'START_SETUP' }, chatId, messageId, env, storage, token);
    return;
  }

  // BACK
  if (data === CB.BACK) {
    await processAction(chat, stateData, { type: 'BACK' }, chatId, messageId, env, storage, token);
    return;
  }

  // COUNTER SELECTION
  if (data.startsWith(CB.COUNTER)) {
    const counterId = parseInt(data.replace(CB.COUNTER, ''), 10);
    const counter = stateData.counters?.find((c) => c.id === counterId);
    if (counter) {
      // Load goals for this counter
      const encryptedToken = await storage.getToken(user.id, 'metrika');
      if (encryptedToken) {
        const decrypted = await decryptToken(encryptedToken, env.ENCRYPTION_KEY);
        const goalsResult = await getGoals(decrypted, counterId);
        if (goalsResult.ok && goalsResult.data) {
          stateData.goals = goalsResult.data.map((g) => ({ id: g.id, name: g.name }));
        }
      }

      await processAction(
        chat,
        stateData,
        { type: 'COUNTER_SELECTED', counter: { id: counter.id, name: counter.site } },
        chatId,
        messageId,
        env,
        storage,
        token
      );
    }
    return;
  }

  // GOAL TOGGLE
  if (data.startsWith(CB.GOAL_TOGGLE)) {
    const goalId = parseInt(data.replace(CB.GOAL_TOGGLE, ''), 10);
    const selected = stateData.selectedGoals || [];
    const isSelected = selected.some((g) => g.id === goalId);
    const goal = stateData.goals?.find((g) => g.id === goalId);

    if (goal) {
      if (isSelected) {
        stateData.selectedGoals = selected.filter((g) => g.id !== goalId);
      } else if (selected.length < 5) {
        stateData.selectedGoals = [...selected, goal];
      }
      // Update UI without state transition
      await storage.updateChatState(chat.id, chat.state, stateData);
      await editMessage(
        token,
        chatId,
        messageId,
        msg.goalsMessage(
          stateData.selectedCounter?.name || '',
          stateData.goals || [],
          (stateData.selectedGoals || []).map((g) => g.id)
        ),
        { keyboard: msg.goalsKeyboard(stateData.goals || [], (stateData.selectedGoals || []).map((g) => g.id)) }
      );
    }
    return;
  }

  // GOALS DONE
  if (data === CB.GOAL_DONE) {
    const selected = stateData.selectedGoals || [];
    if (selected.length > 0) {
      if (selected.length === 1) {
        // Auto-select as primary
        await processAction(
          chat,
          stateData,
          { type: 'GOALS_SELECTED', goals: selected },
          chatId,
          messageId,
          env,
          storage,
          token
        );
      } else {
        // Show primary goal selection
        await editMessage(
          token,
          chatId,
          messageId,
          msg.primaryGoalMessage(selected),
          { keyboard: msg.primaryGoalKeyboard(selected) }
        );
      }
    }
    return;
  }

  // PRIMARY GOAL
  if (data.startsWith(CB.PRIMARY_GOAL)) {
    const goalId = parseInt(data.replace(CB.PRIMARY_GOAL, ''), 10);
    stateData.selectedGoals = stateData.selectedGoals || [];
    await processAction(
      chat,
      stateData,
      { type: 'GOALS_SELECTED', goals: stateData.selectedGoals },
      chatId,
      messageId,
      env,
      storage,
      token
    );
    // Then set primary
    const newStateData = { ...stateData, primaryGoalId: goalId };
    await processAction(
      chat,
      newStateData,
      { type: 'PRIMARY_GOAL_SELECTED', goalId },
      chatId,
      messageId,
      env,
      storage,
      token
    );
    return;
  }

  // METRIC TOGGLE
  if (data.startsWith(CB.METRIC_TOGGLE)) {
    const metricKey = data.replace(CB.METRIC_TOGGLE, '') as keyof typeof DEFAULT_METRICS;
    const metrics = stateData.selectedMetrics || { ...DEFAULT_METRICS };
    metrics[metricKey] = !metrics[metricKey];
    stateData.selectedMetrics = metrics;
    await storage.updateChatState(chat.id, chat.state, stateData);
    await editMessage(
      token,
      chatId,
      messageId,
      msg.metricsMessage(metrics),
      { keyboard: msg.metricsKeyboard(metrics) }
    );
    return;
  }

  // METRICS DONE
  if (data === CB.METRICS_DONE) {
    await processAction(
      chat,
      stateData,
      { type: 'METRICS_SELECTED', metrics: stateData.selectedMetrics || DEFAULT_METRICS },
      chatId,
      messageId,
      env,
      storage,
      token
    );
    return;
  }

  // METRICS INFO
  if (data === CB.METRICS_INFO) {
    await editMessage(
      token,
      chatId,
      messageId,
      msg.metricsInfoMessage(),
      { keyboard: msg.metricsInfoKeyboard() }
    );
    return;
  }

  // FREQUENCY
  if (data === CB.FREQ_DAILY || data === CB.FREQ_WEEKLY) {
    const frequency = data === CB.FREQ_DAILY ? 'daily' : 'weekly';
    stateData.frequency = frequency;
    stateData.times = [];
    await storage.updateChatState(chat.id, chat.state, stateData);
    await editMessage(
      token,
      chatId,
      messageId,
      msg.scheduleTimeMessage(stateData.times),
      { keyboard: msg.scheduleTimeKeyboard(stateData.times) }
    );
    return;
  }

  // TIME
  if (data.startsWith(CB.TIME)) {
    const time = data.replace(CB.TIME, '');
    const selectedTimes = stateData.times || [];
    const isSelected = selectedTimes.includes(time);
    if (isSelected) {
      stateData.times = selectedTimes.filter((t) => t !== time);
    } else if (selectedTimes.length < 2) {
      stateData.times = [...selectedTimes, time].sort();
    }
    await storage.updateChatState(chat.id, chat.state, stateData);
    await editMessage(
      token,
      chatId,
      messageId,
      msg.scheduleTimeMessage(stateData.times || []),
      { keyboard: msg.scheduleTimeKeyboard(stateData.times || []) }
    );
    return;
  }

  // TIME DONE
  if (data === CB.TIME_DONE) {
    await processAction(
      chat,
      stateData,
      { type: 'TIME_SELECTED', times: stateData.times || [] },
      chatId,
      messageId,
      env,
      storage,
      token
    );
    return;
  }

  // TIMEZONE
  if (data.startsWith(CB.TIMEZONE)) {
    const timezone = parseInt(data.replace(CB.TIMEZONE, ''), 10);
    stateData.timezone = timezone;

    if (stateData.frequency === 'weekly') {
      await storage.updateChatState(chat.id, chat.state, stateData);
      await editMessage(
        token,
        chatId,
        messageId,
        msg.scheduleWeekdayMessage(),
        { keyboard: msg.scheduleWeekdayKeyboard() }
      );
    } else {
      await processAction(
        chat,
        stateData,
        { type: 'TIMEZONE_SELECTED', timezone },
        chatId,
        messageId,
        env,
        storage,
        token
      );
    }
    return;
  }

  // WEEKDAY
  if (data.startsWith(CB.WEEKDAY)) {
    const weekday = parseInt(data.replace(CB.WEEKDAY, ''), 10);
    await processAction(
      chat,
      { ...stateData, weekday },
      { type: 'WEEKDAY_SELECTED', weekday },
      chatId,
      messageId,
      env,
      storage,
      token
    );
    return;
  }

  // ALERTS
  if (data === CB.ALERTS_YES) {
    stateData.alertsEnabled = true;
    stateData.alertRules = [];
    await storage.updateChatState(chat.id, chat.state, stateData);
    await editMessage(
      token,
      chatId,
      messageId,
      msg.alertsSelectMessage([]),
      { keyboard: msg.alertsSelectKeyboard([]) }
    );
    return;
  }

  if (data === CB.ALERTS_NO) {
    await processAction(
      chat,
      stateData,
      { type: 'ALERTS_ENABLED', enabled: false },
      chatId,
      messageId,
      env,
      storage,
      token
    );
    return;
  }

  // ALERT TOGGLE
  if (data.startsWith(CB.ALERT_TOGGLE)) {
    const ruleId = data.replace(CB.ALERT_TOGGLE, '');
    const rules = stateData.alertRules || [];
    const ruleIds = rules.map(ruleToId);
    const isSelected = ruleIds.includes(ruleId);

    if (isSelected) {
      stateData.alertRules = rules.filter((r) => ruleToId(r) !== ruleId);
    } else {
      const newRule = idToRule(ruleId);
      if (newRule) {
        stateData.alertRules = [...rules, newRule];
      }
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

  // ALERTS DONE
  if (data === CB.ALERTS_DONE) {
    await processAction(
      chat,
      stateData,
      { type: 'ALERT_RULES_SELECTED', rules: stateData.alertRules || [] },
      chatId,
      messageId,
      env,
      storage,
      token
    );
    return;
  }

  // CONFIRM
  if (data === CB.CONFIRM) {
    await handleConfirm(chat, user, stateData, chatId, messageId, env, storage, token);
    return;
  }

  // EDIT
  if (data === CB.EDIT) {
    await editMessage(
      token,
      chatId,
      messageId,
      msg.editMenuMessage(),
      { keyboard: msg.editMenuKeyboard() }
    );
    return;
  }

  // EDIT STEP
  if (data.startsWith(CB.EDIT_STEP)) {
    const step = data.replace(CB.EDIT_STEP, '') as MetrikaState;
    await processAction(
      chat,
      stateData,
      { type: 'EDIT_STEP', step },
      chatId,
      messageId,
      env,
      storage,
      token
    );
    return;
  }

  // REPORT NOW
  if (data === CB.REPORT_NOW) {
    await handleReportNow(chat, user, chatId, messageId, env, storage, token);
    return;
  }

  // SETTINGS
  if (data === CB.SETTINGS) {
    await editMessage(
      token,
      chatId,
      messageId,
      msg.settingsMessage(),
      { keyboard: msg.settingsKeyboard() }
    );
    return;
  }
}

// ═══════════════════════════════════════════
// PROCESS STATE TRANSITION
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
  const currentState = chat.state as MetrikaState;
  const result = transition(currentState, stateData, action);

  // Save new state
  await storage.updateChatState(chat.id, result.nextState, result.data);

  // Update chat object for further processing
  chat.state = result.nextState;
  chat.state_data = JSON.stringify(result.data);

  // Send appropriate screen
  await sendStateScreen(result.nextState, result.data, chatId, messageId, env, storage, token);
}

// ═══════════════════════════════════════════
// SEND STATE SCREEN
// ═══════════════════════════════════════════

async function sendStateScreen(
  state: MetrikaState,
  data: StateData,
  chatId: number,
  messageId: number,
  env: Env,
  storage: StorageAdapter,
  token: string
): Promise<void> {
  const oauthUrl = `https://oauth.yandex.ru/authorize?response_type=token&client_id=${env.YANDEX_OAUTH_CLIENT_ID}`;

  switch (state) {
    case 'idle':
      await editMessage(
        token,
        chatId,
        messageId,
        msg.welcomeMessage(),
        { keyboard: msg.welcomeKeyboard() }
      );
      break;

    case 'awaiting_token':
      await editMessage(
        token,
        chatId,
        messageId,
        msg.tokenMessage(oauthUrl),
        { keyboard: msg.tokenKeyboard(oauthUrl) }
      );
      break;

    case 'selecting_counter':
      if (data.counters && data.counters.length > 0) {
        await editMessage(
          token,
          chatId,
          messageId,
          msg.counterMessage(data.counters as MetrikaCounter[]),
          { keyboard: msg.counterKeyboard(data.counters as MetrikaCounter[]) }
        );
      } else {
        await editMessage(token, chatId, messageId, msg.noCountersMessage());
      }
      break;

    case 'selecting_goals':
      if (data.goals && data.goals.length > 0) {
        await editMessage(
          token,
          chatId,
          messageId,
          msg.goalsMessage(
            data.selectedCounter?.name || '',
            data.goals as MetrikaGoal[],
            (data.selectedGoals || []).map((g) => g.id)
          ),
          { keyboard: msg.goalsKeyboard(data.goals as MetrikaGoal[], (data.selectedGoals || []).map((g) => g.id)) }
        );
      } else {
        await editMessage(token, chatId, messageId, msg.noGoalsMessage());
      }
      break;

    case 'selecting_metrics':
      const metrics = data.selectedMetrics || DEFAULT_METRICS;
      await editMessage(
        token,
        chatId,
        messageId,
        msg.metricsMessage(metrics),
        { keyboard: msg.metricsKeyboard(metrics) }
      );
      break;

    case 'selecting_schedule':
      if (!data.frequency) {
        await editMessage(
          token,
          chatId,
          messageId,
          msg.scheduleFrequencyMessage(),
          { keyboard: msg.scheduleFrequencyKeyboard() }
        );
      } else if (!data.times || data.times.length === 0) {
        await editMessage(
          token,
          chatId,
          messageId,
          msg.scheduleTimeMessage(data.times || []),
          { keyboard: msg.scheduleTimeKeyboard(data.times || []) }
        );
      } else if (data.timezone === undefined) {
        await editMessage(
          token,
          chatId,
          messageId,
          msg.scheduleTimezoneMessage(),
          { keyboard: msg.scheduleTimezoneKeyboard() }
        );
      } else if (data.frequency === 'weekly' && !data.weekday) {
        await editMessage(
          token,
          chatId,
          messageId,
          msg.scheduleWeekdayMessage(),
          { keyboard: msg.scheduleWeekdayKeyboard() }
        );
      }
      break;

    case 'selecting_alerts':
      if (data.alertsEnabled === undefined) {
        await editMessage(
          token,
          chatId,
          messageId,
          msg.alertsIntroMessage(),
          { keyboard: msg.alertsIntroKeyboard() }
        );
      } else {
        await editMessage(
          token,
          chatId,
          messageId,
          msg.alertsSelectMessage((data.alertRules || []).map(ruleToId)),
          { keyboard: msg.alertsSelectKeyboard((data.alertRules || []).map(ruleToId)) }
        );
      }
      break;

    case 'confirmation':
      await editMessage(
        token,
        chatId,
        messageId,
        msg.confirmationMessage(data),
        { keyboard: msg.confirmationKeyboard() }
      );
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

  // Create admin topic if not exists
  if (!chat.admin_topic_id) {
    try {
      const topicResult = await createForumTopic(
        token,
        env.METRIKA_ADMIN_GROUP_ID,
        `⏳ @${user.telegram_username || 'id:' + user.telegram_id} | ${user.telegram_id} | (настройка)`,
        BotTopicColors.metrika
      );
      if (topicResult.ok && topicResult.result) {
        await storage.updateChatTopicId(chat.id, topicResult.result.message_thread_id);
        // Send user card to topic
        await sendMessage(
          token,
          env.METRIKA_ADMIN_GROUP_ID,
          formatUserCard(user),
          { messageThreadId: topicResult.result.message_thread_id }
        );
      }
    } catch (e) {
      console.error('Failed to create admin topic:', e);
    }
  }

  // Check if already configured
  const settings = await storage.getSettings(user.id, 'metrika');
  if (settings && chat.state === 'active') {
    await sendMessage(
      token,
      chatId,
      msg.mainMenuMessage(settings),
      { keyboard: msg.mainMenuKeyboard() }
    );
    return;
  }

  // Send welcome
  await sendMessage(
    token,
    chatId,
    msg.welcomeMessage(),
    { keyboard: msg.welcomeKeyboard() }
  );
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

  // Validate token with API
  const result = await validateToken(tokenValue);

  if (!result.ok || !result.data) {
    await sendMessage(token, chatId, msg.tokenInvalidMessage());
    return;
  }

  // Save encrypted token
  const encrypted = await encryptToken(tokenValue, env.ENCRYPTION_KEY);
  await storage.saveToken(user.id, 'metrika', encrypted);

  // Update state with counters
  stateData.counters = result.data.map((c) => ({
    id: c.id,
    name: c.name,
    site: c.site,
  }));

  // Transition to counter selection
  const transitionResult = transition('awaiting_token' as MetrikaState, stateData, {
    type: 'TOKEN_RECEIVED',
    token: tokenValue,
  });

  await storage.updateChatState(chat.id, transitionResult.nextState, transitionResult.data);

  // Send counter selection
  await sendMessage(token, chatId, msg.tokenAcceptedMessage());

  if (result.data.length > 0) {
    await sendMessage(
      token,
      chatId,
      msg.counterMessage(result.data),
      { keyboard: msg.counterKeyboard(result.data) }
    );
  } else {
    await sendMessage(token, chatId, msg.noCountersMessage());
  }
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
  // Build and save settings
  const settings = buildSettings(stateData);
  if (!settings) {
    await editMessage(token, chatId, messageId, msg.errorMessage('Не все настройки заполнены'));
    return;
  }

  await storage.saveSettings(user.id, 'metrika', settings);

  // Update state to active
  await storage.updateChatState(chat.id, 'active', {});

  // Update admin topic name
  if (chat.admin_topic_id) {
    // TODO: editForumTopic to update name
  }

  // Send main menu
  await editMessage(
    token,
    chatId,
    messageId,
    msg.mainMenuMessage(settings),
    { keyboard: msg.mainMenuKeyboard() }
  );
}

async function handleReportNow(
  chat: Chat,
  user: User,
  chatId: number,
  messageId: number,
  env: Env,
  storage: StorageAdapter,
  token: string
): Promise<void> {
  await editMessage(token, chatId, messageId, '⏳ Загрузка отчёта...');

  const result = await fetchAndFormatReport(user.id, env, storage);

  await editMessage(
    token,
    chatId,
    messageId,
    result.text,
    { keyboard: result.tokenExpired ? msg.tokenExpiredKeyboard() : msg.mainMenuKeyboard() }
  );
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

async function sendCurrentScreen(
  chat: Chat,
  stateData: StateData,
  env: Env,
  storage: StorageAdapter,
  token: string
): Promise<void> {
  const chatId = chat.telegram_chat_id;
  const oauthUrl = `https://oauth.yandex.ru/authorize?response_type=token&client_id=${env.YANDEX_OAUTH_CLIENT_ID}`;

  switch (chat.state) {
    case 'idle':
      await sendMessage(token, chatId, msg.welcomeMessage(), { keyboard: msg.welcomeKeyboard() });
      break;
    case 'awaiting_token':
      await sendMessage(token, chatId, msg.tokenMessage(oauthUrl), { keyboard: msg.tokenKeyboard(oauthUrl) });
      break;
    // Add other states as needed
  }
}

function formatUserCard(user: User): string {
  return `🆕 НОВЫЙ ПОЛЬЗОВАТЕЛЬ
═══════════════════════════════

👤 Пользователь
   Имя: ${user.first_name || ''} ${user.last_name || ''}
   Username: @${user.telegram_username || 'нет'}
   ID: ${user.telegram_id}
   Профиль: tg://user?id=${user.telegram_id}

⏰ Регистрация
   ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} (МСК)

═══════════════════════════════

Ожидаем завершения настройки...`;
}

function ruleToId(rule: AlertRule): string {
  if (rule.metric === 'visits') return `visits_${rule.threshold}`;
  if (rule.metric === 'primary_goal') return `goal_${rule.threshold}`;
  if (rule.metric === 'bounceRate') return `bounce_${rule.threshold}`;
  return '';
}

function idToRule(id: string): AlertRule | null {
  if (id === 'visits_30') return { metric: 'visits', condition: 'drop', threshold: 30 };
  if (id === 'visits_50') return { metric: 'visits', condition: 'drop', threshold: 50 };
  if (id === 'goal_20') return { metric: 'primary_goal', condition: 'drop', threshold: 20 };
  if (id === 'goal_50') return { metric: 'primary_goal', condition: 'drop', threshold: 50 };
  if (id === 'bounce_20') return { metric: 'bounceRate', condition: 'rise', threshold: 20 };
  return null;
}
