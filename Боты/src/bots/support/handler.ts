// Main handler for Support bot

import type { Env, TelegramUpdate, TelegramMessage } from '../../env';
import { sendMessage } from '../../shared/telegram';
import { isWorkingHours } from '../../shared/format';
import { TicketStorage, parseEntryPointFromTicket } from './tickets';
import {
  createSupportTopic,
  sendTicketCard,
  forwardToTopic,
  forwardToUser,
  sendToTopic,
  markTopicUrgent,
  markTopicClosed,
  buildTopicLink,
} from './topics';
import {
  parseEntryPoint,
  welcomeWithContextMessage,
  welcomeNoContextMessage,
  messageReceivedMessage,
  outOfHoursMessage,
  ticketClosedMessage,
  nightNotificationMessage,
  urgentNotificationMessage,
  containsUrgent,
  returnKeyboard,
  topicName,
  type EntryPoint,
} from './messages';

// ═══════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════

export async function handleSupportUpdate(
  update: TelegramUpdate,
  env: Env
): Promise<void> {
  const token = env.TELEGRAM_BOT_TOKEN_SUPPORT;
  const ticketStorage = new TicketStorage(env.DB);

  if (update.message) {
    await handleMessage(update.message, env, token, ticketStorage);
    return;
  }
}

// ═══════════════════════════════════════════
// MESSAGE HANDLER
// ═══════════════════════════════════════════

async function handleMessage(
  message: TelegramMessage,
  env: Env,
  token: string,
  ticketStorage: TicketStorage
): Promise<void> {
  const chatId = message.chat.id;
  const chatType = message.chat.type;
  const supportGroupId = Number(env.SUPPORT_GROUP_ID);

  // Message in support group (from admin)
  if (chatType === 'supergroup' && Number.isFinite(supportGroupId) && chatId === supportGroupId) {
    await handleAdminMessage(message, env, token, ticketStorage);
    return;
  }

  // Private message (from user)
  if (chatType === 'private') {
    await handleUserMessage(message, env, token, ticketStorage);
    return;
  }
}

// ═══════════════════════════════════════════
// USER MESSAGE HANDLER
// ═══════════════════════════════════════════

async function handleUserMessage(
  message: TelegramMessage,
  env: Env,
  token: string,
  ticketStorage: TicketStorage
): Promise<void> {
  const from = message.from;
  if (!from) return;

  const userId = from.id;
  const chatId = message.chat.id;
  const text = message.text || '';

  // Handle /start command
  if (text.startsWith('/start')) {
    await handleStart(message, env, token, ticketStorage);
    return;
  }

  // Regular message - find or create ticket
  await handleUserQuestion(message, env, token, ticketStorage);
}

// ═══════════════════════════════════════════
// /START HANDLER
// ═══════════════════════════════════════════

async function handleStart(
  message: TelegramMessage,
  env: Env,
  token: string,
  ticketStorage: TicketStorage
): Promise<void> {
  const from = message.from!;
  const chatId = message.chat.id;
  const text = message.text || '';

  // Parse entry point from deep-link
  const startParam = text.split(' ')[1];
  let entry: EntryPoint | null = null;

  if (startParam) {
    entry = parseEntryPoint(startParam);
    // Save entry session for later use
    await ticketStorage.setEntrySession(from.id, entry);
  }

  // Send welcome message
  if (entry && entry.source !== 'unknown') {
    await sendMessage(token, chatId, welcomeWithContextMessage(entry));
  } else {
    await sendMessage(token, chatId, welcomeNoContextMessage());
  }
}

// ═══════════════════════════════════════════
// USER QUESTION HANDLER
// ═══════════════════════════════════════════

async function handleUserQuestion(
  message: TelegramMessage,
  env: Env,
  token: string,
  ticketStorage: TicketStorage
): Promise<void> {
  const from = message.from!;
  const userId = from.id;
  const chatId = message.chat.id;
  const text = message.text || '';

  // 1. Get or create ticket
  let ticket = await ticketStorage.getTicketByUser(userId);

  if (!ticket) {
    // Get entry point from session
    const entry = await ticketStorage.getEntrySession(userId) || {
      source: 'unknown' as const,
      type: 'help' as const,
      screen: 'general',
    };

    // Create forum topic
    const topicResult = await createSupportTopic(token, env.SUPPORT_GROUP_ID, {
      userId,
      username: from.username,
      firstName: from.first_name,
      lastName: from.last_name,
      entry,
    });

    if (!topicResult) {
      await sendMessage(token, chatId, 'Произошла ошибка. Попробуйте позже.');
      return;
    }

    // Create ticket in DB
    ticket = await ticketStorage.createTicket({
      userId,
      username: from.username,
      firstName: from.first_name,
      topicId: topicResult.topicId,
      entryPoint: entry,
    });

    // Send ticket card to topic
    const hasAttachment = !!(message.photo || message.document || message.video);
    await sendTicketCard(token, env.SUPPORT_GROUP_ID, topicResult.topicId, {
      firstName: from.first_name,
      lastName: from.last_name,
      username: from.username,
      telegramId: userId,
      entry,
      messageText: text || undefined,
      hasAttachment,
    });

    // Clear entry session
    await ticketStorage.clearEntrySession(userId);
  }

  // 2. Forward message to topic (if not just created with text already in card)
  if (ticket.ack_sent || !text) {
    // Forward media or subsequent messages
    await forwardToTopic(token, env.SUPPORT_GROUP_ID, ticket.topic_id, message);
  } else if (message.photo || message.document || message.video) {
    // Forward attachment even for first message
    await forwardToTopic(token, env.SUPPORT_GROUP_ID, ticket.topic_id, message);
  }

  // 3. Update last message time
  await ticketStorage.updateLastUserMessage(ticket.id);

  // 4. Check work hours and send response
  const workHours = isWorkingHours();

  if (!workHours) {
    // Non-working hours
    const canReply = await ticketStorage.canSendAutoReply(userId, 3);
    if (canReply) {
      await sendMessage(token, chatId, outOfHoursMessage());
      await ticketStorage.updateAutoReplyTime(userId);
    }

    // Night notification to admin
    await notifyAdminNight(env, token, ticket, from.username, userId);
  } else if (!ticket.ack_sent) {
    // First message acknowledgment
    await sendMessage(token, chatId, messageReceivedMessage());
    await ticketStorage.markAckSent(ticket.id);
  }

  // 5. Check for urgent
  if (containsUrgent(text) && !ticket.is_urgent) {
    await ticketStorage.markUrgent(ticket.id);

    const entry = parseEntryPointFromTicket(ticket);
    await markTopicUrgent(token, env.SUPPORT_GROUP_ID, ticket.topic_id, {
      username: from.username,
      telegramId: userId,
      source: entry?.source || 'unknown',
      type: entry?.type || 'help',
    });

    await notifyAdminUrgent(env, token, ticket, from.username, userId, entry?.source);
  }
}

