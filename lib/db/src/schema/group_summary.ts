import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";

export const groupSummaryTable = pgTable("group_summary", {
  id: serial("id").primaryKey(),
  telegramMessageId: text("telegram_message_id"),
  telegramChatId: text("telegram_chat_id"),
  totalUsers: integer("total_users").notNull().default(0),
  todayNewUsers: integer("today_new_users").notNull().default(0),
  completedTasks: integer("completed_tasks").notNull().default(0),
  totalPayout: numeric("total_payout", { precision: 12, scale: 2 }).notNull().default("0"),
  lastUpdated: timestamp("last_updated", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type GroupSummary = typeof groupSummaryTable.$inferSelect;
