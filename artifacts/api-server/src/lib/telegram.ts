import TelegramBot from "node-telegram-bot-api";
import { logger } from "./logger";

let bot: TelegramBot | null = null;

export function getBot(): TelegramBot | null {
  if (!bot && process.env.TELEGRAM_BOT_TOKEN) {
    try {
      bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
      logger.info("Telegram bot initialized");
    } catch (err) {
      logger.error({ err }, "Failed to initialize Telegram bot");
    }
  }
  return bot;
}

export async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  const b = getBot();
  if (!b) return false;
  try {
    await b.sendMessage(chatId, text, { parse_mode: "HTML" });
    return true;
  } catch (err) {
    logger.warn({ err, chatId }, "Failed to send Telegram message");
    return false;
  }
}

export async function updateGroupSummary(
  chatId: string,
  messageId: string | null,
  summary: {
    totalUsers: number;
    todayNewUsers: number;
    completedTasks: number;
    totalPayout: number;
  }
): Promise<string | null> {
  const b = getBot();
  if (!b || !chatId) return null;

  const now = new Date().toLocaleString("en-BD", { timeZone: "Asia/Dhaka" });
  const text = `<b>TeliTask Pro - Summary</b>\n\n` +
    `Users: <b>${summary.totalUsers}</b>\n` +
    `Today New: <b>${summary.todayNewUsers}</b>\n` +
    `Tasks Done: <b>${summary.completedTasks}</b>\n` +
    `Total Payout: <b>$${summary.totalPayout.toFixed(2)}</b>\n\n` +
    `Last Update: ${now}`;

  try {
    if (messageId) {
      await b.editMessageText(text, {
        chat_id: chatId,
        message_id: parseInt(messageId),
        parse_mode: "HTML",
      });
      return messageId;
    } else {
      const msg = await b.sendMessage(chatId, text, { parse_mode: "HTML" });
      return String(msg.message_id);
    }
  } catch (err) {
    logger.warn({ err }, "Failed to update group summary");
    return messageId;
  }
}
