// Entry point for Cloudflare Workers
// Routes webhooks to appropriate bot handlers

import type { Env, TelegramUpdate } from './env';
import { createStorage } from './shared/db';

// Bot handlers
import { handleMetrikaUpdate } from './bots/metrika';
import {
  sendScheduledReports as sendMetrikaReports,
  checkAlerts as checkMetrikaAlerts,
} from './bots/metrika';
import { handleDirectUpdate } from './bots/direct';
import {
  sendScheduledReports as sendDirectReports,
  checkAlerts as checkDirectAlerts,
} from './bots/direct';
import { handleSupportUpdate } from './bots/support';
import { handleLandingUpdate } from './bots/landing';
import { handleDashboardApi } from './dashboard';

export default {
  // Handle HTTP requests (webhooks)
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Health check
    if (path === '/api/health') {
      return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Dashboard API routes
    if (path.startsWith('/api/dashboard')) {
      return handleDashboardApi(request, env);
    }

    // Only accept POST for webhooks
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Webhook secret verification (optional)
    if (env.WEBHOOK_SECRET) {
      const secretHeader = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
      if (secretHeader !== env.WEBHOOK_SECRET) {
        return new Response('Unauthorized', { status: 401 });
      }
    }

    try {
      const update = (await request.json()) as TelegramUpdate;
      const storage = createStorage(env.DB);

      // Route to appropriate handler based on path
      switch (path) {
        case '/webhook/metrika':
          ctx.waitUntil(handleMetrikaUpdate(update, env, storage));
          break;

        case '/webhook/direct':
          ctx.waitUntil(handleDirectUpdate(update, env, storage));
          break;

        case '/webhook/support':
          ctx.waitUntil(handleSupportUpdate(update, env));
          break;

        case '/webhook/landing':
          ctx.waitUntil(handleLandingUpdate(update, env));
          break;

        default:
          return new Response('Not found', { status: 404 });
      }

      // Always return 200 to Telegram to acknowledge receipt
      return new Response('OK', { status: 200 });
    } catch (error) {
      console.error('Webhook error:', error);
      // Return 200 anyway to prevent Telegram from retrying
      return new Response('OK', { status: 200 });
    }
  },

  // Handle scheduled tasks (Cron Triggers)
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    const storage = createStorage(env.DB);

    console.log(
      `Cron trigger: ${event.cron} at ${new Date(event.scheduledTime).toISOString()}`
    );

    switch (event.cron) {
      // Morning reports (07:00 UTC = 10:00 MSK)
      case '0 7 * * *':
        ctx.waitUntil(sendScheduledReports(env, storage, '10:00'));
        break;

      // Evening reports (16:00 UTC = 19:00 MSK)
      case '0 16 * * *':
        ctx.waitUntil(sendScheduledReports(env, storage, '19:00'));
        break;

      // Alerts check every 15 minutes
      case '*/15 * * * *':
        ctx.waitUntil(checkAlerts(env, storage));
        break;

      default:
        console.log('Unknown cron trigger:', event.cron);
    }
  },
};

// ═══════════════════════════════════════════
// SCHEDULED TASKS - aggregate all bots
// ═══════════════════════════════════════════

async function sendScheduledReports(
  env: Env,
  storage: ReturnType<typeof createStorage>,
  time: string
): Promise<void> {
  console.log(`[Cron] Sending scheduled reports for ${time}`);

  // Send Metrika reports
  await sendMetrikaReports(env, storage, time);

  // Send Direct reports
  await sendDirectReports(env, storage, time);
}

async function checkAlerts(
  env: Env,
  storage: ReturnType<typeof createStorage>
): Promise<void> {
  console.log('[Cron] Checking alerts...');

  // Check Metrika alerts
  await checkMetrikaAlerts(env, storage);

  // Check Direct alerts
  await checkDirectAlerts(env, storage);
}