// ═══════════════════════════════════════════
// ADMIN MESSAGE HANDLER
// ═══════════════════════════════════════════

async function handleAdminMessage(
  message: TelegramMessage,
  env: Env,
  token: string,
  ticketStorage: TicketStorage
): Promise<void> {
  const topicId = message.message_thread_id;
  const text = message.text || '';

  // Ignore messages not in topics
  if (!topicId) return;

  // Find ticket by topic
  const ticket = await ticketStorage.getTicketByTopicId(topicId);
  if (!ticket) return;

  // Handle /close command
  if (text.startsWith('/close')) {
    await handleCloseTicket(ticket, env, token, ticketStorage);
    return;
  }

  // Forward message to user
  await forwardToUser(token, ticket.user_id, message);

  // Update last admin reply time
  await ticketStorage.updateLastAdminReply(ticket.id);
}

// ═══════════════════════════════════════════
// CLOSE TICKET
// ═══════════════════════════════════════════

async function handleCloseTicket(
  ticket: { id: string; user_id: number; topic_id: number; entry_point: string | null },
  env: Env,
  token: string,
  ticketStorage: TicketStorage
): Promise<void> {
  const entry = ticket.entry_point ? JSON.parse(ticket.entry_point) as EntryPoint : null;

  // 1. Send close message to user
  await sendMessage(token, ticket.user_id, ticketClosedMessage(), {
    keyboard: returnKeyboard(entry?.source),
  });

  // 2. Update ticket status
  await ticketStorage.updateTicketStatus(ticket.id, 'closed');

  // 3. Update topic name
  const currentName = topicName({
    telegramId: ticket.user_id,
    source: entry?.source || 'unknown',
    type: entry?.type || 'help',
  });
  await markTopicClosed(token, env.SUPPORT_GROUP_ID, ticket.topic_id, currentName);

  // 4. Send confirmation to topic
  await sendToTopic(token, env.SUPPORT_GROUP_ID, ticket.topic_id, '✅ Обращение закрыто.');
}

// ═══════════════════════════════════════════
// ADMIN NOTIFICATIONS
// ═══════════════════════════════════════════

async function notifyAdminNight(
  env: Env,
  token: string,
  ticket: { topic_id: number; entry_point: string | null },
  username: string | undefined,
  telegramId: number
): Promise<void> {
  const entry = ticket.entry_point ? JSON.parse(ticket.entry_point) as EntryPoint : null;
  const topicLink = buildTopicLink(env.SUPPORT_GROUP_ID, ticket.topic_id);

  const notification = nightNotificationMessage({
    username,
    telegramId,
    source: entry?.source || 'unknown',
    screen: entry?.screen || 'general',
    topicLink,
  });

  // Send to all admins
  const adminIds = parseAdminIds(env.ADMIN_IDS);
  for (const adminId of adminIds) {
    try {
      await sendMessage(token, adminId, notification, { parseMode: 'Markdown' });
    } catch (e) {
      console.error(`Failed to notify admin ${adminId}:`, e);
    }
  }
}

async function notifyAdminUrgent(
  env: Env,
  token: string,
  ticket: { topic_id: number },
  username: string | undefined,
  telegramId: number,
  source?: string
): Promise<void> {
  const topicLink = buildTopicLink(env.SUPPORT_GROUP_ID, ticket.topic_id);

  const notification = urgentNotificationMessage({
    username,
    telegramId,
    source: source || 'unknown',
    topicLink,
  });

  // Send to all admins
  const adminIds = parseAdminIds(env.ADMIN_IDS);
  for (const adminId of adminIds) {
    try {
      await sendMessage(token, adminId, notification, { parseMode: 'Markdown' });
    } catch (e) {
      console.error(`Failed to notify admin ${adminId}:`, e);
    }
  }
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

function parseAdminIds(adminIdsStr: string): number[] {
  if (!adminIdsStr) return [];
  return adminIdsStr
    .split(',')
    .map((id) => parseInt(id.trim(), 10))
    .filter((id) => !isNaN(id));
}
