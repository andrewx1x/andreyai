// Forum topic management for Support bot

import type { Env, TelegramMessage } from '../../env';
import {
  createForumTopic,
  editForumTopic,
  sendMessage,
  copyMessage,
} from '../../shared/telegram';
import { isWorkingHours } from '../../shared/format';
import {
  topicName,
  ticketCardMessage,
  formatMskDateTime,
  getTopicLink,
  type EntryPoint,
} from './messages';

// ═══════════════════════════════════════════
// CREATE TOPIC
// ═══════════════════════════════════════════

export interface CreateTopicData {
  userId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  entry?: EntryPoint;
}

export async function createSupportTopic(
  token: string,
  groupId: number,
  data: CreateTopicData
): Promise<{ topicId: number } | null> {
  const name = topicName({
    username: data.username,
    telegramId: data.userId,
    source: data.entry?.source || 'unknown',
    type: data.entry?.type || 'help',
  });

  // Color for support topics - blue
  const iconColor = 0x6FB9F0;

  const result = await createForumTopic(token, groupId, name, iconColor);

  if (!result.ok || !result.result) {
    console.error('Failed to create support topic:', result);
    return null;
  }

  return { topicId: result.result.message_thread_id };
}

// ═══════════════════════════════════════════
// UPDATE TOPIC
// ═══════════════════════════════════════════

export async function markTopicUrgent(
  token: string,
  groupId: number,
  topicId: number,
  data: {
    username?: string;
    telegramId: number;
    source: string;
    type: string;
  }
): Promise<void> {
  const newName = topicName({
    ...data,
    isUrgent: true,
  });

  await editForumTopic(token, groupId, topicId, newName);
}

export async function markTopicClosed(
  token: string,
  groupId: number,
  topicId: number,
  currentName: string
): Promise<void> {
  // Replace first emoji with checkmark
  const newName = currentName.replace(/^./, '✅');
  await editForumTopic(token, groupId, topicId, newName);
}

// ═══════════════════════════════════════════
// SEND TICKET CARD
// ═══════════════════════════════════════════

export async function sendTicketCard(
  token: string,
  groupId: number,
  topicId: number,
  data: {
    firstName: string;
    lastName?: string;
    username?: string;
    telegramId: number;
    entry: EntryPoint;
    messageText?: string;
    hasAttachment: boolean;
  }
): Promise<void> {
  const cardText = ticketCardMessage({
    firstName: data.firstName,
    lastName: data.lastName,
    username: data.username,
    telegramId: data.telegramId,
    entry: data.entry,
    datetime: formatMskDateTime(new Date()),
    isWorkHours: isWorkingHours(),
    messageText: data.messageText,
    hasAttachment: data.hasAttachment,
  });

  await sendMessage(token, groupId, cardText, {
    messageThreadId: topicId,
    parseMode: 'HTML',
  });
}

// ═══════════════════════════════════════════
// FORWARD MESSAGES
// ═══════════════════════════════════════════

export async function forwardToTopic(
  token: string,
  groupId: number,
  topicId: number,
  message: TelegramMessage
): Promise<void> {
  await copyMessage(token, groupId, message.chat.id, message.message_id, {
    messageThreadId: topicId,
  });
}

export async function forwardToUser(
  token: string,
  userId: number,
  message: TelegramMessage
): Promise<void> {
  await copyMessage(token, userId, message.chat.id, message.message_id);
}

// ═══════════════════════════════════════════
// SEND TO TOPIC
// ═══════════════════════════════════════════

export async function sendToTopic(
  token: string,
  groupId: number,
  topicId: number,
  text: string
): Promise<void> {
  await sendMessage(token, groupId, text, {
    messageThreadId: topicId,
  });
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

export function buildTopicLink(groupId: number, topicId: number): string {
  return getTopicLink(groupId, topicId);
}
