// Main handler for Landing (demo) bot

import type { Env, TelegramUpdate } from '../../env';
import { sendMessage, sendVideo, editMessage, answerCallback } from '../../shared/telegram';
import * as msg from './messages';

// User state storage (in-memory for demo, could use D1 for persistence)
const userStates = new Map<number, { product?: 'metrika' | 'direct' }>();

// ═══════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════

export async function handleLandingUpdate(
  update: TelegramUpdate,
  env: Env
): Promise<void> {
  const token = env.TELEGRAM_BOT_TOKEN_LANDING;
  const landingUrl = env.LANDING_URL || 'https://andreyai.ru/';
  const normalizedLandingUrl = landingUrl.endsWith('/') ? landingUrl : `${landingUrl}/`;
  const directLandingUrl = env.DIRECT_LANDING_URL || `${normalizedLandingUrl}direct/`;
  const dashboardUrl = env.DASHBOARD_DEMO_URL || directLandingUrl;

  if (update.callback_query) {
    await handleCallback(update.callback_query, env, token, landingUrl, directLandingUrl, dashboardUrl);
    return;
  }

  if (update.message) {
    await handleMessage(update.message, env, token, landingUrl);
    return;
  }
}

// ═══════════════════════════════════════════
// MESSAGE HANDLER
// ═══════════════════════════════════════════

async function handleMessage(
  message: NonNullable<TelegramUpdate['message']>,
  env: Env,
  token: string,
  landingUrl: string
): Promise<void> {
  const chatId = message.chat.id;
  const text = message.text || '';

  // Handle /start
  if (text.startsWith('/start')) {
    await sendMessage(token, chatId, msg.welcomeMessage(), {
      keyboard: msg.welcomeKeyboard(),
    });
    return;
  }

  // Any other message - show welcome
  await sendMessage(token, chatId, msg.welcomeMessage(), {
    keyboard: msg.welcomeKeyboard(),
  });
}

// ═══════════════════════════════════════════
// CALLBACK HANDLER
// ═══════════════════════════════════════════

async function handleCallback(
  query: NonNullable<TelegramUpdate['callback_query']>,
  env: Env,
  token: string,
  landingUrl: string,
  directLandingUrl: string,
  dashboardUrl: string
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

  await answerCallback(token, query.id);

  const CB = msg.CB;

  switch (data) {
    // ─────────────────────────────────────────
    // WELCOME / NAVIGATION
    // ─────────────────────────────────────────

    case CB.WATCH_VIDEO:
      // Send video message (or just text with video link for demo)
      await editMessage(token, chatId, messageId, msg.videoMessage(), {
        keyboard: msg.videoKeyboard(),
      });
      break;

    case CB.SELECT_PRODUCT:
      await editMessage(token, chatId, messageId, '📊 Выберите продукт для демо:', {
        keyboard: msg.productSelectKeyboard(),
      });
      break;

    case CB.BACK:
      await editMessage(token, chatId, messageId, msg.welcomeMessage(), {
        keyboard: msg.welcomeKeyboard(),
      });
      break;

    case CB.RESTART:
      await editMessage(token, chatId, messageId, msg.welcomeMessage(), {
        keyboard: msg.welcomeKeyboard(),
      });
      break;

    // ─────────────────────────────────────────
    // METRIKA DEMO
    // ─────────────────────────────────────────

    case CB.SELECT_METRIKA:
      userStates.set(from.id, { product: 'metrika' });
      await editMessage(token, chatId, messageId, msg.metrikaReportMessage(), {
        keyboard: msg.metrikaReportKeyboard(landingUrl),
      });
      break;

    // ─────────────────────────────────────────
    // DIRECT DEMO
    // ─────────────────────────────────────────

    case CB.SELECT_DIRECT:
      userStates.set(from.id, { product: 'direct' });
      await editMessage(token, chatId, messageId, msg.directReportMessage(), {
        keyboard: msg.directReportKeyboard(directLandingUrl, dashboardUrl),
      });
      break;

    // ─────────────────────────────────────────
    // BACK TO PRODUCTS
    // ─────────────────────────────────────────

    case CB.BACK_TO_PRODUCTS:
      await editMessage(token, chatId, messageId, '📊 Выберите продукт для демо:', {
        keyboard: msg.productSelectKeyboard(),
      });
      break;

    // ─────────────────────────────────────────
    // SHOW REPORT (refresh)
    // ─────────────────────────────────────────

    case CB.SHOW_REPORT: {
      const state = userStates.get(from.id);
      if (state?.product === 'direct') {
        await editMessage(token, chatId, messageId, msg.directReportMessage(), {
          keyboard: msg.directReportKeyboard(directLandingUrl, dashboardUrl),
        });
      } else {
        await editMessage(token, chatId, messageId, msg.metrikaReportMessage(), {
          keyboard: msg.metrikaReportKeyboard(landingUrl),
        });
      }
      break;
    }

    // ─────────────────────────────────────────
    // ALERT DEMO
    // ─────────────────────────────────────────

    case CB.SHOW_ALERT: {
      const state = userStates.get(from.id);
      const product = state?.product || 'metrika';
      await editMessage(token, chatId, messageId, msg.alertDemoMessage(product), {
        keyboard: msg.alertKeyboard(product, product === 'direct' ? directLandingUrl : landingUrl),
      });
      break;
    }

    // ─────────────────────────────────────────
    // SETTINGS (stub screens)
    // ─────────────────────────────────────────

    case CB.CHANGE_METRICS: {
      const state = userStates.get(from.id);
      const product = state?.product || 'metrika';
      await editMessage(token, chatId, messageId, msg.changeMetricsMessage(), {
        keyboard: msg.settingsKeyboard(product, product === 'direct' ? directLandingUrl : landingUrl),
      });
      break;
    }

    case CB.CHANGE_TIME: {
      const state = userStates.get(from.id);
      const product = state?.product || 'metrika';
      await editMessage(token, chatId, messageId, msg.changeTimeMessage(), {
        keyboard: msg.settingsKeyboard(product, product === 'direct' ? directLandingUrl : landingUrl),
      });
      break;
    }

    // ─────────────────────────────────────────
    // FINISH
    // ─────────────────────────────────────────

    case CB.FINISH:
      await editMessage(token, chatId, messageId, msg.finishMessage(), {
        keyboard: msg.finishKeyboard(landingUrl),
      });
      break;

    // ─────────────────────────────────────────
    // LANDING (external link - handled by Telegram)
    // ─────────────────────────────────────────

    case CB.LANDING:
      // This is a URL button, no server-side action needed
      break;

    default:
      // Unknown callback - show welcome
      await editMessage(token, chatId, messageId, msg.welcomeMessage(), {
        keyboard: msg.welcomeKeyboard(),
      });
  }
}
