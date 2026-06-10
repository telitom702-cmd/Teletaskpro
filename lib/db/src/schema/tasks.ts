import { pgTable, text, serial, timestamp, boolean, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  reward: numeric("reward", { precision: 10, scale: 2 }).notNull(),
  timeLimitMinutes: integer("time_limit_minutes").notNull().default(30),
  isActive: boolean("is_active").notNull().default(true),
  requiresScreenshot: boolean("requires_screenshot").notNull().default(false),
  requiresLinkCopy: boolean("requires_link_copy").notNull().default(false),
  copyLink: text("copy_link"),
  dailyLimit: integer("daily_limit").notNull().default(1),
  completionCount: integer("completion_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true, updatedAt: true, completionCount: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
