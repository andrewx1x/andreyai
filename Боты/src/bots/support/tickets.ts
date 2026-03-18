// Ticket management for Support bot

import type { EntryPoint } from './messages';

// ═══════════════════════════════════════════
// TICKET TYPES
// ═══════════════════════════════════════════

export interface Ticket {
  id: string;
  user_id: number;
  username: string | null;
  first_name: string | null;
  topic_id: number;
  entry_point: string | null; // JSON string of EntryPoint
  status: 'open' | 'waiting' | 'closed';
  ack_sent: boolean;
  is_urgent: boolean;
  created_at: string;
  last_user_msg_at: string | null;
  last_admin_msg_at: string | null;
}

export interface EntrySession {
  user_id: number;
  entry_point: string; // JSON string of EntryPoint
  set_at: string;
  ttl_seconds: number;
}

export interface AutoReplyState {
  user_id: number;
  last_reply_at: string | null;
}

// ═══════════════════════════════════════════
// TICKET STORAGE (using D1)
// ═══════════════════════════════════════════

export class TicketStorage {
  constructor(private db: D1Database) {}

  // ───────────────────────────────────────────
  // TICKETS
  // ───────────────────────────────────────────

  async getTicketByUser(userId: number): Promise<Ticket | null> {
    const result = await this.db
      .prepare('SELECT * FROM support_tickets WHERE user_id = ? AND status != ? ORDER BY created_at DESC LIMIT 1')
      .bind(userId, 'closed')
      .first<Ticket>();

    return result || null;
  }

  async getTicketByTopicId(topicId: number): Promise<Ticket | null> {
    const result = await this.db
      .prepare('SELECT * FROM support_tickets WHERE topic_id = ?')
      .bind(topicId)
      .first<Ticket>();

    return result || null;
  }

  async createTicket(data: {
    userId: number;
    username?: string;
    firstName?: string;
    topicId: number;
    entryPoint?: EntryPoint;
  }): Promise<Ticket> {
    const id = crypto.randomUUID();
    const entryJson = data.entryPoint ? JSON.stringify(data.entryPoint) : null;

    await this.db
      .prepare(
        `INSERT INTO support_tickets
         (id, user_id, username, first_name, topic_id, entry_point, status, ack_sent, is_urgent, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'open', 0, 0, datetime('now'))`
      )
      .bind(id, data.userId, data.username || null, data.firstName || null, data.topicId, entryJson)
      .run();

    return {
      id,
      user_id: data.userId,
      username: data.username || null,
      first_name: data.firstName || null,
      topic_id: data.topicId,
      entry_point: entryJson,
      status: 'open',
      ack_sent: false,
      is_urgent: false,
      created_at: new Date().toISOString(),
      last_user_msg_at: null,
      last_admin_msg_at: null,
    };
  }

  async updateTicketStatus(ticketId: string, status: 'open' | 'waiting' | 'closed'): Promise<void> {
    await this.db
      .prepare('UPDATE support_tickets SET status = ? WHERE id = ?')
      .bind(status, ticketId)
      .run();
  }

  async markAckSent(ticketId: string): Promise<void> {
    await this.db
      .prepare('UPDATE support_tickets SET ack_sent = 1 WHERE id = ?')
      .bind(ticketId)
      .run();
  }

  async markUrgent(ticketId: string): Promise<void> {
    await this.db
      .prepare('UPDATE support_tickets SET is_urgent = 1 WHERE id = ?')
      .bind(ticketId)
      .run();
  }

  async updateLastUserMessage(ticketId: string): Promise<void> {
    await this.db
      .prepare("UPDATE support_tickets SET last_user_msg_at = datetime('now') WHERE id = ?")
      .bind(ticketId)
      .run();
  }

  async updateLastAdminReply(ticketId: string): Promise<void> {
    await this.db
      .prepare("UPDATE support_tickets SET last_admin_msg_at = datetime('now') WHERE id = ?")
      .bind(ticketId)
      .run();
  }

  // ───────────────────────────────────────────
  // ENTRY SESSIONS
  // ───────────────────────────────────────────

  async setEntrySession(userId: number, entry: EntryPoint): Promise<void> {
    const entryJson = JSON.stringify(entry);

    await this.db
      .prepare(
        `INSERT OR REPLACE INTO entry_sessions (user_id, entry_point, set_at, ttl_seconds)
         VALUES (?, ?, datetime('now'), 1800)`
      )
      .bind(userId, entryJson)
      .run();
  }

  async getEntrySession(userId: number): Promise<EntryPoint | null> {
    const result = await this.db
      .prepare(
        `SELECT entry_point FROM entry_sessions
         WHERE user_id = ?
         AND datetime(set_at, '+' || ttl_seconds || ' seconds') > datetime('now')`
      )
      .bind(userId)
      .first<{ entry_point: string }>();

    if (!result) return null;

    try {
      return JSON.parse(result.entry_point);
    } catch {
      return null;
    }
  }

  async clearEntrySession(userId: number): Promise<void> {
    await this.db
      .prepare('DELETE FROM entry_sessions WHERE user_id = ?')
      .bind(userId)
      .run();
  }

  // ───────────────────────────────────────────
  // AUTO-REPLY STATE
  // ───────────────────────────────────────────

  async canSendAutoReply(userId: number, cooldownHours: number = 3): Promise<boolean> {
    const result = await this.db
      .prepare(
        `SELECT last_reply_at FROM auto_reply_state
         WHERE user_id = ?`
      )
      .bind(userId)
      .first<{ last_reply_at: string }>();

    if (!result || !result.last_reply_at) return true;

    const lastReply = new Date(result.last_reply_at);
    const now = new Date();
    const elapsed = now.getTime() - lastReply.getTime();
    const cooldownMs = cooldownHours * 60 * 60 * 1000;

    return elapsed > cooldownMs;
  }

  async updateAutoReplyTime(userId: number): Promise<void> {
    await this.db
      .prepare(
        `INSERT OR REPLACE INTO auto_reply_state (user_id, last_reply_at)
         VALUES (?, datetime('now'))`
      )
      .bind(userId)
      .run();
  }
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

export function parseEntryPointFromTicket(ticket: Ticket): EntryPoint | null {
  if (!ticket.entry_point) return null;

  try {
    return JSON.parse(ticket.entry_point);
  } catch {
    return null;
  }
}
