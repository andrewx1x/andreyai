import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  yandexId: text("yandex_id").notNull().unique(),
  email: text("email"),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  timezoneOffset: integer("timezone_offset").default(180), // UTC+3 Moscow
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`).notNull(),
});

export const tokens = sqliteTable("tokens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  encryptedToken: text("encrypted_token").notNull(),
  tokenType: text("token_type", { enum: ["metrika", "direct"] }).notNull().default("metrika"),
  expiresAt: text("expires_at"),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`).notNull(),
});

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["metrika", "direct"] }).notNull(),
  name: text("name").notNull(), // "example.com" or "Кампания Поиск"
  yandexCounterId: integer("yandex_counter_id"), // for metrika
  yandexLogin: text("yandex_login"), // for direct
  settingsJson: text("settings_json").default("{}").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`).notNull(),
});

export const subscriptions = sqliteTable("subscriptions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  plan: text("plan", { enum: ["site", "ads", "bundle"] }).notNull().default("bundle"),
  status: text("status", { enum: ["trial", "active", "expired", "cancelled"] }).notNull().default("trial"),
  trialEndsAt: text("trial_ends_at"), // nullable — заложено, не активировано
  paidUntil: text("paid_until"),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`).notNull(),
});

export const alertCooldowns = sqliteTable("alert_cooldowns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  alertType: text("alert_type").notNull(),
  lastSentAt: text("last_sent_at").notNull(),
}, (table) => [
  uniqueIndex("alert_cooldowns_unique").on(table.userId, table.projectId, table.alertType),
]);

export const snapshots = sqliteTable("snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // YYYY-MM-DD
  dataJson: text("data_json").notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
}, (table) => [
  uniqueIndex("snapshots_project_date").on(table.projectId, table.date),
]);

export const reportCache = sqliteTable("report_cache", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  reportDate: text("report_date").notNull(),
  reportData: text("report_data").notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
});

export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "alert", "anomaly", "change"
  severity: text("severity", { enum: ["info", "warning", "critical"] }).notNull().default("info"),
  message: text("message").notNull(),
  dataJson: text("data_json"),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
});
