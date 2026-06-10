import { Router, type IRouter } from "express";
import { db, notificationsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  ListNotificationsResponse,
  BroadcastNotificationBody, BroadcastNotificationResponse,
  SendPersonalNotificationBody, SendPersonalNotificationResponse,
  MarkNotificationReadParams, MarkNotificationReadResponse,
} from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { sendTelegramMessage } from "../lib/telegram";

const router: IRouter = Router();

router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const notifications = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, req.user!.userId))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);
  res.json(ListNotificationsResponse.parse(notifications));
});

router.post("/notifications/broadcast", requireAdmin, async (req, res): Promise<void> => {
  const b = BroadcastNotificationBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: b.error.message }); return; }

  const users = await db.select({ id: usersTable.id, telegramId: usersTable.telegramId })
    .from(usersTable)
    .where(eq(usersTable.isBanned, false));

  const values = users.map(u => ({
    userId: u.id,
    title: b.data.title,
    message: b.data.message,
    type: "broadcast" as const,
  }));

  if (values.length > 0) {
    await db.insert(notificationsTable).values(values);
  }

  // Send Telegram messages in background
  const botMsg = `<b>${b.data.title}</b>\n\n${b.data.message}`;
  for (const u of users) {
    sendTelegramMessage(u.telegramId, botMsg);
  }

  res.json(BroadcastNotificationResponse.parse({ sent: users.length }));
});

router.post("/notifications/personal", requireAdmin, async (req, res): Promise<void> => {
  const b = SendPersonalNotificationBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: b.error.message }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.telegramId, b.data.telegramId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found with that Telegram ID" });
    return;
  }

  await db.insert(notificationsTable).values({
    userId: user.id,
    title: b.data.title,
    message: b.data.message,
    type: "personal",
  });

  sendTelegramMessage(user.telegramId, `<b>${b.data.title}</b>\n\n${b.data.message}`);

  res.json(SendPersonalNotificationResponse.parse({ sent: 1 }));
});

router.patch("/notifications/:id/read", requireAuth, async (req, res): Promise<void> => {
  const p = MarkNotificationReadParams.safeParse(req.params);
  if (!p.success) { res.status(400).json({ error: p.error.message }); return; }

  const [notif] = await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.id, p.data.id))
    .returning();

  if (!notif) { res.status(404).json({ error: "Notification not found" }); return; }
  res.json(MarkNotificationReadResponse.parse(notif));
});

export default router;
