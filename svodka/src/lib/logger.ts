/**
 * Structured logging for production observability.
 * Outputs JSON lines — compatible with Vercel Logs, Datadog, etc.
 *
 * Usage:
 *   log.info("cron.collect", "Snapshot saved", { projectId: 1, date: "2025-01-01" })
 *   log.error("cron.alerts", "API failed", { projectId: 1, error: "401" })
 */

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  scope: string;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

function emit(entry: LogEntry) {
  const line = JSON.stringify(entry);
  switch (entry.level) {
    case "error":
      console.error(line);
      break;
    case "warn":
      console.warn(line);
      break;
    default:
      console.log(line);
  }
}

export const log = {
  info(scope: string, message: string, data?: Record<string, unknown>) {
    emit({ level: "info", scope, message, timestamp: new Date().toISOString(), data });
  },
  warn(scope: string, message: string, data?: Record<string, unknown>) {
    emit({ level: "warn", scope, message, timestamp: new Date().toISOString(), data });
  },
  error(scope: string, message: string, data?: Record<string, unknown>) {
    emit({ level: "error", scope, message, timestamp: new Date().toISOString(), data });
  },
};
