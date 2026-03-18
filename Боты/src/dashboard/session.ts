// Dashboard session management

import { generateSessionToken, hmacSha256 } from '../shared/crypto';

// ═══════════════════════════════════════════
// SESSION TYPES
// ═══════════════════════════════════════════

export interface DashboardSession {
  id: string;
  user_id: string;
  token: string;
  created_at: string;
  expires_at: string;
}

// ═══════════════════════════════════════════
// SESSION STORAGE (D1)
// ═══════════════════════════════════════════

export class SessionStorage {
  constructor(private db: D1Database) {}

  async createSession(userId: string, ttlMinutes: number = 30): Promise<string> {
    const token = await generateSessionToken();
    const id = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

    await this.db
      .prepare(
        `INSERT INTO dashboard_sessions (id, user_id, token, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(id, userId, token, now.toISOString(), expiresAt.toISOString())
      .run();

    return token;
  }

  async validateSession(token: string): Promise<DashboardSession | null> {
    const session = await this.db
      .prepare(
        `SELECT * FROM dashboard_sessions
         WHERE token = ? AND datetime(expires_at) > datetime('now')`
      )
      .bind(token)
      .first<DashboardSession>();

    return session || null;
  }

  async deleteSession(token: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM dashboard_sessions WHERE token = ?')
      .bind(token)
      .run();
  }

  async cleanupExpiredSessions(): Promise<void> {
    await this.db
      .prepare("DELETE FROM dashboard_sessions WHERE datetime(expires_at) < datetime('now')")
      .run();
  }

  async refreshSession(token: string, ttlMinutes: number = 30): Promise<boolean> {
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    const result = await this.db
      .prepare('UPDATE dashboard_sessions SET expires_at = ? WHERE token = ?')
      .bind(expiresAt.toISOString(), token)
      .run();

    return result.meta.changes > 0;
  }
}

// ═══════════════════════════════════════════
// TELEGRAM WEBAPP VALIDATION
// ═══════════════════════════════════════════

export async function validateTelegramWebAppData(
  initData: string,
  botToken: string
): Promise<{ valid: boolean; userId?: number }> {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');

    if (!hash) {
      return { valid: false };
    }

    params.delete('hash');

    // Sort and create data check string
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    // Create secret key: HMAC-SHA256(bot_token, "WebAppData")
    const encoder = new TextEncoder();
    const secretKeyData = await crypto.subtle.importKey(
      'raw',
      encoder.encode('WebAppData'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const secretKey = await crypto.subtle.sign(
      'HMAC',
      secretKeyData,
      encoder.encode(botToken)
    );

    // Calculate hash: HMAC-SHA256(secret_key, data_check_string)
    const hmacKey = await crypto.subtle.importKey(
      'raw',
      secretKey,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const calculatedHashBuffer = await crypto.subtle.sign(
      'HMAC',
      hmacKey,
      encoder.encode(dataCheckString)
    );

    const calculatedHash = Array.from(new Uint8Array(calculatedHashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    if (hash !== calculatedHash) {
      return { valid: false };
    }

    // Extract user ID
    const userJson = params.get('user');
    if (userJson) {
      const user = JSON.parse(userJson);
      return { valid: true, userId: user.id };
    }

    return { valid: true };
  } catch (error) {
    console.error('Error validating Telegram WebApp data:', error);
    return { valid: false };
  }
}

// ═══════════════════════════════════════════
// CORS HEADERS
// ═══════════════════════════════════════════

export function getCorsHeaders(origin?: string): HeadersInit {
  const allowedOrigins = [
    'https://telegram.org',
    'https://web.telegram.org',
    'https://t.me',
  ];

  const allowOrigin = origin && allowedOrigins.some((o) => origin.startsWith(o))
    ? origin
    : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}
