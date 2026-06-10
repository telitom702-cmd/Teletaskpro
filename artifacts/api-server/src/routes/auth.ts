import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { TelegramLoginBody, TelegramLoginResponse } from "@workspace/api-zod";
import { verifyTelegramWebApp, parseTelegramUser, signToken } from "../lib/jwtAuth";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const ADMIN_TELEGRAM_IDS = (process.env.ADMIN_TELEGRAM_IDS || "").split(",").map(s => s.trim()).filter(Boolean);
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const DEV_MODE = process.env.NODE_ENV !== "production";

router.post("/auth/telegram", async (req, res): Promise<void> => {
  const parsed = TelegramLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { initData } = parsed.data;
  let telegramUser: { id: number; first_name: string; last_name?: string; username?: string; photo_url?: string } | null = null;

  // In dev mode, allow mock initData
  if (DEV_MODE && initData.includes("mockhash")) {
    telegramUser = parseTelegramUser(initData);
    if (!telegramUser) {
      telegramUser = { id: 12345, first_name: "Dev", last_name: "User", username: "devuser" };
    }
  } else if (BOT_TOKEN) {
    const verified = verifyTelegramWebApp(initData, BOT_TOKEN);
    if (!verified) {
      res.status(401).json({ error: "Invalid Telegram initData" });
      return;
    }
    telegramUser = parseTelegramUser(initData);
  } else {
    // No bot token — allow in dev
    telegramUser = parseTelegramUser(initData);
    if (!telegramUser) {
      telegramUser = { id: 12345, first_name: "Dev", last_name: "User", username: "devuser" };
    }
  }

  if (!telegramUser) {
    res.status(400).json({ error: "Could not parse Telegram user data" });
    return;
  }

  const telegramIdStr = String(telegramUser.id);
  const isAdmin = ADMIN_TELEGRAM_IDS.includes(telegramIdStr);

  // Upsert user
  const existing = await db.select().from(usersTable).where(eq(usersTable.telegramId, telegramIdStr)).limit(1);

  let user;
  if (existing.length > 0) {
    const [updated] = await db
      .update(usersTable)
      .set({
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name || null,
        username: telegramUser.username || null,
        photoUrl: telegramUser.photo_url || null,
        isAdmin: isAdmin || existing[0].isAdmin,
      })
      .where(eq(usersTable.telegramId, telegramIdStr))
      .returning();
    user = updated;
  } else {
    const referralCode = `TT${telegramUser.id}`;
    const [created] = await db
      .insert(usersTable)
      .values({
        telegramId: telegramIdStr,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name || null,
        username: telegramUser.username || null,
        photoUrl: telegramUser.photo_url || null,
        isAdmin,
        referralCode,
      })
      .returning();
    user = created;
  }

  if (user.isBanned) {
    res.status(403).json({ error: "Your account has been banned" });
    return;
  }

  const token = signToken({ userId: user.id, telegramId: telegramIdStr, isAdmin: user.isAdmin });

  const responseUser = {
    ...user,
    balance: Number(user.balance),
    totalEarned: Number(user.totalEarned),
    totalWithdrawn: Number(user.totalWithdrawn),
  };

  const data = TelegramLoginResponse.parse({ token, user: responseUser });
  res.json(data);
});

export default router;
